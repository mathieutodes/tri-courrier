import { describe, expect, it } from 'vitest';
import { buildAddressOptions, filterPersonsByAddresses } from './addressFilter';
import type { Person } from '../types/person';

function person(id: string, nom: string, adresse: string, prenom: string | null = null): Person {
  return {
    id,
    nom,
    prenom,
    adresse,
    numeroRue: null,
    rueId: null,
    colonne: 1,
    panneau: null,
    logement: null,
    reexpedition: false,
  };
}

describe('buildAddressOptions', () => {
  it('1. chaque adresse complète apparaît une seule fois, même partagée par 150 personnes', () => {
    const persons = Array.from({ length: 150 }, (_, i) =>
      person(`p${i}`, `PERSONNE${i}`, '35 Rue Claude Kogan'),
    );
    const options = buildAddressOptions(persons);
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('35 Rue Claude Kogan');
  });

  it('2. "35 Rue Claude Kogan" et "37 Rue Claude Kogan" sont deux filtres différents', () => {
    const persons = [
      person('p1', 'DUPONT', '35 Rue Claude Kogan'),
      person('p2', 'MARTIN', '37 Rue Claude Kogan'),
    ];
    const options = buildAddressOptions(persons);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.label)).toEqual(['35 Rue Claude Kogan', '37 Rue Claude Kogan']);
    expect(options[0].key).not.toBe(options[1].key);
  });

  it('7. la normalisation évite les doublons dus à la casse / aux accents / aux espaces', () => {
    const persons = [
      person('p1', 'A', '35 Rue Claude Kogan'),
      person('p2', 'B', '35 RUE CLAUDE KOGAN'),
      person('p3', 'C', '  35   Rue Claude Kogan  '),
      person('p4', 'D', '35 rue Claudé Kôgan'),
    ];
    const options = buildAddressOptions(persons);
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('35 Rue Claude Kogan');
  });

  it('conserve l’orthographe la plus lisible même si elle n’arrive pas en premier (ordre non garanti depuis IndexedDB)', () => {
    // `getAllPersons()` renvoie les fiches triées par clé primaire (UUID), pas
    // par ordre d'insertion : la variante "propre" peut arriver n'importe où.
    const persons = [
      person('p1', 'A', '35 RUE claude KOGAN'),
      person('p2', 'B', '35 rue claude kogan'),
      person('p3', 'C', '35 Rue Claude Kogan'), // la mieux formatée, arrive en dernier
    ];
    const options = buildAddressOptions(persons);
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('35 Rue Claude Kogan');
  });

  it('ne pénalise pas les prépositions françaises en minuscules ("de", "des"…)', () => {
    const persons = [
      person('p1', 'A', '72 AVENUE DE CONSTANTINE'),
      person('p2', 'B', '72 Avenue de Constantine'),
    ];
    const options = buildAddressOptions(persons);
    expect(options[0].label).toBe('72 Avenue de Constantine');
  });

  it('ignore les adresses vides', () => {
    const persons = [person('p1', 'A', ''), person('p2', 'B', '   ')];
    expect(buildAddressOptions(persons)).toEqual([]);
  });

  it('9. une adresse qui n’existe plus chez aucun destinataire disparaît de la liste', () => {
    const before = buildAddressOptions([
      person('p1', 'A', '35 Rue Claude Kogan'),
      person('p2', 'B', '37 Rue Claude Kogan'),
    ]);
    expect(before.map((o) => o.label)).toEqual(['35 Rue Claude Kogan', '37 Rue Claude Kogan']);

    // p1 a été supprimé / modifié : plus personne au 35.
    const after = buildAddressOptions([person('p2', 'B', '37 Rue Claude Kogan')]);
    expect(after.map((o) => o.label)).toEqual(['37 Rue Claude Kogan']);
  });

  it('tri d’abord par nom de rue puis par numéro (localeCompare fr, numeric)', () => {
    const persons = [
      person('p1', 'A', '76 Avenue de Constantine'),
      person('p2', 'B', '37 Rue Claude Kogan'),
      person('p3', 'C', '72 Avenue de Constantine'),
      person('p4', 'D', '35 Rue Claude Kogan'),
      person('p5', 'E', '74 Avenue de Constantine'),
    ];
    const options = buildAddressOptions(persons);
    expect(options.map((o) => o.label)).toEqual([
      '72 Avenue de Constantine',
      '74 Avenue de Constantine',
      '76 Avenue de Constantine',
      '35 Rue Claude Kogan',
      '37 Rue Claude Kogan',
    ]);
  });

  it('adresses non décomposables : repli sur un tri alphabétique naturel, après les adresses décomposables', () => {
    const persons = [
      person('p1', 'A', 'Chez le gardien'),
      person('p2', 'B', '2 Rue Pasteur'),
      person('p3', 'C', 'Boîte postale 12'),
    ];
    const options = buildAddressOptions(persons);
    expect(options.map((o) => o.label)).toEqual([
      '2 Rue Pasteur',
      'Boîte postale 12',
      'Chez le gardien',
    ]);
  });
});

describe('filterPersonsByAddresses', () => {
  const persons = [
    person('p1', 'DUPONT', '35 Rue Claude Kogan', 'Jean'),
    person('p2', 'MARTIN', '35 Rue Claude Kogan', 'Sophie'),
    person('p3', 'DUPONT', '37 Rue Claude Kogan', 'Marie'),
    person('p4', 'BERNARD', '8 Rue Victor Hugo', 'Paul'),
  ];

  it('5. aucune sélection -> tous les destinataires', () => {
    expect(filterPersonsByAddresses(persons, new Set())).toEqual(persons);
  });

  it('3. sélection d’une seule adresse -> uniquement ses destinataires', () => {
    const key = buildAddressOptions(persons).find((o) => o.label === '35 Rue Claude Kogan')!.key;
    const result = filterPersonsByAddresses(persons, new Set([key]));
    expect(result.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('4. sélection de plusieurs adresses -> union (OU)', () => {
    const options = buildAddressOptions(persons);
    const k35 = options.find((o) => o.label === '35 Rue Claude Kogan')!.key;
    const k37 = options.find((o) => o.label === '37 Rue Claude Kogan')!.key;
    const result = filterPersonsByAddresses(persons, new Set([k35, k37]));
    expect(result.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('la comparaison est normalisée (casse / accents / espaces)', () => {
    const options = buildAddressOptions(persons);
    const key = options.find((o) => o.label === '35 Rue Claude Kogan')!.key;
    const variant = person('p5', 'X', '  35   RUE claude KOGAN  ');
    const result = filterPersonsByAddresses([...persons, variant], new Set([key]));
    expect(result.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p5']);
  });

  it('11. ne modifie ni ne mute la liste de personnes fournie', () => {
    const copy = persons.map((p) => ({ ...p }));
    filterPersonsByAddresses(persons, new Set(['whatever']));
    expect(persons).toEqual(copy);
  });
});
