import { describe, expect, it } from 'vitest';
import { filterByNomPrefix } from './database';
import type { Person } from '../types/person';

const mk = (id: string, nom: string, prenom: string | null, colonne: number): Person => ({
  id,
  nom,
  prenom,
  adresse: `${colonne} rue Test`,
  numeroRue: null,
  rueId: null,
  colonne,
  panneau: null,
  logement: null,
  reexpedition: false,
  remarque: null,
});

const persons: Person[] = [
  mk('1', 'DUPONT', 'Jean', 5),
  mk('2', 'DUPONT', 'Marie', 3),
  mk('3', 'DURAND', 'Michel', 8),
  mk('4', 'DUVAL', 'Anaïs', 2),
  mk('5', 'DUMONT', 'Élise', 9),
  mk('6', 'MARTIN', 'Sophie', 2),
  mk('7', 'Dùpré', null, 7),
];

const noms = (list: Person[]) => list.map((p) => p.id).sort();

describe('filterByNomPrefix', () => {
  it('vide si la requête est vide', () => {
    expect(filterByNomPrefix(persons, '')).toEqual([]);
    expect(filterByNomPrefix(persons, '   ')).toEqual([]);
  });

  it('"D" → tous les noms commençant par D', () => {
    expect(noms(filterByNomPrefix(persons, 'D'))).toEqual(['1', '2', '3', '4', '5', '7']);
  });

  it('"DU" → tous les noms commençant par DU (dont Dùpré → "dupre")', () => {
    expect(noms(filterByNomPrefix(persons, 'DU'))).toEqual(['1', '2', '3', '4', '5', '7']);
  });

  it('"DUP" → DUPONT et Dùpré', () => {
    expect(noms(filterByNomPrefix(persons, 'DUP'))).toEqual(['1', '2', '7']);
  });

  it('"DUPO" → uniquement DUPONT', () => {
    expect(noms(filterByNomPrefix(persons, 'DUPO'))).toEqual(['1', '2']);
  });

  it('"DUPONT" → tous les DUPONT', () => {
    expect(noms(filterByNomPrefix(persons, 'DUPONT'))).toEqual(['1', '2']);
  });

  it('insensible à la casse', () => {
    expect(noms(filterByNomPrefix(persons, 'dupont'))).toEqual(['1', '2']);
  });

  it('insensible aux accents (préfixe et nom)', () => {
    expect(noms(filterByNomPrefix(persons, 'dup'))).toEqual(['1', '2', '7']); // inclut Dùpré
    expect(noms(filterByNomPrefix(persons, 'dùp'))).toEqual(['1', '2', '7']);
  });

  it('ne cherche pas dans le prénom ni l’adresse', () => {
    expect(filterByNomPrefix(persons, 'sophie')).toEqual([]);
    expect(filterByNomPrefix(persons, 'rue')).toEqual([]);
  });
});
