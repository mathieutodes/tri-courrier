// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
let mockRues: Rue[] = [];
// Contrôlé par certains tests pour simuler un chargement des rues RETARDÉ
// (store pas encore prêt au moment où `editPersonId` est déjà exploitable) —
// voir describe « chargement des rues retardé » plus bas.
let mockRuesLoaded = true;
// `vi.hoisted` : seul moyen fiable de créer un mock utilisable depuis une
// factory `vi.mock` (elles-mêmes hoistées au tout début du fichier).
const { mockNavigate, mockUpdatePersonSynced } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUpdatePersonSynced: vi.fn(async (_person: Person) => {}),
}));

vi.mock('../App', () => ({
  navigate: mockNavigate,
}));

vi.mock('../db/personStore', () => ({
  usePersons: () => mockPersons,
  arePersonsLoaded: () => true,
  ensurePersonsLoaded: vi.fn(),
  refreshPersons: vi.fn(async () => {}),
  addPersonSynced: vi.fn(async () => {}),
  updatePersonSynced: mockUpdatePersonSynced,
  deletePersonSynced: vi.fn(async () => {}),
  bulkAddPersonsSynced: vi.fn(async () => 0),
  deleteAllPersonsSynced: vi.fn(async () => {}),
}));

vi.mock('../db/rueStore', () => ({
  useRues: () => mockRues,
  areRuesLoaded: () => mockRuesLoaded,
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
  mockUpdatePersonSynced.mockClear();
  mockRues = [];
  mockRuesLoaded = true;
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

  it('positionne la vue sur la textarea Remarque à l’ouverture, SANS lui donner le focus (l’utilisateur la touche lui-même)', () => {
    const scrollIntoViewSpy = vi.fn();
    HTMLTextAreaElement.prototype.scrollIntoView = scrollIntoViewSpy;
    const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');

    mockPersons = [person('p1', 'DUPONT')];
    render(<DatabasePage editPersonId="p1" />);

    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByLabelText(/remarque/i));

    focusSpy.mockRestore();
    // @ts-expect-error nettoyage du polyfill de test (absent par défaut de jsdom)
    delete HTMLTextAreaElement.prototype.scrollIntoView;
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

describe('BUG 1 — régression : APPORTER UNE PRÉCISION ne doit jamais altérer la rue existante', () => {
  const rue: Rue = { id: 'r1', nom: 'Rue Claude Kogan' };

  function existingPerson(): Person {
    return person('p1', 'DUPONT', {
      prenom: 'Jean',
      adresse: '35 Rue Claude Kogan',
      numeroRue: 35,
      rueId: 'r1',
      colonne: 4,
      panneau: 2,
      logement: null,
      remarque: null,
    });
  }

  it('1-5. la rue existante reste sélectionnée, numeroRue/rueId/adresse inchangés — modifier uniquement Remarque ne touche aucun autre champ', async () => {
    mockPersons = [existingPerson()];
    mockRues = [rue];
    mockRuesLoaded = true;
    render(<DatabasePage editPersonId="p1" />);

    // La bonne personne, avec sa rue déjà résolue dans le select (jamais vide).
    expect(screen.getByText('Modifier une personne')).not.toBeNull();
    const rueSelect = screen.getByLabelText(/^rue/i) as HTMLSelectElement;
    expect(rueSelect.value).toBe('r1');
    expect((screen.getByLabelText(/numéro \*/i) as HTMLInputElement).value).toBe('35');
    expect((screen.getByLabelText(/colonne \*/i) as HTMLInputElement).value).toBe('4');
    expect((screen.getByLabelText(/panneau/i) as HTMLInputElement).value).toBe('2');

    // On ne touche QUE la remarque.
    fireEvent.change(screen.getByLabelText(/remarque/i), {
      target: { value: 'Boîte derrière la porte' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(mockUpdatePersonSynced).toHaveBeenCalledTimes(1);
    const saved = mockUpdatePersonSynced.mock.calls[0][0] as Person;
    expect(saved.id).toBe('p1');
    expect(saved.adresse).toBe('35 Rue Claude Kogan');
    expect(saved.numeroRue).toBe(35);
    expect(saved.rueId).toBe('r1');
    expect(saved.panneau).toBe(2);
    expect(saved.colonne).toBe(4);
    expect(saved.remarque).toBe('Boîte derrière la porte');
  });
});

describe('BUG 1 — chargement des rues retardé', () => {
  const rue: Rue = { id: 'r1', nom: 'Rue Claude Kogan' };

  function existingPerson(): Person {
    return person('p1', 'DUPONT', {
      adresse: '35 Rue Claude Kogan',
      numeroRue: 35,
      rueId: 'r1',
      colonne: 4,
      panneau: 2,
    });
  }

  it("n'ouvre pas la fiche tant que le store des rues n'a pas fini de charger (persons prêt, rues pas encore)", () => {
    mockPersons = [existingPerson()];
    mockRues = []; // store des rues encore vide
    mockRuesLoaded = false; // ... et pas encore chargé (pas juste "chargé et vide")
    render(<DatabasePage editPersonId="p1" />);

    // On reste sur la liste : jamais de PersonForm monté avec une liste de
    // rues incomplète.
    expect(screen.queryByText('Modifier une personne')).toBeNull();
  });

  it('ouvre la fiche avec la rue correctement sélectionnée dès que le chargement des rues se termine', () => {
    mockPersons = [existingPerson()];
    mockRues = [];
    mockRuesLoaded = false;
    const { rerender } = render(<DatabasePage editPersonId="p1" />);
    expect(screen.queryByText('Modifier une personne')).toBeNull();

    // Le chargement des rues se termine (même principe que `refreshRues()`
    // qui met à jour le cache puis notifie les abonnés -> nouveau rendu).
    mockRues = [rue];
    mockRuesLoaded = true;
    rerender(<DatabasePage editPersonId="p1" />);

    expect(screen.getByText('Modifier une personne')).not.toBeNull();
    const rueSelect = screen.getByLabelText(/^rue/i) as HTMLSelectElement;
    expect(rueSelect.value).toBe('r1');
  });
});
