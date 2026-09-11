import type { Rue } from '../types/rue';
import { cleanStored, normalizeText } from './normalizeText';

/** Construit l'adresse complète stockée : `"24 Rue Victor Hugo"`. */
export function buildAdresse(numeroRue: number, rueNom: string): string {
  return `${numeroRue} ${cleanStored(rueNom)}`.trim();
}

export interface SplitAdresse {
  numeroRue: number;
  /** Nom de rue BRUT (nettoyé mais pas encore confronté au catalogue des rues). */
  rueNom: string;
}

/**
 * Décompose une adresse libre en `numeroRue` + nom de rue BRUT, sans la
 * confronter aux rues déjà enregistrées (contrairement à `decomposeAdresse`).
 * Reconnaît le format `"<entier positif> <reste>"`. Renvoie `null` si le
 * format n'est pas reconnu ou si le nom de rue obtenu serait vide — jamais
 * bloquant pour l'appelant : l'adresse d'origine reste alors utilisable telle
 * quelle.
 */
export function splitAdresse(adresse: string): SplitAdresse | null {
  const match = /^\s*(\d+)\s+(.+?)\s*$/.exec(adresse ?? '');
  if (!match) return null;
  const numeroRue = Number(match[1]);
  if (!Number.isInteger(numeroRue) || numeroRue < 1) return null;
  const rueNom = cleanStored(match[2]);
  if (rueNom === '') return null;
  return { numeroRue, rueNom };
}

/**
 * Tente de décomposer une adresse libre en `numeroRue` + `rueId` en s'appuyant
 * UNIQUEMENT sur les rues déjà enregistrées (comparaison normalisée : casse,
 * accents, espaces ignorés). Best-effort, jamais bloquant : renvoie `null` si
 * la décomposition n'est pas fiable ou si aucune rue existante ne correspond
 * (l'adresse d'origine est alors conservée telle quelle par l'appelant).
 */
export function decomposeAdresse(
  adresse: string,
  rues: Rue[],
): { numeroRue: number; rueId: string } | null {
  const split = splitAdresse(adresse);
  if (!split) return null;
  const cible = normalizeText(split.rueNom);
  const rue = rues.find((r) => normalizeText(r.nom) === cible);
  if (!rue) return null;
  return { numeroRue: split.numeroRue, rueId: rue.id };
}
