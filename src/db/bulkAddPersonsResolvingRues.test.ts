import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Simule IndexedDB au niveau du module `idb` (stores `persons` + `rues`,
 * transactions mono ou multi-store) afin de tester `bulkAddPersonsResolvingRues()`
 * avec le VRAI code de `database.ts`.
 */
vi.mock('idb', () => {
  const stores: Record<'persons' | 'rues', Map<string, Record<string, unknown>>> = {
    persons: new Map(),
    rues: new Map(),
  };

  function objectStore(name: 'persons' | 'rues') {
    return {
      getAll: async () => [...stores[name].values()],
      put: async (value: { id: string }) => {
        stores[name].set(value.id, value);
      },
      delete: async (id: string) => {
        stores[name].delete(id);
      },
    };
  }

  const fakeDb = {
    async getAll(name: 'persons' | 'rues') {
      return [...stores[name].values()];
    },
    async put(name: 'persons' | 'rues', value: { id: string }) {
      stores[name].set(value.id, value);
    },
    async delete(name: 'persons' | 'rues', id: string) {
      stores[name].delete(id);
    },
    async clear(name: 'persons' | 'rues') {
      stores[name].clear();
    },
    transaction(names: 'persons' | 'rues' | Array<'persons' | 'rues'>) {
      if (Array.isArray(names)) {
        return {
          objectStore: (name: 'persons' | 'rues') => objectStore(name),
          done: Promise.resolve(),
        };
      }
      return {
        store: objectStore(names),
        done: Promise.resolve(),
      };
    },
  };

  return {
    openDB: vi.fn(async () => fakeDb),
    __stores: stores,
  };
});

import * as idb from 'idb';
import { bulkAddPersonsResolvingRues, getAllPersons, getAllRues } from './database';
import { normalizeText } from '../utils/normalizeText';
import type { PersonInput } from '../types/person';

type FakeStores = Record<'persons' | 'rues', Map<string, Record<string, unknown>>>;
const stores = () => (idb as unknown as { __stores: FakeStores }).__stores;

function seedRue(id: string, nom: string) {
  stores().rues.set(id, { id, nom, nomNormalise: normalizeText(nom) });
}

function csvInput(nom: string, adresse: string, colonne = 1): PersonInput {
  return {
    nom,
    prenom: null,
    adresse,
    numeroRue: null,
    rueId: null,
    colonne,
    panneau: null,
    logement: null,
    reexpedition: false,
  };
}

beforeEach(() => {
  stores().persons.clear();
  stores().rues.clear();
});

describe('bulkAddPersonsResolvingRues', () => {
  it('1. catalogue vide : "35 Rue Claude Kogan" crée la rue "Rue Claude Kogan"', async () => {
    const { count, ruesCreated } = await bulkAddPersonsResolvingRues([
      csvInput('DUPONT', '35 Rue Claude Kogan'),
    ]);
    expect(count).toBe(1);
    expect(ruesCreated).toBe(1);

    const rues = await getAllRues();
    expect(rues.map((r) => r.nom)).toEqual(['Rue Claude Kogan']);
  });

  it('2. 100 destinataires à la même adresse ne créent la rue qu’une seule fois', async () => {
    const inputs = Array.from({ length: 100 }, (_, i) =>
      csvInput(`PERSONNE${i}`, '35 Rue Claude Kogan'),
    );

    const { count, ruesCreated } = await bulkAddPersonsResolvingRues(inputs);

    expect(count).toBe(100);
    expect(ruesCreated).toBe(1);
    expect(await getAllRues()).toHaveLength(1);
    expect(await getAllPersons()).toHaveLength(100);
  });

  it('3. un import ultérieur sur la même rue ("37 Rue Claude Kogan") ne recrée rien', async () => {
    await bulkAddPersonsResolvingRues([csvInput('DUPONT', '35 Rue Claude Kogan')]);

    const { ruesCreated } = await bulkAddPersonsResolvingRues([
      csvInput('MARTIN', '37 Rue Claude Kogan'),
    ]);

    expect(ruesCreated).toBe(0);
    const rues = await getAllRues();
    expect(rues).toHaveLength(1);
    expect(rues[0].nom).toBe('Rue Claude Kogan');
  });

  it('4. majuscules / minuscules / espaces différents : jamais de doublon', async () => {
    await bulkAddPersonsResolvingRues([
      csvInput('A', '1 Rue Claude Kogan'),
      csvInput('B', '2 RUE CLAUDE KOGAN'),
      csvInput('C', '3 rue claude kogan'),
      csvInput('D', '4   Rue   Claude   Kogan  '),
    ]);

    const rues = await getAllRues();
    expect(rues).toHaveLength(1);
  });

  it('5. plusieurs rues différentes (dont un doublon interne au lot) : chacune créée une seule fois', async () => {
    const { ruesCreated } = await bulkAddPersonsResolvingRues([
      csvInput('A', '35 Rue Claude Kogan'),
      csvInput('B', '12 Avenue de Constantine'),
      csvInput('C', '8 Rue Victor Hugo'),
      csvInput('D', '36 Rue Claude Kogan'), // même rue que A, numéro différent
    ]);

    expect(ruesCreated).toBe(3);
    const noms = (await getAllRues()).map((r) => r.nom).sort();
    expect(noms).toEqual(['Avenue de Constantine', 'Rue Claude Kogan', 'Rue Victor Hugo']);
  });

  it('6. numeroRue et rueId sont correctement renseignés sur la personne importée', async () => {
    await bulkAddPersonsResolvingRues([csvInput('DUPONT', '35 Rue Claude Kogan')]);

    const [person] = await getAllPersons();
    const [rue] = await getAllRues();
    expect(person.numeroRue).toBe(35);
    expect(person.rueId).toBe(rue.id);
    expect(person.adresse).toBe('35 Rue Claude Kogan'); // compatibilité conservée
  });

  it('7. adresse non décomposable : la personne est importée, aucune rue invalide créée', async () => {
    const { count, ruesCreated } = await bulkAddPersonsResolvingRues([
      csvInput('DUPONT', 'Chez le gardien, bâtiment C'),
    ]);

    expect(count).toBe(1);
    expect(ruesCreated).toBe(0);

    const [person] = await getAllPersons();
    expect(person.adresse).toBe('Chez le gardien, bâtiment C');
    expect(person.numeroRue).toBeNull();
    expect(person.rueId).toBeNull();
    expect(await getAllRues()).toHaveLength(0);
  });

  it('8. les rues déjà enregistrées avant l’import restent intactes (même id)', async () => {
    seedRue('r1', 'Rue Pasteur');

    await bulkAddPersonsResolvingRues([csvInput('DUPONT', '35 Rue Claude Kogan')]);

    const rues = await getAllRues();
    expect(rues.map((r) => r.nom).sort()).toEqual(['Rue Claude Kogan', 'Rue Pasteur']);
    expect(rues.find((r) => r.nom === 'Rue Pasteur')?.id).toBe('r1');
  });

  it('réutilise une rue déjà enregistrée (comparaison normalisée) au lieu d’en recréer une', async () => {
    seedRue('r1', 'Rue Claude Kogan');

    const { ruesCreated } = await bulkAddPersonsResolvingRues([
      csvInput('DUPONT', '35 rue   CLAUDE kogan'),
    ]);

    expect(ruesCreated).toBe(0);
    expect(await getAllRues()).toHaveLength(1);
    const [person] = await getAllPersons();
    expect(person.rueId).toBe('r1');
  });

  it('12. crée automatiquement la rue pour un import de fiches PANNEAU + LOGEMENT (sans colonne)', async () => {
    const inputs: PersonInput[] = [
      {
        nom: 'LEROY',
        prenom: null,
        adresse: '3 Rue des Tilleuls',
        numeroRue: null,
        rueId: null,
        colonne: null,
        panneau: 4,
        logement: '314',
        reexpedition: false,
      },
      {
        nom: 'PETIT',
        prenom: null,
        adresse: '5 Rue des Tilleuls',
        numeroRue: null,
        rueId: null,
        colonne: null,
        panneau: 4,
        logement: '315',
        reexpedition: false,
      },
    ];

    const { count, ruesCreated } = await bulkAddPersonsResolvingRues(inputs);

    expect(count).toBe(2);
    expect(ruesCreated).toBe(1); // une seule rue malgré 2 fiches logement différentes

    const rues = await getAllRues();
    expect(rues.map((r) => r.nom)).toEqual(['Rue des Tilleuls']);

    const persons = await getAllPersons();
    expect(persons.every((p) => p.rueId === rues[0].id)).toBe(true);
    expect(persons.every((p) => p.colonne === null)).toBe(true);
    expect(persons.find((p) => p.logement === '314')?.numeroRue).toBe(3);
    expect(persons.find((p) => p.logement === '315')?.numeroRue).toBe(5);
  });

  it('ne touche jamais aux personnes déjà enregistrées', async () => {
    stores().persons.set('p0', {
      id: 'p0',
      nom: 'EXISTANT',
      prenom: null,
      adresse: '1 Rue Ancienne',
      numeroRue: null,
      rueId: null,
      colonne: 1,
      panneau: null,
      nomNormalise: 'existant',
    });

    await bulkAddPersonsResolvingRues([csvInput('DUPONT', '35 Rue Claude Kogan')]);

    const persons = await getAllPersons();
    expect(persons.map((p) => p.nom).sort()).toEqual(['DUPONT', 'EXISTANT']);
  });
});
