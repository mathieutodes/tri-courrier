import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person, PersonInput } from '../types/person';

// IndexedDB simulé en mémoire pour tester la logique du store.
vi.mock('./database', () => {
  let db: Person[] = [];
  let seq = 0;
  return {
    getAllPersons: vi.fn(async () => db.map((p) => ({ ...p }))),
    addPerson: vi.fn(async (input: PersonInput) => {
      const p: Person = { id: `id${++seq}`, ...input };
      db.push(p);
      return { ...p };
    }),
    updatePerson: vi.fn(async (person: Person) => {
      const i = db.findIndex((x) => x.id === person.id);
      if (i >= 0) db[i] = { ...person };
    }),
    deletePerson: vi.fn(async (id: string) => {
      db = db.filter((x) => x.id !== id);
    }),
    bulkAddPersons: vi.fn(async (inputs: PersonInput[]) => {
      for (const input of inputs) db.push({ id: `id${++seq}`, ...input });
      return inputs.length;
    }),
    bulkAddPersonsResolvingRues: vi.fn(async (inputs: PersonInput[]) => {
      // Simule une résolution de rue triviale : toute adresse commençant par
      // un chiffre "crée" une rue (1 nouvelle par valeur distincte de `adresse`
      // dans ce mock simplifié — la vraie déduplication normalisée est testée
      // au niveau de `database.ts`, voir bulkAddPersonsResolvingRues.test.ts).
      const createdAdresses = new Set<string>();
      let ruesCreated = 0;
      for (const input of inputs) {
        if (/^\d/.test(input.adresse) && !createdAdresses.has(input.adresse)) {
          createdAdresses.add(input.adresse);
          ruesCreated += 1;
        }
        db.push({ id: `id${++seq}`, ...input });
      }
      return { count: inputs.length, ruesCreated };
    }),
    deleteAllPersons: vi.fn(async () => {
      db = [];
    }),
    __clear: () => {
      db = [];
      seq = 0;
    },
  };
});

vi.mock('./rueStore', () => ({
  refreshRues: vi.fn(async () => {}),
}));

import * as database from './database';
import * as rueStore from './rueStore';
import {
  __resetPersonStoreForTests,
  addPersonSynced,
  bulkAddPersonsSynced,
  bulkImportPersonsSynced,
  deleteAllPersonsSynced,
  deletePersonSynced,
  getPersonsSnapshot,
  refreshPersons,
  subscribePersons,
  updatePersonSynced,
} from './personStore';

const clearDb = () => (database as unknown as { __clear: () => void }).__clear();

const p = (nom: string, colonne: number, panneau: number | null = null): PersonInput => ({
  nom,
  prenom: null,
  adresse: `${nom} rue`,
  numeroRue: null,
  rueId: null,
  colonne,
  panneau,
});

beforeEach(() => {
  vi.clearAllMocks();
  clearDb();
  __resetPersonStoreForTests();
});

describe('personStore', () => {
  it('un ajout est visible immédiatement dans le snapshot', async () => {
    await addPersonSynced(p('DUPONT', 5, 1));
    expect(getPersonsSnapshot().map((x) => x.nom)).toEqual(['DUPONT']);
  });

  it('une modification remplace les anciennes valeurs dans le snapshot', async () => {
    const added = await addPersonSynced(p('DUPONT', 5, 1));
    await updatePersonSynced({ ...added, colonne: 8, panneau: 2 });
    const current = getPersonsSnapshot()[0];
    expect(current.colonne).toBe(8);
    expect(current.panneau).toBe(2);
  });

  it('une suppression retire la personne du snapshot', async () => {
    const a = await addPersonSynced(p('DUPONT', 5));
    await addPersonSynced(p('MARTIN', 2));
    await deletePersonSynced(a.id);
    expect(getPersonsSnapshot().map((x) => x.nom)).toEqual(['MARTIN']);
  });

  it('un import (bulk) rend toutes les personnes disponibles immédiatement', async () => {
    await bulkAddPersonsSynced([p('DUPONT', 5), p('DURAND', 8), p('DUVAL', 2)]);
    expect(getPersonsSnapshot()).toHaveLength(3);
  });

  it('notifie les abonnés à chaque écriture', async () => {
    const listener = vi.fn();
    const unsub = subscribePersons(listener);
    await addPersonSynced(p('A', 1));
    await updatePersonSynced({ ...getPersonsSnapshot()[0], colonne: 2 });
    await deletePersonSynced(getPersonsSnapshot()[0].id);
    expect(listener).toHaveBeenCalledTimes(3);
    unsub();
    await addPersonSynced(p('B', 1));
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('la référence du snapshot est stable tant que rien ne change', async () => {
    await refreshPersons();
    const ref1 = getPersonsSnapshot();
    await refreshPersons();
    // reload => nouvelle référence, mais contenu identique
    expect(getPersonsSnapshot()).toEqual(ref1);
  });

  it('refreshPersons dédoublonne les appels concurrents', async () => {
    await Promise.all([refreshPersons(), refreshPersons(), refreshPersons()]);
    expect(database.getAllPersons).toHaveBeenCalledTimes(1);
  });

  describe('deleteAllPersonsSynced', () => {
    it('supprime toutes les personnes', async () => {
      await addPersonSynced(p('DUPONT', 5));
      await addPersonSynced(p('MARTIN', 2));
      await addPersonSynced(p('DURAND', 8));
      expect(getPersonsSnapshot()).toHaveLength(3);

      await deleteAllPersonsSynced();

      expect(database.deleteAllPersons).toHaveBeenCalledTimes(1);
    });

    it('le cache du store est vide immédiatement après la suppression', async () => {
      await addPersonSynced(p('DUPONT', 5));
      await addPersonSynced(p('MARTIN', 2));

      await deleteAllPersonsSynced();

      expect(getPersonsSnapshot()).toEqual([]);
    });

    it('notifie les abonnés (recherche / liste) immédiatement', async () => {
      await addPersonSynced(p('DUPONT', 5));
      const listener = vi.fn();
      const unsub = subscribePersons(listener);

      await deleteAllPersonsSynced();

      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
    });

    it('fonctionne aussi quand la base est déjà vide', async () => {
      await expect(deleteAllPersonsSynced()).resolves.toBeUndefined();
      expect(getPersonsSnapshot()).toEqual([]);
    });
  });

  describe('bulkImportPersonsSynced (import CSV)', () => {
    it('délègue la résolution des rues à bulkAddPersonsResolvingRues', async () => {
      const result = await bulkImportPersonsSynced([
        p('DUPONT', 5),
        { ...p('MARTIN', 2), adresse: '35 Rue Claude Kogan' },
      ]);

      expect(database.bulkAddPersonsResolvingRues).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ count: 2, ruesCreated: 1 });
    });

    it('rend les personnes importées disponibles immédiatement dans le cache', async () => {
      await bulkImportPersonsSynced([p('DUPONT', 5), p('MARTIN', 2)]);
      expect(getPersonsSnapshot().map((x) => x.nom).sort()).toEqual(['DUPONT', 'MARTIN']);
    });

    it('rafraîchit aussi le rueStore (les nouvelles rues sont visibles immédiatement)', async () => {
      await bulkImportPersonsSynced([{ ...p('DUPONT', 5), adresse: '35 Rue Claude Kogan' }]);
      expect(rueStore.refreshRues).toHaveBeenCalledTimes(1);
    });

    it('notifie les abonnés du personStore', async () => {
      const listener = vi.fn();
      const unsub = subscribePersons(listener);
      await bulkImportPersonsSynced([p('DUPONT', 5)]);
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
    });
  });
});
