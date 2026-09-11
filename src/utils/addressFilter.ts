import type { Person } from '../types/person';
import { splitAdresse } from './adresse';
import { cleanStored, normalizeText } from './normalizeText';

/**
 * Filtre par ADRESSE COMPLÈTE (page Base de données uniquement).
 *
 * La source est UNIQUEMENT `person.adresse` — jamais le store `rues`.
 * "35 Rue Claude Kogan" et "37 Rue Claude Kogan" sont deux adresses distinctes.
 * Filtre d'affichage pur : aucune donnée (Person, Rue, IndexedDB) n'est lue ni
 * écrite ici au-delà de la liste `persons` déjà chargée par `usePersons()`.
 */

export interface AddressOption {
  /** Clé de dédoublonnage : adresse normalisée (casse/accents/espaces ignorés). */
  key: string;
  /** Version lisible affichée dans le filtre (l'orthographe la plus « propre » rencontrée). */
  label: string;
}

/**
 * Score de lisibilité d'une orthographe d'adresse : favorise une casse
 * « normale » (ex. "Rue Claude Kogan") par rapport à TOUT MAJUSCULE ou tout
 * minuscule (ex. "RUE CLAUDE KOGAN"). Les petits mots (articles/prépositions
 * français en minuscules, ex. "de", "des") sont neutres, jamais pénalisés.
 *
 * Nécessaire car `persons` peut provenir d'IndexedDB, dont l'ordre n'est PAS
 * l'ordre d'insertion (tri par clé primaire) : on ne peut pas se contenter de
 * « la première orthographe rencontrée » pour obtenir un affichage propre.
 */
function addressLabelScore(s: string): number {
  const words = s.match(/\p{L}+/gu) ?? [];
  let score = 0;
  for (const w of words) {
    if (w.length <= 1) continue;
    const isAllUpper = w === w.toUpperCase();
    const isAllLower = w === w.toLowerCase();
    if (!isAllUpper && !isAllLower) score += 2; // ex. "Rue", "Kogan" : casse propre
    else if (isAllLower) score += 1; // ex. "de", "des" : correct en minuscules
    // tout-majuscule (ex. "RUE", "KOGAN") : 0 point, implicitement pénalisé
  }
  return score;
}

/**
 * Tri « rue puis numéro » quand les deux adresses se décomposent en
 * `"<numéro> <rue>"` ; sinon repli sur un `localeCompare` naturel complet.
 * Les adresses décomposables sont regroupées avant les autres pour un tri
 * cohérent par rue.
 */
function compareAddressOptions(a: AddressOption, b: AddressOption): number {
  const sa = splitAdresse(a.label);
  const sb = splitAdresse(b.label);
  if (sa && sb) {
    const rueCmp = sa.rueNom.localeCompare(sb.rueNom, 'fr', {
      numeric: true,
      sensitivity: 'base',
    });
    if (rueCmp !== 0) return rueCmp;
    return sa.numeroRue - sb.numeroRue;
  }
  if (sa && !sb) return -1;
  if (!sa && sb) return 1;
  return a.label.localeCompare(b.label, 'fr', { numeric: true, sensitivity: 'base' });
}

/**
 * Construit la liste dédupliquée et triée des adresses complètes présentes
 * chez les destinataires. Chaque adresse (comparaison normalisée) n'apparaît
 * qu'une seule fois, quel que soit le nombre de destinataires qui la partagent.
 */
export function buildAddressOptions(persons: Person[]): AddressOption[] {
  const byKey = new Map<string, string>(); // adresse normalisée -> libellé affiché
  for (const p of persons) {
    const raw = cleanStored(p.adresse ?? '');
    if (raw === '') continue;
    const key = normalizeText(raw);
    const current = byKey.get(key);
    // Garde toujours l'orthographe la plus lisible, indépendamment de l'ordre
    // d'itération (voir `addressLabelScore`).
    if (current === undefined || addressLabelScore(raw) > addressLabelScore(current)) {
      byKey.set(key, raw);
    }
  }
  return [...byKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort(compareAddressOptions);
}

/**
 * Filtre des personnes par adresse complète (comparaison normalisée).
 * Aucune sélection -> tous les destinataires (comportement par défaut).
 */
export function filterPersonsByAddresses(
  persons: Person[],
  selectedKeys: ReadonlySet<string>,
): Person[] {
  if (selectedKeys.size === 0) return persons;
  return persons.filter((p) => selectedKeys.has(normalizeText(p.adresse ?? '')));
}
