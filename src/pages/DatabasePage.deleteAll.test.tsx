// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Person } from '../types/person';
import type { Rue } from '../types/rue';

/**
 * Ces tests isolent DatabasePage de la couche de stockage réelle : les stores
 * (`personStore` / `rueStore`) et l'import/export sont simulés, afin de
 * vérifier uniquement le COMPORTEMENT UI de la « Zone dangereuse » :
 * - le bouton final reste désactivé tant que la case n'est pas cochée
 * - ANNULER ne supprime rien
 * - la confirmation appelle bien `deleteAllPersonsSynced()`
 *
 * Les variables référencées dans les factories `vi.mock` sont préfixées par
 * `mock` : c'est la convention exigée par Vitest pour être accessibles depuis
 * une factory hoistée (sinon : "Cannot access before initialization").
 */

let mockPersons: Person[] = [];
let mockRues: Rue[] = [];
// `vi.hoisted` : seul moyen fiable de créer un mock utilisable depuis une
// factory `vi.mock` (elles-mêmes hoistées au tout début du fichier).
const { mockDeleteAllPersonsSynced } = vi.hoisted(() => ({
  mockDeleteAllPersonsSynced: vi.fn(async () => {}),
}));

vi.mock('../App', () => ({
  navigate: vi.fn(),
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
  deleteAllPersonsSynced: mockDeleteAllPersonsSynced,
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

function person(id: string, nom: string): Person {
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
  };
}

function openDeleteAllModal() {
  render(<DatabasePage />);
  fireEvent.click(screen.getByRole('button', { name: /supprimer tous les destinataires/i }));
}

function getCheckbox() {
  return screen.getByRole('checkbox', {
    name: /je confirme vouloir supprimer tous les destinataires/i,
  }) as HTMLInputElement;
}

function getConfirmButton() {
  return screen.getByRole('button', { name: /^supprimer définitivement$/i }) as HTMLButtonElement;
}

beforeEach(() => {
  mockPersons = [person('p1', 'DUPONT'), person('p2', 'MARTIN')];
  mockRues = [];
  mockDeleteAllPersonsSynced.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('DatabasePage — Zone dangereuse : suppression de tous les destinataires', () => {
  it('le bouton SUPPRIMER DÉFINITIVEMENT est désactivé tant que la case n’est pas cochée', () => {
    openDeleteAllModal();
    expect(getConfirmButton().disabled).toBe(true);
  });

  it('devient cliquable une fois la case cochée', () => {
    openDeleteAllModal();
    fireEvent.click(getCheckbox());
    expect(getConfirmButton().disabled).toBe(false);
  });

  it('se redésactive si la case est décochée', () => {
    openDeleteAllModal();
    const checkbox = getCheckbox();
    fireEvent.click(checkbox);
    expect(getConfirmButton().disabled).toBe(false);
    fireEvent.click(checkbox);
    expect(getConfirmButton().disabled).toBe(true);
  });

  it('ANNULER ferme la modale sans rien supprimer', () => {
    openDeleteAllModal();
    fireEvent.click(getCheckbox());
    fireEvent.click(screen.getByRole('button', { name: /^annuler$/i }));

    expect(mockDeleteAllPersonsSynced).not.toHaveBeenCalled();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('un simple clic sur le bouton d’ouverture ne supprime rien (ouvre seulement la modale)', () => {
    render(<DatabasePage />);
    fireEvent.click(screen.getByRole('button', { name: /supprimer tous les destinataires/i }));

    expect(mockDeleteAllPersonsSynced).not.toHaveBeenCalled();
    expect(getCheckbox()).not.toBeNull();
  });

  it('confirme la suppression uniquement après avoir coché la case', async () => {
    openDeleteAllModal();
    fireEvent.click(getCheckbox());
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(mockDeleteAllPersonsSynced).toHaveBeenCalledTimes(1));
  });

  it('le bouton d’ouverture est désactivé si la base est déjà vide', () => {
    mockPersons = [];
    render(<DatabasePage />);
    const openBtn = screen.getByRole('button', {
      name: /supprimer tous les destinataires/i,
    }) as HTMLButtonElement;
    expect(openBtn.disabled).toBe(true);
  });

  it('13. fonctionne aussi avec un mélange colonne / panneau+logement (aucune régression)', async () => {
    mockPersons = [
      person('p1', 'DUPONT'), // colonne (via le helper)
      { ...person('p2', 'LEROY'), colonne: null, panneau: 4, logement: '314' },
    ];
    openDeleteAllModal();
    fireEvent.click(getCheckbox());
    fireEvent.click(getConfirmButton());

    await waitFor(() => expect(mockDeleteAllPersonsSynced).toHaveBeenCalledTimes(1));
  });

  it('affiche le badge RÉEXPÉDITION uniquement pour les destinataires concernés', () => {
    mockPersons = [
      { ...person('p1', 'DUPONT'), reexpedition: true },
      { ...person('p2', 'MARTIN'), reexpedition: false },
    ];
    render(<DatabasePage />);

    expect(screen.getAllByText('RÉEXPÉDITION')).toHaveLength(1);
  });
});
