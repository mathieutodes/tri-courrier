import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Person, PersonInput } from '../types/person';
import type { Rue } from '../types/rue';
import { cleanStored, normalizeText } from '../utils/normalizeText';

export { buildAdresse, decomposeAdresse } from '../utils/adresse';

const DB_NAME = 'tri-courrier';
// v1 : store `persons`
// v2 : ajout ADDITIF du store `rues` (aucune donnée existante n'est touchée)
const DB_VERSION = 2;
const STORE = 'persons';
const RUE_STORE = 'rues';

/**
 * Représentation stockée d'une personne : on ajoute un champ normalisé pour
 * accélérer la recherche. Ce champ n'est pas exposé par l'API publique.
 * Les anciennes entrées (v1) n'ont ni `numeroRue` ni `rueId` : ils sont
 * optionnels ici et normalisés à `null` en lecture.
 */
interface StoredPerson extends Omit<Person, 'numeroRue' | 'rueId'> {
  nomNormalise: string;
  numeroRue?: number | null;
  rueId?: string | null;
}

interface StoredRue extends Rue {
  nomNormalise: string;
}

interface TriCourrierDB extends DBSchema {
  persons: {
    key: string;
    value: StoredPerson;
    indexes: { nomNormalise: string };
  };
  rues: {
    key: string;
    value: StoredRue;
    indexes: { nomNormalise: string };
  };
}

let dbPromise: Promise<IDBPDatabase<TriCourrierDB>> | null = null;

function getDB(): Promise<IDBPDatabase<TriCourrierDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TriCourrierDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Migration STRICTEMENT additive : on ne supprime, ne vide ni ne
        // réécrit jamais un store existant. Les personnes déjà enregistrées
        // restent intactes lors du passage de v1 à v2.
        if (oldVersion < 1) {
          const persons = db.createObjectStore(STORE, { keyPath: 'id' });
          persons.createIndex('nomNormalise', 'nomNormalise');
        }
        if (oldVersion < 2) {
          const rues = db.createObjectStore(RUE_STORE, { keyPath: 'id' });
          rues.createIndex('nomNormalise', 'nomNormalise');
        }
      },
    });
  }
  return dbPromise;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

// ---------- Personnes ----------

function toStored(person: Person): StoredPerson {
  return { ...person, nomNormalise: normalizeText(person.nom) };
}

/** Normalise une entrée stockée (y compris ancienne v1) vers `Person`. */
function fromStored(stored: StoredPerson): Person {
  const { nomNormalise: _drop, ...rest } = stored;
  void _drop;
  return {
    id: rest.id,
    nom: rest.nom,
    prenom: rest.prenom ?? null,
    adresse: rest.adresse,
    numeroRue: rest.numeroRue ?? null,
    rueId: rest.rueId ?? null,
    colonne: rest.colonne,
    panneau: rest.panneau ?? null,
  };
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
 * Supprime TOUTES les personnes (store `persons` uniquement).
 * Ne touche jamais au store `rues`.
 */
export async function deleteAllPersons(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}

// ---------- Rues ----------

function toStoredRue(rue: Rue): StoredRue {
  return { ...rue, nomNormalise: normalizeText(rue.nom) };
}

function fromStoredRue(stored: StoredRue): Rue {
  return { id: stored.id, nom: stored.nom };
}

export async function getAllRues(): Promise<Rue[]> {
  const db = await getDB();
  const all = await db.getAll(RUE_STORE);
  return all.map(fromStoredRue).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function addRue(nom: string): Promise<Rue> {
  const rue: Rue = { id: newId(), nom: cleanStored(nom) };
  const db = await getDB();
  await db.put(RUE_STORE, toStoredRue(rue));
  return rue;
}

export async function updateRue(rue: Rue): Promise<void> {
  const db = await getDB();
  await db.put(RUE_STORE, toStoredRue({ ...rue, nom: cleanStored(rue.nom) }));
}

export async function deleteRue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(RUE_STORE, id);
}

// ---------- Recherche ----------

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
