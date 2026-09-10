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
}

export type ValidationErrors = Partial<Record<keyof RawPersonFields, string>>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
  value?: PersonInput;
}

// ---------- Champs du formulaire personne (numéro + rue) ----------

export interface RawPersonForm {
  nom: string;
  prenom: string;
  numero: string;
  rueId: string;
  colonne: string;
  panneau: string;
}

export type PersonFormErrors = Partial<Record<keyof RawPersonForm, string>>;

export interface PersonFormResult {
  valid: boolean;
  errors: PersonFormErrors;
  value?: PersonInput;
}

// ---------- Parseurs unitaires ----------

/** Colonne : entier obligatoire compris entre 1 et 16. `null` si invalide. */
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

// ---------- Validation CSV (adresse libre) ----------

/** Valide une ligne CSV. L'adresse reste une chaîne libre (compatibilité). */
export function validatePerson(fields: RawPersonFields): ValidationResult {
  const errors: ValidationErrors = {};

  const nom = cleanStored(fields.nom);
  if (nom === '') errors.nom = 'Le nom est obligatoire.';

  const adresse = cleanStored(fields.adresse);
  if (adresse === '') errors.adresse = "L'adresse est obligatoire.";

  const colonne = parseColonne(fields.colonne);
  if (colonne === null) {
    errors.colonne = `La colonne doit être un entier compris entre ${MIN_COLONNE} et ${MAX_COLONNE}.`;
  }

  const panneau = parsePanneau(fields.panneau);
  if (!panneau.ok) errors.panneau = 'Le panneau doit être un entier positif.';

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
      numeroRue: null,
      rueId: null,
      colonne: colonne as number,
      panneau: panneau.value,
    },
  };
}

// ---------- Validation du formulaire personne ----------

/** Valide le formulaire Ajouter / Modifier une personne (numéro + rue). */
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

  const colonne = parseColonne(fields.colonne);
  if (colonne === null) {
    errors.colonne = `La colonne doit être un entier compris entre ${MIN_COLONNE} et ${MAX_COLONNE}.`;
  }

  const panneau = parsePanneau(fields.panneau);
  if (!panneau.ok) errors.panneau = 'Le panneau doit être un entier positif.';

  const prenomClean = cleanStored(fields.prenom);
  const prenom = prenomClean === '' ? null : prenomClean;

  const valid = Object.keys(errors).length === 0;
  if (!valid || !rue || numeroRue === null || colonne === null) {
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
    },
  };
}
