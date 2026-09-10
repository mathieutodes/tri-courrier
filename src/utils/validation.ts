import { MAX_COLONNE, MIN_COLONNE, type PersonInput } from '../types/person';
import { cleanStored } from './normalizeText';

export interface RawPersonFields {
  nom: string;
  prenom: string;
  adresse: string;
  colonne: string;
  panneau: string;
}

export type ValidationErrors = Partial<Record<keyof RawPersonFields, string>>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
  value?: PersonInput;
}

/**
 * Valide la colonne : entier obligatoire compris entre 1 et 16.
 * Retourne `null` si invalide.
 */
export function parseColonne(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < MIN_COLONNE || n > MAX_COLONNE) return null;
  return n;
}

/**
 * Valide le panneau : facultatif ; si renseigné, entier positif (>= 1).
 * Retourne `{ ok: true, value: null }` si vide.
 */
export function parsePanneau(raw: string): { ok: boolean; value: number | null } {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false, value: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return { ok: false, value: null };
  return { ok: true, value: n };
}

/** Valide l'ensemble des champs d'un formulaire destinataire. */
export function validatePerson(fields: RawPersonFields): ValidationResult {
  const errors: ValidationErrors = {};

  const nom = cleanStored(fields.nom);
  if (nom === '') {
    errors.nom = 'Le nom est obligatoire.';
  }

  const adresse = cleanStored(fields.adresse);
  if (adresse === '') {
    errors.adresse = "L'adresse est obligatoire.";
  }

  const colonne = parseColonne(fields.colonne);
  if (colonne === null) {
    errors.colonne = `La colonne doit être un entier compris entre ${MIN_COLONNE} et ${MAX_COLONNE}.`;
  }

  const panneau = parsePanneau(fields.panneau);
  if (!panneau.ok) {
    errors.panneau = 'Le panneau doit être un entier positif.';
  }

  const prenomClean = cleanStored(fields.prenom);
  const prenom = prenomClean === '' ? null : prenomClean;

  const valid = Object.keys(errors).length === 0;
  if (!valid) return { valid, errors };

  return {
    valid,
    errors,
    value: {
      nom,
      prenom,
      adresse,
      colonne: colonne as number,
      panneau: panneau.value,
    },
  };
}
