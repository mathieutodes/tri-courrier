import { describe, expect, it } from 'vitest';
import {
  parseColonne,
  parseNumero,
  parsePanneau,
  validatePerson,
  validatePersonForm,
} from './validation';
import type { Rue } from '../types/rue';

describe('parseColonne', () => {
  it('accepte 1 à 16', () => {
    expect(parseColonne('1')).toBe(1);
    expect(parseColonne('16')).toBe(16);
    expect(parseColonne(' 5 ')).toBe(5);
  });

  it('refuse hors plage', () => {
    expect(parseColonne('0')).toBeNull();
    expect(parseColonne('17')).toBeNull();
    expect(parseColonne('-3')).toBeNull();
  });

  it('refuse les valeurs non entières ou vides', () => {
    expect(parseColonne('')).toBeNull();
    expect(parseColonne('abc')).toBeNull();
    expect(parseColonne('5.5')).toBeNull();
  });
});

describe('parsePanneau', () => {
  it('accepte vide (facultatif)', () => {
    expect(parsePanneau('')).toEqual({ ok: true, value: null });
  });

  it('accepte un entier positif', () => {
    expect(parsePanneau('2')).toEqual({ ok: true, value: 2 });
  });

  it('refuse 0, négatif ou non entier', () => {
    expect(parsePanneau('0').ok).toBe(false);
    expect(parsePanneau('-1').ok).toBe(false);
    expect(parsePanneau('1.5').ok).toBe(false);
  });
});

describe('parseNumero', () => {
  it('accepte un entier strictement positif', () => {
    expect(parseNumero('24')).toBe(24);
    expect(parseNumero(' 1 ')).toBe(1);
  });

  it('refuse 0, négatif, vide, non entier', () => {
    expect(parseNumero('0')).toBeNull();
    expect(parseNumero('-3')).toBeNull();
    expect(parseNumero('')).toBeNull();
    expect(parseNumero('12.5')).toBeNull();
  });

  it('refuse bis / ter / lettres', () => {
    expect(parseNumero('12bis')).toBeNull();
    expect(parseNumero('12 ter')).toBeNull();
    expect(parseNumero('12A')).toBeNull();
  });
});

describe('validatePerson (CSV — adresse libre)', () => {
  const base = { nom: 'DUPONT', prenom: 'Jean', adresse: '12 rue Victor Hugo', colonne: '5', panneau: '1' };

  it('valide une entrée correcte (numeroRue / rueId null)', () => {
    const r = validatePerson(base);
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '12 rue Victor Hugo',
      numeroRue: null,
      rueId: null,
      colonne: 5,
      panneau: 1,
    });
  });

  it('exige le nom', () => {
    expect(validatePerson({ ...base, nom: '   ' }).errors.nom).toBeDefined();
  });

  it('exige l’adresse', () => {
    expect(validatePerson({ ...base, adresse: '' }).errors.adresse).toBeDefined();
  });

  it('rejette une colonne hors 1..16', () => {
    expect(validatePerson({ ...base, colonne: '20' }).errors.colonne).toBeDefined();
  });

  it('accepte sans prénom ni panneau', () => {
    const r = validatePerson({ ...base, prenom: '', panneau: '' });
    expect(r.valid).toBe(true);
    expect(r.value?.prenom).toBeNull();
    expect(r.value?.panneau).toBeNull();
  });
});

describe('validatePersonForm (numéro + rue)', () => {
  const rues: Rue[] = [
    { id: 'r1', nom: 'Rue Victor Hugo' },
    { id: 'r2', nom: 'Avenue de Paris' },
  ];
  const base = { nom: 'DUPONT', prenom: 'Jean', numero: '24', rueId: 'r1', colonne: '5', panneau: '1' };

  it('construit l’adresse "24 Rue Victor Hugo" et renseigne numeroRue / rueId', () => {
    const r = validatePersonForm(base, rues);
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '24 Rue Victor Hugo',
      numeroRue: 24,
      rueId: 'r1',
      colonne: 5,
      panneau: 1,
    });
  });

  it('exige un numéro entier strictement positif', () => {
    expect(validatePersonForm({ ...base, numero: '0' }, rues).errors.numero).toBeDefined();
    expect(validatePersonForm({ ...base, numero: '12bis' }, rues).errors.numero).toBeDefined();
  });

  it('exige une rue existante', () => {
    expect(validatePersonForm({ ...base, rueId: '' }, rues).errors.rueId).toBeDefined();
    expect(validatePersonForm({ ...base, rueId: 'inconnue' }, rues).errors.rueId).toBeDefined();
  });

  it('garde la colonne entre 1 et 16 et le panneau facultatif', () => {
    expect(validatePersonForm({ ...base, colonne: '17' }, rues).errors.colonne).toBeDefined();
    const r = validatePersonForm({ ...base, panneau: '' }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.panneau).toBeNull();
  });
});
