import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rue } from '../types/rue';

// IndexedDB simulé en mémoire pour tester la logique du store des rues.
vi.mock('./database', () => {
  let db: Rue[] = [];
  let seq = 0;
  return {
    getAllRues: vi.fn(async () =>
      db.map((r) => ({ ...r })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    ),
    addRue: vi.fn(async (nom: string) => {
      const r: Rue = { id: `r${++seq}`, nom };
      db.push(r);
      return { ...r };
    }),
    updateRue: vi.fn(async (rue: Rue) => {
      const i = db.findIndex((x) => x.id === rue.id);
      if (i >= 0) db[i] = { ...rue };
    }),
    deleteRue: vi.fn(async (id: string) => {
      db = db.filter((x) => x.id !== id);
    }),
    __clear: () => {
      db = [];
      seq = 0;
    },
  };
});

import * as database from './database';
import {
  __resetRueStoreForTests,
  addRueSynced,
  deleteRueSynced,
  getRuesSnapshot,
  refreshRues,
  subscribeRues,
  updateRueSynced,
} from './rueStore';

const clearDb = () => (database as unknown as { __clear: () => void }).__clear();

beforeEach(() => {
  vi.clearAllMocks();
  clearDb();
  __resetRueStoreForTests();
});

describe('rueStore', () => {
  it('un ajout est visible immédiatement dans le snapshot', async () => {
    await addRueSynced('Rue Victor Hugo');
    expect(getRuesSnapshot().map((r) => r.nom)).toEqual(['Rue Victor Hugo']);
  });

  it('une modification est reflétée immédiatement', async () => {
    const r = await addRueSynced('Rue Victor Hugo');
    await updateRueSynced({ id: r.id, nom: 'Rue Pasteur' });
    expect(getRuesSnapshot()[0].nom).toBe('Rue Pasteur');
  });

  it('une suppression retire la rue immédiatement', async () => {
    const a = await addRueSynced('Rue A');
    await addRueSynced('Rue B');
    await deleteRueSynced(a.id);
    expect(getRuesSnapshot().map((r) => r.nom)).toEqual(['Rue B']);
  });

  it('notifie les abonnés à chaque écriture puis plus après désabonnement', async () => {
    const listener = vi.fn();
    const unsub = subscribeRues(listener);
    await addRueSynced('Rue A');
    await updateRueSynced({ ...getRuesSnapshot()[0], nom: 'Rue A2' });
    await deleteRueSynced(getRuesSnapshot()[0].id);
    expect(listener).toHaveBeenCalledTimes(3);
    unsub();
    await addRueSynced('Rue C');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('refreshRues dédoublonne les appels concurrents', async () => {
    await Promise.all([refreshRues(), refreshRues(), refreshRues()]);
    expect(database.getAllRues).toHaveBeenCalledTimes(1);
  });
});
