import { MAX_COLONNE, MIN_COLONNE } from '../types/person';

export interface ColumnColor {
  /** Couleur de fond de la colonne. */
  bg: string;
  /** Couleur de texte lisible sur ce fond (`#fff` ou `#111`). */
  fg: string;
}

/**
 * Palette fixe des 16 colonnes.
 * Chaque colonne conserve TOUJOURS la même couleur.
 * Ne pas réordonner : l'index (1..16) est la clé métier.
 */
const PALETTE: ColumnColor[] = [
  { bg: '#F57C00', fg: '#ffffff' }, // 1  orange
  { bg: '#2E7D32', fg: '#ffffff' }, // 2  vert
  { bg: '#1565C0', fg: '#ffffff' }, // 3  bleu
  { bg: '#F9C80E', fg: '#111111' }, // 4  jaune
  { bg: '#6A1B9A', fg: '#ffffff' }, // 5  violet
  { bg: '#C62828', fg: '#ffffff' }, // 6  rouge
  { bg: '#00796B', fg: '#ffffff' }, // 7  turquoise
  { bg: '#AD1457', fg: '#ffffff' }, // 8  rose foncé
  { bg: '#283593', fg: '#ffffff' }, // 9  indigo
  { bg: '#9E9D24', fg: '#111111' }, // 10 vert olive
  { bg: '#4E342E', fg: '#ffffff' }, // 11 marron
  { bg: '#0097A7', fg: '#ffffff' }, // 12 cyan
  { bg: '#D84315', fg: '#ffffff' }, // 13 orange brûlé
  { bg: '#00ACC1', fg: '#111111' }, // 14 bleu clair
  { bg: '#7CB342', fg: '#111111' }, // 15 vert clair
  { bg: '#455A64', fg: '#ffffff' }, // 16 ardoise
];

const FALLBACK: ColumnColor = { bg: '#9E9E9E', fg: '#111111' };

/**
 * Retourne la couleur fixe associée à une colonne (1..16).
 * Toute valeur hors plage renvoie une couleur neutre de secours.
 */
export function getColumnColor(column: number): ColumnColor {
  if (!Number.isInteger(column) || column < MIN_COLONNE || column > MAX_COLONNE) {
    return FALLBACK;
  }
  return PALETTE[column - 1];
}

/** Liste (colonne, couleur) pour d'éventuels aperçus / légendes. */
export function allColumnColors(): { column: number; color: ColumnColor }[] {
  return PALETTE.map((color, i) => ({ column: i + 1, color }));
}
