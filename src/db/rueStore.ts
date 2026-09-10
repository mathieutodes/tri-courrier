import { useSyncExternalStore } from 'react';
import type { Rue } from '../types/rue';
import { addRue, deleteRue, getAllRues, updateRue } from './database';

/**
 * Store en mémoire des rues, même principe que `personStore` :
 * IndexedDB = source de vérité, `cache` = copie locale, resynchronisation +
 * notification après chaque écriture. Aucun timer, aucun polling, aucun réseau.
 */

let cache: Rue[] = [];
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

async function reloadFromDB(): Promise<void> {
  cache = await getAllRues();
  loaded = true;
  emit();
}

export function refreshRues(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = reloadFromDB().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function ensureRuesLoaded(): void {
  if (loaded || inFlight) return;
  void refreshRues();
}

export function subscribeRues(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRuesSnapshot(): Rue[] {
  return cache;
}

/** Hook : liste des rues, toujours synchronisée avec IndexedDB. */
export function useRues(): Rue[] {
  return useSyncExternalStore(subscribeRues, getRuesSnapshot, getRuesSnapshot);
}

// ---- Écritures : IndexedDB d'abord, puis resynchronisation ----

export async function addRueSynced(nom: string): Promise<Rue> {
  const rue = await addRue(nom);
  await refreshRues();
  return rue;
}

export async function updateRueSynced(rue: Rue): Promise<void> {
  await updateRue(rue);
  await refreshRues();
}

export async function deleteRueSynced(id: string): Promise<void> {
  await deleteRue(id);
  await refreshRues();
}

/** Réinitialise l'état du store (tests uniquement). */
export function __resetRueStoreForTests(): void {
  cache = [];
  loaded = false;
  inFlight = null;
  listeners.clear();
}
