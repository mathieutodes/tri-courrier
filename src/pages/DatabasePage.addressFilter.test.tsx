// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Person } from '../types/person';
import type { Rue } from '../types/rue';

/**
 * Ces tests isolent DatabasePage de la couche de stockage réelle (personStore
 * / rueStore / importExport simulés) pour vérifier uniquement le FILTRE PAR
 * ADRESSE COMPLÈTE : source = person.adresse (jamais le store `rues`),
 * dédoublonnage normalisé, sélection simple/multiple, combinaison avec la
 * recherche admin, mise à jour dynamique, et absence totale d'écriture.
 *
 * Les variables référencées dans les factories `vi.mock` sont préfixées par
 * `mock` (convention Vitest pour les factories hoistées).
 */

let mockPersons: Person[] = [];
let mockRues: Rue[] = [];
const {
  mockAddPersonSynced,
  mockUpdatePersonSynced,
  mockDeletePersonSynced,
  mockBulkAddPersonsSynced,
  mockBulkImportPersonsSynced,
  mockDeleteAllPersonsSynced,
  mockAddRueSynced,
  mockUpdateRueSynced,
  mockDeleteRueSynced,
} = vi.hoisted(() => ({
  mockAddPersonSynced: vi.fn(async () => {}),
  mockUpdatePersonSynced: vi.fn(async () => {}),
  mockDeletePersonSynced: vi.fn(async () => {}),
  mockBulkAddPersonsSynced: vi.fn(async () => 0),
  mockBulkImportPersonsSynced: vi.fn(async () => ({ count: 0, ruesCreated: 0 })),
  mockDeleteAllPersonsSynced: vi.fn(async () => {}),
  mockAddRueSynced: vi.fn(async () => ({ id: 'r', nom: '' })),
  mockUpdateRueSynced: vi.fn(async () => {}),
  mockDeleteRueSynced: vi.fn(async () => {}),
}));

vi.mock('../App', () => ({
  navigate: vi.fn(),
}));

vi.mock('../db/personStore', () => ({
  usePersons: () => mockPersons,
  ensurePersonsLoaded: vi.fn(),
  refreshPersons: vi.fn(async () => {}),
  addPersonSynced: mockAddPersonSynced,
  updatePersonSynced: mockUpdatePersonSynced,
  deletePersonSynced: mockDeletePersonSynced,
  bulkAddPersonsSynced: mockBulkAddPersonsSynced,
  bulkImportPersonsSynced: mockBulkImportPersonsSynced,
  deleteAllPersonsSynced: mockDeleteAllPersonsSynced,
}));

vi.mock('../db/rueStore', () => ({
  useRues: () => mockRues,
  ensureRuesLoaded: vi.fn(),
  refreshRues: vi.fn(async () => {}),
  addRueSynced: mockAddRueSynced,
  updateRueSynced: mockUpdateRueSynced,
  deleteRueSynced: mockDeleteRueSynced,
}));

vi.mock('../services/importExport', () => ({
  buildImportPreview: vi.fn(),
  downloadFile: vi.fn(),
  personsToCSV: vi.fn(() => ''),
  personsToJSON: vi.fn(() => ''),
  timestampedName: vi.fn(() => 'tri-courrier.csv'),
}));

import DatabasePage from './DatabasePage';

function person(id: string, nom: string, adresse: string, prenom: string | null = null): Person {
  return {
    id,
    nom,
    prenom,
    adresse,
    numeroRue: null,
    rueId: null,
    colonne: 1,
    panneau: null,
    logement: null,
  };
}

const writeMocks = [
  mockAddPersonSynced,
  mockUpdatePersonSynced,
  mockDeletePersonSynced,
  mockBulkAddPersonsSynced,
  mockBulkImportPersonsSynced,
  mockDeleteAllPersonsSynced,
  mockAddRueSynced,
  mockUpdateRueSynced,
  mockDeleteRueSynced,
];

beforeEach(() => {
  mockPersons = [
    person('p1', 'DUPONT', '35 Rue Claude Kogan', 'Jean'),
    person('p2', 'MARTIN', '35 Rue Claude Kogan', 'Sophie'),
    person('p3', 'DUPONT', '37 Rue Claude Kogan', 'Marie'),
    person('p4', 'BERNARD', '8 Rue Victor Hugo', 'Paul'),
  ];
  mockRues = [];
  for (const m of writeMocks) m.mockClear();
});

afterEach(() => {
  cleanup();
});

function openFilter() {
  fireEvent.click(screen.getByRole('button', { name: /adresse/i }));
}

function cardTitles(): string[] {
  return [...document.querySelectorAll('.card-title')].map((el) => el.textContent ?? '');
}

describe('DatabasePage — filtre par adresse complète', () => {
  it('1./2. propose une case par adresse complète distincte (35 et 37 séparés)', () => {
    render(<DatabasePage />);
    openFilter();

    expect(screen.getByLabelText('35 Rue Claude Kogan', { exact: true })).not.toBeNull();
    expect(screen.getByLabelText('37 Rue Claude Kogan', { exact: true })).not.toBeNull();
    expect(screen.getByLabelText('8 Rue Victor Hugo', { exact: true })).not.toBeNull();
  });

  it('3. sélectionner une seule adresse ne montre que ses destinataires', () => {
    render(<DatabasePage />);
    openFilter();
    fireEvent.click(screen.getByLabelText('35 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'APPLIQUER' }));

    expect(cardTitles().sort()).toEqual(['DUPONT Jean', 'MARTIN Sophie']);
    expect(screen.getByRole('button', { name: 'ADRESSE · 1 SÉLECTIONNÉE' })).not.toBeNull();
  });

  it('4. sélectionner plusieurs adresses affiche l’union (35 OU 37)', () => {
    render(<DatabasePage />);
    openFilter();
    fireEvent.click(screen.getByLabelText('35 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByLabelText('37 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'APPLIQUER' }));

    expect(cardTitles().sort()).toEqual(['DUPONT Jean', 'DUPONT Marie', 'MARTIN Sophie']);
    expect(screen.getByRole('button', { name: 'ADRESSES · 2 SÉLECTIONNÉES' })).not.toBeNull();
  });

  it('5. aucune sélection affiche tous les destinataires', () => {
    render(<DatabasePage />);

    expect(cardTitles().sort()).toEqual([
      'BERNARD Paul',
      'DUPONT Jean',
      'DUPONT Marie',
      'MARTIN Sophie',
    ]);
    expect(screen.getByRole('button', { name: 'FILTRER PAR ADRESSE' })).not.toBeNull();
  });

  it('« TOUTES LES ADRESSES » réinitialise immédiatement le filtre', () => {
    render(<DatabasePage />);
    openFilter();
    fireEvent.click(screen.getByLabelText('35 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'APPLIQUER' }));
    expect(cardTitles()).toHaveLength(2);

    openFilter();
    fireEvent.click(screen.getByRole('button', { name: 'TOUTES LES ADRESSES' }));

    expect(cardTitles()).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'FILTRER PAR ADRESSE' })).not.toBeNull();
  });

  it('6. le filtre adresse et la recherche admin fonctionnent ensemble', () => {
    render(<DatabasePage />);
    openFilter();
    fireEvent.click(screen.getByLabelText('35 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'APPLIQUER' }));

    fireEvent.change(screen.getByPlaceholderText(/rechercher/i), { target: { value: 'dupont' } });

    // Uniquement DUPONT Jean : au 35 (filtre) ET nommé DUPONT (recherche).
    // MARTIN Sophie (même adresse) et DUPONT Marie (autre adresse) exclus.
    expect(cardTitles()).toEqual(['DUPONT Jean']);
  });

  it('8. une nouvelle adresse (import/ajout) apparaît immédiatement dans le filtre', () => {
    const { rerender } = render(<DatabasePage />);
    openFilter();
    expect(screen.queryByLabelText('12 Rue Nouvelle', { exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'TOUTES LES ADRESSES' }));

    mockPersons = [...mockPersons, person('p5', 'NOUVEAU', '12 Rue Nouvelle')];
    rerender(<DatabasePage />);

    openFilter();
    expect(screen.getByLabelText('12 Rue Nouvelle', { exact: true })).not.toBeNull();
  });

  it('9./10. une adresse disparue de la base disparaît du filtre, et sa sélection est nettoyée automatiquement', () => {
    const { rerender } = render(<DatabasePage />);
    openFilter();
    fireEvent.click(screen.getByLabelText('37 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'APPLIQUER' }));
    expect(screen.getByRole('button', { name: 'ADRESSE · 1 SÉLECTIONNÉE' })).not.toBeNull();

    // Plus aucun destinataire au 37 (supprimé / modifié).
    mockPersons = mockPersons.filter((p) => p.id !== 'p3');
    rerender(<DatabasePage />);

    // Le filtre fantôme est nettoyé automatiquement : retour à « tous ».
    expect(screen.getByRole('button', { name: 'FILTRER PAR ADRESSE' })).not.toBeNull();
    expect(cardTitles().sort()).toEqual(['BERNARD Paul', 'DUPONT Jean', 'MARTIN Sophie']);

    openFilter();
    expect(screen.queryByLabelText('37 Rue Claude Kogan', { exact: true })).toBeNull();
  });

  it('11. le filtrage n’appelle jamais aucune fonction d’écriture (aucune donnée modifiée)', () => {
    render(<DatabasePage />);
    openFilter();
    fireEvent.click(screen.getByLabelText('35 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByLabelText('37 Rue Claude Kogan', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'APPLIQUER' }));
    fireEvent.change(screen.getByPlaceholderText(/rechercher/i), { target: { value: 'dupont' } });
    openFilter();
    fireEvent.click(screen.getByRole('button', { name: 'TOUTES LES ADRESSES' }));

    for (const m of writeMocks) {
      expect(m).not.toHaveBeenCalled();
    }
  });
});
