import { useSyncExternalStore } from 'react';
import type { Person, PersonInput } from '../types/person';
import {
  addPerson,
  bulkAddPersons,
  deletePerson,
  getAllPersons,
  updatePerson,
} from './database';

/**
 * Store en mémoire au-dessus d'IndexedDB.
 *
 * - IndexedDB = source de vérité (toutes les écritures y passent).
 * - `cache` = copie locale utilisée par le preshot pour rester instantané.
 *
 * Après CHAQUE écriture (ajout / modification / suppression / import), le cache
 * est rechargé depuis IndexedDB puis tous les abonnés (SearchPage, DatabasePage)
 * sont notifiés — la recherche voit donc la nouvelle base immédiatement, sans
 * rechargement de page, sans timer et sans polling.
 */

let cache: Person[] = [];
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

async function reloadFromDB(): Promise<void> {
  cache = await getAllPersons();
  loaded = true;
  emit();
}

/** Recharge le cache depuis IndexedDB (dédoublonne les appels concurrents). */
export function refreshPersons(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = reloadFromDB().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Charge le cache une seule fois si ce n'est pas déjà fait / en cours. */
export function ensurePersonsLoaded(): void {
  if (loaded || inFlight) return;
  void refreshPersons();
}

export function subscribePersons(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPersonsSnapshot(): Person[] {
  return cache;
}

export function arePersonsLoaded(): boolean {
  return loaded;
}

/** Hook : liste des personnes, toujours synchronisée avec IndexedDB. */
export function usePersons(): Person[] {
  return useSyncExternalStore(subscribePersons, getPersonsSnapshot, getPersonsSnapshot);
}

// ---- Écritures : IndexedDB d'abord, puis resynchronisation du cache ----

export async function addPersonSynced(input: PersonInput): Promise<Person> {
  const person = await addPerson(input);
  await refreshPersons();
  return person;
}

export async function updatePersonSynced(person: Person): Promise<void> {
  await updatePerson(person);
  await refreshPersons();
}

export async function deletePersonSynced(id: string): Promise<void> {
  await deletePerson(id);
  await refreshPersons();
}

export async function bulkAddPersonsSynced(inputs: PersonInput[]): Promise<number> {
  const count = await bulkAddPersons(inputs);
  await refreshPersons();
  return count;
}

/** Réinitialise l'état du store (tests uniquement). */
export function __resetPersonStoreForTests(): void {
  cache = [];
  loaded = false;
  inFlight = null;
  listeners.clear();
}
