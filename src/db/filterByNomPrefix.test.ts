import { describe, expect, it } from 'vitest';
import { filterByNomPrefix } from './database';
import type { Person } from '../types/person';

const persons: Person[] = [
  { id: '1', nom: 'DUPONT', prenom: 'Jean', adresse: '12 rue des Lilas', colonne: 5, panneau: 1 },
  { id: '2', nom: 'DUPONT', prenom: 'Marie', adresse: '48 avenue Victor Hugo', colonne: 3, panneau: null },
  { id: '3', nom: 'DURAND', prenom: 'Michel', adresse: '15 rue de la Gare', colonne: 8, panneau: null },
  { id: '4', nom: 'DUVAL', prenom: 'Anaïs', adresse: '8 rue des Jardins', colonne: 2, panneau: null },
  { id: '5', nom: 'DUMONT', prenom: 'Élise', adresse: '17 boulevard de Strasbourg', colonne: 9, panneau: null },
  { id: '6', nom: 'MARTIN', prenom: 'Sophie', adresse: '4 avenue de Paris', colonne: 2, panneau: null },
  { id: '7', nom: 'Dùpré', prenom: null, adresse: '2 place du Marché', colonne: 7, panneau: null },
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
