import type { Person } from '../types/person';
import { splitAdresse } from './adresse';
import { levenshteinDistance } from './levenshtein';
import { normalizeText } from './normalizeText';

/**
 * Reconnaissance de destinataire à partir d'un texte OCR (mode SCAN).
 *
 * Réutilise `normalizeText` (comme la recherche manuelle) pour ignorer casse,
 * accents et espaces multiples, et tolère en plus de petites erreurs OCR
 * (substitution/insertion/suppression d'un ou deux caractères) via une
 * distance de Levenshtein. Reste volontairement CONSERVATEUR : plusieurs
 * candidats plausibles → résultat « ambiguous », jamais un choix arbitraire.
 */

export interface OcrCandidate {
  person: Person;
  /** Confiance 0..1 (nom seul, éventuellement renforcée par l'adresse). */
  confidence: number;
  addressConfirmed: boolean;
}

export type OcrMatchResult =
  | { status: 'match'; person: Person; confidence: number; candidates: OcrCandidate[] }
  | { status: 'ambiguous'; candidates: OcrCandidate[] }
  | { status: 'none'; candidates: [] };

/** En dessous, un nom est ignoré : trop peu fiable pour être un candidat. */
const NAME_MATCH_THRESHOLD = 0.5;
/** Confiance nom seul (sans confirmation d'adresse) jugée suffisante seule. */
const CONFIDENT_MATCH_THRESHOLD = 0.7;
/** Écart minimal avec le second candidat pour trancher sans ambiguïté. */
const MIN_LEAD_OVER_RIVAL = 0.15;

function toleranceFor(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/**
 * Cherche `needleNormalized` dans `haystackNormalized` en tolérant de petites
 * erreurs OCR. Sous-chaîne exacte d'abord (rapide), sinon fenêtre glissante +
 * Levenshtein. `haystackNormalized`/`needleNormalized` doivent déjà être
 * passés par `normalizeText`.
 */
function fuzzyContains(
  haystackNormalized: string,
  needleNormalized: string,
): { found: boolean; distance: number } {
  const needle = needleNormalized.trim();
  if (needle === '') return { found: false, distance: Infinity };
  if (haystackNormalized.includes(needle)) return { found: true, distance: 0 };

  const tol = toleranceFor(needle.length);
  if (tol === 0) return { found: false, distance: Infinity };

  let best = Infinity;
  const minWin = Math.max(1, needle.length - tol);
  const maxWin = needle.length + tol;
  for (let winLen = minWin; winLen <= maxWin && best > 0; winLen += 1) {
    for (let start = 0; start + winLen <= haystackNormalized.length && best > 0; start += 1) {
      const window = haystackNormalized.slice(start, start + winLen);
      const d = levenshteinDistance(window, needle);
      if (d < best) best = d;
    }
  }
  return { found: best <= tol, distance: best };
}

/** Variantes de nom à essayer, de la plus spécifique (nom+prénom) à la plus large (nom seul). */
function nameNeedles(person: Person): { text: string; fullName: boolean }[] {
  const nom = normalizeText(person.nom);
  const prenom = normalizeText(person.prenom);
  const needles: { text: string; fullName: boolean }[] = [];
  if (prenom) {
    needles.push({ text: `${prenom} ${nom}`, fullName: true });
    needles.push({ text: `${nom} ${prenom}`, fullName: true });
  }
  needles.push({ text: nom, fullName: false });
  return needles;
}

function scoreName(person: Person, ocrNormalized: string): number {
  let best = 0;
  for (const needle of nameNeedles(person)) {
    const { found, distance } = fuzzyContains(ocrNormalized, needle.text);
    if (!found) continue;
    let score: number;
    if (distance === 0) score = needle.fullName ? 1 : 0.85;
    else score = needle.fullName ? 0.7 : 0.55;
    if (score > best) best = score;
  }
  return best;
}

function addressConfirmed(person: Person, ocrNormalized: string): boolean {
  const split = splitAdresse(person.adresse);
  const streetNeedle = normalizeText(split ? split.rueNom : person.adresse);
  if (!fuzzyContains(ocrNormalized, streetNeedle).found) return false;
  if (!split) return true;
  // Le numéro doit apparaître comme un nombre isolé (pas comme sous-chaîne
  // d'un nombre plus grand, ex. « 12 » ne doit pas matcher dans « 123 »).
  const numRegex = new RegExp(`(^|[^0-9])${split.numeroRue}([^0-9]|$)`);
  return numRegex.test(ocrNormalized);
}

/**
 * Tente d'identifier un destinataire connu à partir d'un texte OCR brut.
 * `persons` provient de `usePersons()` (store réactif existant) — aucune
 * donnée n'est modifiée ici, lecture seule.
 */
export function matchPersonFromOcrText(rawText: string, persons: Person[]): OcrMatchResult {
  const ocrNormalized = normalizeText(rawText);
  if (ocrNormalized === '' || persons.length === 0) {
    return { status: 'none', candidates: [] };
  }

  const scored: OcrCandidate[] = [];
  for (const person of persons) {
    const nameConfidence = scoreName(person, ocrNormalized);
    if (nameConfidence < NAME_MATCH_THRESHOLD) continue;
    const confirmed = addressConfirmed(person, ocrNormalized);
    const confidence = confirmed ? Math.min(1, nameConfidence + 0.25) : nameConfidence;
    scored.push({ person, confidence, addressConfirmed: confirmed });
  }

  if (scored.length === 0) return { status: 'none', candidates: [] };

  scored.sort((a, b) => b.confidence - a.confidence);
  const [top, ...rest] = scored;
  const strongEnough = top.addressConfirmed || top.confidence >= CONFIDENT_MATCH_THRESHOLD;
  const noCloseRival = rest.every((c) => top.confidence - c.confidence >= MIN_LEAD_OVER_RIVAL);

  if (strongEnough && noCloseRival) {
    return { status: 'match', person: top.person, confidence: top.confidence, candidates: scored };
  }
  return { status: 'ambiguous', candidates: scored };
}
