import type { Rue } from '../types/rue';
import { cleanStored, normalizeText } from './normalizeText';

/** Construit l'adresse complète stockée : `"24 Rue Victor Hugo"`. */
export function buildAdresse(numeroRue: number, rueNom: string): string {
  return `${numeroRue} ${cleanStored(rueNom)}`.trim();
}

/**
 * Tente de décomposer une adresse libre en `numeroRue` + `rueId` en s'appuyant
 * sur les rues déjà enregistrées. Best-effort, jamais bloquant : renvoie `null`
 * si la décomposition n'est pas fiable (l'adresse d'origine est alors conservée
 * telle quelle par l'appelant).
 */
export function decomposeAdresse(
  adresse: string,
  rues: Rue[],
): { numeroRue: number; rueId: string } | null {
  const match = /^\s*(\d+)\s+(.+?)\s*$/.exec(adresse ?? '');
  if (!match) return null;
  const numeroRue = Number(match[1]);
  if (!Number.isInteger(numeroRue) || numeroRue < 1) return null;
  const cible = normalizeText(match[2]);
  const rue = rues.find((r) => normalizeText(r.nom) === cible);
  if (!rue) return null;
  return { numeroRue, rueId: rue.id };
}
