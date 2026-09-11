import { MAX_COLONNE, MIN_COLONNE, type PersonInput } from '../types/person';
import type { Rue } from '../types/rue';
import { buildAdresse } from './adresse';
import { cleanStored } from './normalizeText';

// ---------- Champs CSV (import) ----------

export interface RawPersonFields {
  nom: string;
  prenom: string;
  adresse: string;
  colonne: string;
  panneau: string;
  logement: string;
  reexpedition: string;
  remarque: string;
}

export type ValidationErrors = Partial<Record<keyof RawPersonFields, string>>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
  value?: PersonInput;
}

// ---------- Champs du formulaire personne (numéro + rue) ----------

/**
 * `mode` détermine quelle paire de champs le formulaire manuel utilise pour
 * la localisation : soit `colonne` (+ panneau facultatif), soit `logement`
 * (+ panneau obligatoire). L'interface n'autorise jamais les deux à la fois.
 */
export interface RawPersonForm {
  nom: string;
  prenom: string;
  numero: string;
  rueId: string;
  mode: 'colonne' | 'logement';
  colonne: string;
  panneau: string;
  logement: string;
  /** Case à cocher « Réexpédition » : valeur booléenne directe (pas de parsing texte). */
  reexpedition: boolean;
  /** Note libre facultative. Texte brut de la textarea (non encore recadré). */
  remarque: string;
}

export type PersonFormErrors = Partial<Record<keyof RawPersonForm, string>>;

export interface PersonFormResult {
  valid: boolean;
  errors: PersonFormErrors;
  value?: PersonInput;
}

// ---------- Parseurs unitaires ----------

/** Colonne : entier compris entre 1 et 16. `null` si invalide (ou vide). */
export function parseColonne(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < MIN_COLONNE || n > MAX_COLONNE) return null;
  return n;
}

/** Panneau : facultatif ; si renseigné, entier positif (>= 1). */
export function parsePanneau(raw: string): { ok: boolean; value: number | null } {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false, value: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return { ok: false, value: null };
  return { ok: true, value: n };
}

/**
 * Numéro de rue : entier STRICTEMENT positif, chiffres uniquement.
 * Pas de « bis », « ter », « A », « B »… `null` si invalide.
 */
export function parseNumero(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/**
 * Numéro de logement : texte court FACULTATIF (ex. "314", "12", "A12", "12B").
 * Un nombre n'est pas imposé afin de supporter des repères alphanumériques.
 * Espaces superflus normalisés. `null` si vide.
 */
export function parseLogement(raw: string): string | null {
  const trimmed = cleanStored(raw ?? '');
  return trimmed === '' ? null : trimmed;
}

/** Valeurs CSV reconnues comme "vrai" pour `reexpedition` (casse/espaces ignorés). */
const REEXPEDITION_TRUE_VALUES = new Set(['oui', 'true', '1']);

/**
 * Colonne CSV `reexpedition` : cellule vide, colonne absente, ou toute autre
 * valeur non reconnue -> `false`. Jamais bloquant (aucune erreur possible),
 * pour garantir la compatibilité avec les anciens CSV sans cette colonne.
 */
export function parseReexpedition(raw: string | undefined): boolean {
  const normalized = (raw ?? '').trim().toLowerCase();
  return REEXPEDITION_TRUE_VALUES.has(normalized);
}

/**
 * Remarque libre : seuls les espaces/retours à la ligne superflus en DÉBUT et
 * FIN sont supprimés (`trim()`). Contrairement à `cleanStored`, les espaces
 * et sauts de ligne INTERNES sont conservés tels quels — c'est une note libre
 * multi-ligne, pas un champ d'identité. Jamais mise en majuscules : la casse
 * saisie par l'utilisateur est conservée. Vide (ou absente) -> `null`.
 */
export function parseRemarque(raw: string | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Règle de localisation minimale, commune au CSV et au formulaire manuel :
 * - colonne seule                -> OK
 * - panneau + colonne            -> OK
 * - panneau + logement           -> OK
 * - ni colonne ni logement       -> refusé
 * - logement renseigné sans panneau -> refusé
 * Renvoie un message d'erreur, ou `null` si la localisation est exploitable.
 */
function localisationError(
  colonne: number | null,
  logement: string | null,
  panneau: number | null,
): string | null {
  if (colonne === null && logement === null) {
    return 'Indiquez une colonne, ou un panneau accompagné d’un numéro de logement.';
  }
  if (logement !== null && panneau === null) {
    return 'Le panneau est obligatoire lorsqu’un numéro de logement est renseigné.';
  }
  return null;
}

// ---------- Validation CSV (adresse libre) ----------

/** Valide une ligne CSV. L'adresse reste une chaîne libre (compatibilité). */
export function validatePerson(fields: RawPersonFields): ValidationResult {
  const errors: ValidationErrors = {};

  const nom = cleanStored(fields.nom);
  if (nom === '') errors.nom = 'Le nom est obligatoire.';

  const adresse = cleanStored(fields.adresse);
  if (adresse === '') errors.adresse = "L'adresse est obligatoire.";

  // Colonne désormais FACULTATIVE : vide -> null ; renseignée mais hors 1..16 -> erreur.
  const colonneRaw = fields.colonne.trim();
  let colonne: number | null = null;
  if (colonneRaw !== '') {
    colonne = parseColonne(fields.colonne);
    if (colonne === null) {
      errors.colonne = `La colonne doit être un entier compris entre ${MIN_COLONNE} et ${MAX_COLONNE}.`;
    }
  }

  const panneau = parsePanneau(fields.panneau);
  if (!panneau.ok) errors.panneau = 'Le panneau doit être un entier positif.';

  const logement = parseLogement(fields.logement);

  // N'évalue la règle de localisation que si colonne/panneau sont déjà
  // syntaxiquement valides (sinon on laisserait une erreur plus précise
  // être masquée par un message générique).
  if (!errors.colonne && !errors.panneau) {
    const locErr = localisationError(colonne, logement, panneau.value);
    if (locErr) {
      if (logement !== null && panneau.value === null) {
        errors.panneau = locErr;
      } else {
        errors.colonne = locErr;
      }
    }
  }

  const prenomClean = cleanStored(fields.prenom);
  const prenom = prenomClean === '' ? null : prenomClean;
  const reexpedition = parseReexpedition(fields.reexpedition);
  const remarque = parseRemarque(fields.remarque);

  const valid = Object.keys(errors).length === 0;
  if (!valid) return { valid, errors };

  return {
    valid,
    errors,
    value: {
      nom,
      prenom,
      adresse,
      numeroRue: null,
      rueId: null,
      colonne,
      panneau: panneau.value,
      logement,
      reexpedition,
      remarque,
    },
  };
}

// ---------- Validation du formulaire personne ----------

/**
 * Valide le formulaire Ajouter / Modifier une personne (numéro + rue, puis
 * localisation selon `fields.mode`).
 */
export function validatePersonForm(fields: RawPersonForm, rues: Rue[]): PersonFormResult {
  const errors: PersonFormErrors = {};

  const nom = cleanStored(fields.nom);
  if (nom === '') errors.nom = 'Le nom est obligatoire.';

  const numeroRue = parseNumero(fields.numero);
  if (numeroRue === null) {
    errors.numero = 'Le numéro doit être un entier strictement positif (chiffres uniquement).';
  }

  const rue = rues.find((r) => r.id === fields.rueId);
  if (!rue) errors.rueId = 'La rue est obligatoire.';

  const panneau = parsePanneau(fields.panneau);
  if (!panneau.ok) errors.panneau = 'Le panneau doit être un entier positif.';

  // Le formulaire manuel impose l'UN ou l'AUTRE : jamais colonne + logement
  // en même temps (l'interface ne montre que les champs du mode actif).
  let colonne: number | null = null;
  let logement: string | null = null;

  if (fields.mode === 'colonne') {
    colonne = parseColonne(fields.colonne);
    if (colonne === null) {
      errors.colonne = `La colonne doit être un entier compris entre ${MIN_COLONNE} et ${MAX_COLONNE}.`;
    }
  } else {
    logement = parseLogement(fields.logement);
    if (logement === null) {
      errors.logement = 'Le numéro de logement est obligatoire.';
    }
    if (panneau.ok && panneau.value === null) {
      errors.panneau = 'Le panneau est obligatoire lorsqu’un numéro de logement est renseigné.';
    }
  }

  const prenomClean = cleanStored(fields.prenom);
  const prenom = prenomClean === '' ? null : prenomClean;

  const valid = Object.keys(errors).length === 0;
  if (!valid || !rue || numeroRue === null) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors,
    value: {
      nom,
      prenom,
      adresse: buildAdresse(numeroRue, rue.nom),
      numeroRue,
      rueId: rue.id,
      colonne,
      panneau: panneau.value,
      logement,
      reexpedition: fields.reexpedition,
      remarque: parseRemarque(fields.remarque),
    },
  };
}
