import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Simule IndexedDB au niveau du module `idb` (deux stores : persons / rues)
 * afin de tester `deleteAllPersons()` avec le VRAI code de `database.ts`,
 * et vérifier précisément qu'il ne touche qu'au store `persons`.
 */
vi.mock('idb', () => {
  const stores: Record<'persons' | 'rues', Map<string, Record<string, unknown>>> = {
    persons: new Map(),
    rues: new Map(),
  };

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
    clear: vi.fn(async (name: 'persons' | 'rues') => {
      stores[name].clear();
    }),
    transaction(name: 'persons' | 'rues') {
      return {
        store: {
          put: async (value: { id: string }) => {
            stores[name].set(value.id, value);
          },
        },
        done: Promise.resolve(),
      };
    },
  };

  return {
    openDB: vi.fn(async () => fakeDb),
    __stores: stores,
    __clearMock: fakeDb.clear,
  };
});

import * as idb from 'idb';
import { deleteAllPersons, getAllPersons, getAllRues } from './database';

type FakeStores = Record<'persons' | 'rues', Map<string, Record<string, unknown>>>;
const stores = () => (idb as unknown as { __stores: FakeStores }).__stores;
const clearMock = () => (idb as unknown as { __clearMock: ReturnType<typeof vi.fn> }).__clearMock;

function seedPerson(id: string, nom: string) {
  stores().persons.set(id, {
    id,
    nom,
    prenom: null,
    adresse: `${nom} adresse`,
    numeroRue: null,
    rueId: null,
    colonne: 1,
    panneau: null,
    nomNormalise: nom.toLowerCase(),
  });
}

function seedRue(id: string, nom: string) {
  stores().rues.set(id, { id, nom, nomNormalise: nom.toLowerCase() });
}

beforeEach(() => {
  stores().persons.clear();
  stores().rues.clear();
  clearMock().mockClear();
});

describe('deleteAllPersons', () => {
  it('supprime toutes les personnes', async () => {
    seedPerson('p1', 'DUPONT');
    seedPerson('p2', 'MARTIN');
    expect(await getAllPersons()).toHaveLength(2);

    await deleteAllPersons();

    expect(await getAllPersons()).toEqual([]);
  });

  it('ne touche jamais au store des rues', async () => {
    seedPerson('p1', 'DUPONT');
    seedRue('r1', 'Rue Victor Hugo');
    seedRue('r2', 'Rue Pasteur');

    await deleteAllPersons();

    const rues = await getAllRues();
    expect(rues.map((r) => r.nom).sort()).toEqual(['Rue Pasteur', 'Rue Victor Hugo']);
  });

  it("n'appelle clear() que sur le store `persons`", async () => {
    seedPerson('p1', 'DUPONT');
    seedRue('r1', 'Rue Victor Hugo');

    await deleteAllPersons();

    expect(clearMock()).toHaveBeenCalledTimes(1);
    expect(clearMock()).toHaveBeenCalledWith('persons');
  });

  it('fonctionne aussi quand la base est déjà vide', async () => {
    await expect(deleteAllPersons()).resolves.toBeUndefined();
    expect(await getAllPersons()).toEqual([]);
  });
});
