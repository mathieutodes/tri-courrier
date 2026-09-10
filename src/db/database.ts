import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Person, PersonInput } from '../types/person';
import { normalizeText } from '../utils/normalizeText';

const DB_NAME = 'tri-courrier';
const DB_VERSION = 1;
const STORE = 'persons';

/**
 * Représentation stockée : on ajoute un champ normalisé pour accélérer
 * la recherche. Ce champ n'est pas exposé par l'API publique.
 */
interface StoredPerson extends Person {
  nomNormalise: string;
}

interface TriCourrierDB extends DBSchema {
  persons: {
    key: string;
    value: StoredPerson;
    indexes: { nomNormalise: string };
  };
}

let dbPromise: Promise<IDBPDatabase<TriCourrierDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TriCourrierDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TriCourrierDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Une migration ne doit jamais effacer les données existantes.
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('nomNormalise', 'nomNormalise');
        }
      },
    });
  }
  return dbPromise;
}

function toStored(person: Person): StoredPerson {
  return { ...person, nomNormalise: normalizeText(person.nom) };
}

function fromStored(stored: StoredPerson): Person {
  const { nomNormalise: _drop, ...person } = stored;
  void _drop;
  return person;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export async function getAllPersons(): Promise<Person[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.map(fromStored);
}

export async function addPerson(input: PersonInput): Promise<Person> {
  const person: Person = { id: newId(), ...input };
  const db = await getDB();
  await db.put(STORE, toStored(person));
  return person;
}

export async function updatePerson(person: Person): Promise<void> {
  const db = await getDB();
  await db.put(STORE, toStored(person));
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

/** Ajoute plusieurs personnes en une transaction (import CSV / JSON). */
export async function bulkAddPersons(inputs: PersonInput[]): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  for (const input of inputs) {
    const person: Person = { id: newId(), ...input };
    await tx.store.put(toStored(person));
  }
  await tx.done;
  return inputs.length;
}

/**
 * Preshot : filtre une liste déjà chargée sur le NOM par PRÉFIXE.
 * `normalizeText(nom).startsWith(normalizeText(query))`.
 * N'utilise jamais prénom / adresse / colonne / panneau.
 */
export function filterByNomPrefix(persons: Person[], query: string): Person[] {
  const q = normalizeText(query);
  if (q === '') return [];
  return persons.filter((p) => normalizeText(p.nom).startsWith(q));
}

/**
 * Recherche principale : UNIQUEMENT sur le champ `nom`.
 * - insensible à la casse et aux accents
 * - accepte une partie du nom (sous-chaîne)
 */
export async function searchByNom(query: string): Promise<Person[]> {
  const q = normalizeText(query);
  if (q === '') return [];
  const persons = await getAllPersons();
  const matches = persons.filter((p) => normalizeText(p.nom).includes(q));
  matches.sort((a, b) => {
    const na = normalizeText(a.nom);
    const nb = normalizeText(b.nom);
    // Les noms qui commencent par la requête d'abord.
    const pa = na.startsWith(q) ? 0 : 1;
    const pb = nb.startsWith(q) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (na !== nb) return na.localeCompare(nb);
    return normalizeText(a.prenom).localeCompare(normalizeText(b.prenom));
  });
  return matches;
}
