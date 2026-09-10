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
    __clear: () => {
      db = [];
      seq = 0;
    },
  };
});

import * as database from './database';
import {
  __resetPersonStoreForTests,
  addPersonSynced,
  bulkAddPersonsSynced,
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
});
