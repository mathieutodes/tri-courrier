// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Person } from '../types/person';
import type { Rue } from '../types/rue';

/**
 * Vérifie le comportement du bouton « APPORTER UNE PRÉCISION » côté
 * `DatabasePage` : ouverture DIRECTE de la fiche « Modifier » pour l'ID
 * fourni (jamais une simple arrivée sur la liste), focus automatique sur
 * Remarque, et repli propre sur la liste si l'ID est introuvable — jamais de
 * plantage (rechargement, lien obsolète, donnée supprimée).
 */

let mockPersons: Person[] = [];
const mockRues: Rue[] = [];
// `vi.hoisted` : seul moyen fiable de créer un mock utilisable depuis une
// factory `vi.mock` (elles-mêmes hoistées au tout début du fichier).
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('../App', () => ({
  navigate: mockNavigate,
}));

vi.mock('../db/personStore', () => ({
  usePersons: () => mockPersons,
  arePersonsLoaded: () => true,
  ensurePersonsLoaded: vi.fn(),
  refreshPersons: vi.fn(async () => {}),
  addPersonSynced: vi.fn(async () => {}),
  updatePersonSynced: vi.fn(async () => {}),
  deletePersonSynced: vi.fn(async () => {}),
  bulkAddPersonsSynced: vi.fn(async () => 0),
  deleteAllPersonsSynced: vi.fn(async () => {}),
}));

vi.mock('../db/rueStore', () => ({
  useRues: () => mockRues,
  ensureRuesLoaded: vi.fn(),
  refreshRues: vi.fn(async () => {}),
  addRueSynced: vi.fn(async () => {}),
  updateRueSynced: vi.fn(async () => {}),
  deleteRueSynced: vi.fn(async () => {}),
}));

vi.mock('../services/importExport', () => ({
  buildImportPreview: vi.fn(),
  downloadFile: vi.fn(),
  personsToCSV: vi.fn(() => ''),
  personsToJSON: vi.fn(() => ''),
  timestampedName: vi.fn(() => 'tri-courrier.csv'),
}));

import DatabasePage from './DatabasePage';

function person(id: string, nom: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    nom,
    prenom: null,
    adresse: `${nom} adresse`,
    numeroRue: null,
    rueId: null,
    colonne: 1,
    panneau: null,
    logement: null,
    reexpedition: false,
    remarque: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  mockNavigate.mockClear();
});

describe('DatabasePage — ouverture directe via editPersonId (APPORTER UNE PRÉCISION)', () => {
  it('ouvre directement « Modifier une personne » pour le bon destinataire (pas juste la liste)', () => {
    mockPersons = [person('p1', 'DUPONT'), person('p2', 'MARTIN')];
    render(<DatabasePage editPersonId="p2" />);

    expect(screen.getByText('Modifier une personne')).not.toBeNull();
    // Bien la fiche de MARTIN (p2), pas DUPONT (p1) : identification par ID
    // stable, jamais par nom (plusieurs destinataires peuvent être homonymes).
    expect((screen.getByLabelText(/^nom/i) as HTMLInputElement).value).toBe('MARTIN');
  });

  it('place le focus dans la textarea Remarque à l’ouverture', () => {
    mockPersons = [person('p1', 'DUPONT')];
    render(<DatabasePage editPersonId="p1" />);

    expect(document.activeElement).toBe(screen.getByLabelText(/remarque/i));
  });

  it('un ID inexistant ne provoque aucun plantage : repli propre sur la liste', () => {
    mockPersons = [person('p1', 'DUPONT')];
    render(<DatabasePage editPersonId="id-inexistant" />);

    expect(screen.queryByText('Modifier une personne')).toBeNull();
    expect(screen.getByText('Base de données')).not.toBeNull();
  });

  it('sans editPersonId, ouverture normale sur la liste', () => {
    mockPersons = [person('p1', 'DUPONT')];
    render(<DatabasePage />);

    expect(screen.queryByText('Modifier une personne')).toBeNull();
    expect(screen.getByText('Base de données')).not.toBeNull();
  });
});
