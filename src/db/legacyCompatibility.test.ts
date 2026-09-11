import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Simule IndexedDB (store `persons`) pour vérifier qu'une fiche enregistrée
 * AVANT l'ajout du champ `logement` (et avant que `colonne` devienne
 * facultative) reste parfaitement lisible et modifiable.
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
    async clear(name: 'persons' | 'rues') {
      stores[name].clear();
    },
  };
  return { openDB: vi.fn(async () => fakeDb), __stores: stores };
});

import * as idb from 'idb';
import { getAllPersons, updatePerson } from './database';

type FakeStores = Record<'persons' | 'rues', Map<string, Record<string, unknown>>>;
const stores = () => (idb as unknown as { __stores: FakeStores }).__stores;

beforeEach(() => {
  stores().persons.clear();
  stores().rues.clear();
});

describe('Compatibilité ascendante — fiches enregistrées avant le champ logement', () => {
  it('9. une fiche sans numeroRue / rueId / logement reste lisible, colonne intacte, logement -> null', async () => {
    // Forme de stockage d'origine : aucune trace de numeroRue, rueId ou logement.
    stores().persons.set('legacy-1', {
      id: 'legacy-1',
      nom: 'LEGACY',
      prenom: 'Ancien',
      adresse: '99 Vieille Rue',
      colonne: 4,
      panneau: 3,
      nomNormalise: 'legacy',
    });

    const persons = await getAllPersons();
    expect(persons).toEqual([
      {
        id: 'legacy-1',
        nom: 'LEGACY',
        prenom: 'Ancien',
        adresse: '99 Vieille Rue',
        numeroRue: null,
        rueId: null,
        colonne: 4,
        panneau: 3,
        logement: null,
      },
    ]);
  });

  it('une fiche ancienne reste modifiable (ex. bascule vers panneau + logement) sans rien perdre d’autre', async () => {
    stores().persons.set('legacy-2', {
      id: 'legacy-2',
      nom: 'ANCIEN2',
      prenom: null,
      adresse: '5 Rue X',
      colonne: 9,
      panneau: null,
      nomNormalise: 'ancien2',
    });

    const [before] = await getAllPersons();
    expect(before.logement).toBeNull();
    expect(before.colonne).toBe(9);

    await updatePerson({ ...before, colonne: null, panneau: 2, logement: '12B' });

    const [after] = await getAllPersons();
    expect(after).toMatchObject({
      id: 'legacy-2',
      nom: 'ANCIEN2',
      colonne: null,
      panneau: 2,
      logement: '12B',
    });
  });
});
