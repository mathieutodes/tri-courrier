import { describe, expect, it } from 'vitest';
import { parseColonne, parsePanneau, validatePerson } from './validation';

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

describe('validatePerson', () => {
  const base = { nom: 'DUPONT', prenom: 'Jean', adresse: '12 rue Victor Hugo', colonne: '5', panneau: '1' };

  it('valide une entrée correcte', () => {
    const r = validatePerson(base);
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '12 rue Victor Hugo',
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
