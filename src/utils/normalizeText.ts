// Marques diacritiques combinantes (accents) : plage Unicode U+0300–U+036F
const DIACRITICS = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g',
);
const MULTISPACE = /\s+/g;
// Apostrophes typographiques (’ U+2019, ‘ U+2018, ‛ U+201B, ʼ U+02BC) et
// accent grave parfois utilisé par erreur comme apostrophe (` U+0060) :
// unifiées vers l'apostrophe droite standard (U+0027) avant comparaison.
// Normalisation déterministe, jamais un rapprochement approximatif entre
// mots différents — nécessaire car le clavier iOS/Safari substitue
// automatiquement l'apostrophe droite tapée par l'utilisateur par sa forme
// typographique (ex. « Rue de l'Église » saisie sur iPhone devient
// « Rue de l’Église ») : sans cette unification, une même rue tapée sur
// deux appareils différents (ou via un import CSV externe) ne se reconnaît
// plus, alors qu'il s'agit bien du même nom.
const APOSTROPHES = /[‘’‛ʼ`]/g;

/**
 * Normalise une chaîne pour la comparaison / recherche :
 * - minuscules
 * - suppression des accents (diacritiques)
 * - apostrophes (droites/typographiques) unifiées
 * - ligatures françaises (œ, æ) dépliées (non décomposées par NFD)
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
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
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
