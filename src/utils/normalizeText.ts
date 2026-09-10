// Marques diacritiques combinantes (accents) : plage Unicode U+0300–U+036F
const DIACRITICS = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g',
);
const MULTISPACE = /\s+/g;

/**
 * Normalise une chaîne pour la comparaison / recherche :
 * - minuscules
 * - suppression des accents (diacritiques)
 * - espaces multiples réduits à un seul
 * - trim des espaces de début / fin
 *
 * Les données d'origine ne sont jamais modifiées : cette fonction ne sert
 * qu'à comparer.
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(MULTISPACE, ' ')
    .trim();
}

/**
 * Nettoie une valeur destinée à être stockée : trim + espaces multiples
 * réduits. Les accents et la casse sont conservés.
 */
export function cleanStored(value: string): string {
  return value.replace(MULTISPACE, ' ').trim();
}
