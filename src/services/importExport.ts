import Papa from 'papaparse';
import type { Person, PersonInput } from '../types/person';
import { getAllPersons } from '../db/database';
import { normalizeText } from '../utils/normalizeText';
import { parseColonne, parsePanneau, validatePerson } from '../utils/validation';

export const CSV_HEADER = 'nom,prenom,adresse,colonne,panneau';

const FIELDS = ['nom', 'prenom', 'adresse', 'colonne', 'panneau'] as const;
type CsvField = (typeof FIELDS)[number];

export type ImportStatus = 'valid' | 'invalid' | 'duplicate';

export interface ImportRow {
  line: number;
  status: ImportStatus;
  errors: string[];
  display: { nom: string; prenom: string; adresse: string; colonne: string; panneau: string };
  value?: PersonInput;
}

export interface ImportPreview {
  rows: ImportRow[];
  total: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  toImport: PersonInput[];
}

function dupKey(nom: string, prenom: string | null, adresse: string): string {
  return [normalizeText(nom), normalizeText(prenom), normalizeText(adresse)].join('|');
}

function mapHeader(h: string): string {
  return normalizeText(h).replace(/\s+/g, '');
}

/** Parse un fichier CSV et construit l'aperçu d'import (sans rien écrire). */
export async function buildImportPreview(file: File): Promise<ImportPreview> {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: mapHeader,
  });

  const existing = await getAllPersons();
  const seen = new Set<string>(existing.map((p) => dupKey(p.nom, p.prenom, p.adresse)));

  const rows: ImportRow[] = [];
  const toImport: PersonInput[] = [];

  parsed.data.forEach((record, index) => {
    const get = (f: CsvField): string => (record[f] ?? '').toString();
    const display = {
      nom: get('nom'),
      prenom: get('prenom'),
      adresse: get('adresse'),
      colonne: get('colonne'),
      panneau: get('panneau'),
    };

    const result = validatePerson({
      nom: display.nom,
      prenom: display.prenom,
      adresse: display.adresse,
      colonne: display.colonne,
      panneau: display.panneau,
    });

    const line = index + 2; // +1 en-tête, +1 pour un index humain

    if (!result.valid || !result.value) {
      rows.push({
        line,
        status: 'invalid',
        errors: Object.values(result.errors),
        display,
      });
      return;
    }

    // `numeroRue` / `rueId` restent à `null` à ce stade (l'aperçu ne doit rien
    // écrire). Leur résolution — réutilisation d'une rue existante ou création
    // des rues manquantes — se fait uniquement à la confirmation de l'import,
    // dans `bulkAddPersonsResolvingRues` (voir src/db/database.ts).
    const key = dupKey(result.value.nom, result.value.prenom, result.value.adresse);
    if (seen.has(key)) {
      rows.push({ line, status: 'duplicate', errors: [], display, value: result.value });
      return;
    }

    seen.add(key);
    toImport.push(result.value);
    rows.push({ line, status: 'valid', errors: [], display, value: result.value });
  });

  return {
    rows,
    total: rows.length,
    validCount: rows.filter((r) => r.status === 'valid').length,
    invalidCount: rows.filter((r) => r.status === 'invalid').length,
    duplicateCount: rows.filter((r) => r.status === 'duplicate').length,
    toImport,
  };
}

// Réexport pratique pour d'éventuels usages externes.
export { parseColonne, parsePanneau };

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function personsToCSV(persons: Person[]): string {
  const lines = [CSV_HEADER];
  for (const p of persons) {
    lines.push(
      [
        csvCell(p.nom),
        csvCell(p.prenom ?? ''),
        csvCell(p.adresse),
        String(p.colonne),
        p.panneau === null ? '' : String(p.panneau),
      ].join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

export function personsToJSON(persons: Person[]): string {
  const clean = persons.map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    adresse: p.adresse,
    colonne: p.colonne,
    panneau: p.panneau,
  }));
  return JSON.stringify(clean, null, 2);
}

/** Télécharge un contenu texte directement sur l'appareil (aucun serveur). */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampedName(prefix: string, ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${prefix}_${stamp}.${ext}`;
}
