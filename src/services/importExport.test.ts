import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '../types/person';

let mockExistingPersons: Person[] = [];

vi.mock('../db/database', () => ({
  getAllPersons: vi.fn(async () => mockExistingPersons),
}));

import { CSV_HEADER, buildImportPreview, personsToCSV } from './importExport';

function csvFile(content: string): File {
  return new File([content], 'import.csv', { type: 'text/csv' });
}

beforeEach(() => {
  mockExistingPersons = [];
});

describe('buildImportPreview — compatibilité avec l’ancien format CSV', () => {
  it('6. importe un ancien CSV sans colonne "logement" exactement comme avant', async () => {
    const csv = 'nom,prenom,adresse,colonne,panneau\nDUPONT,Jean,12 Rue Victor Hugo,5,1\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(0);
    const [row] = preview.toImport;
    expect(row.colonne).toBe(5);
    expect(row.panneau).toBe(1);
    expect(row.logement).toBeNull();
  });

  it('accepte aussi l’ancien ordre historique nom,prenom,adresse,panneau,colonne', async () => {
    const csv = 'nom,prenom,adresse,panneau,colonne\nMARTIN,Sophie,4 Avenue de Paris,,2\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.validCount).toBe(1);
    expect(preview.toImport[0]).toMatchObject({ colonne: 2, panneau: null, logement: null });
  });
});

describe('buildImportPreview — nouveau format avec logement', () => {
  it('7. "panneau,colonne,logement" avec colonne vide -> panneau + logement', async () => {
    const csv =
      'nom,prenom,adresse,panneau,colonne,logement\nDUPONT,Jean,35 Rue Claude Kogan,2,,314\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.validCount).toBe(1);
    const [row] = preview.toImport;
    expect(row.panneau).toBe(2);
    expect(row.colonne).toBeNull();
    expect(row.logement).toBe('314');
  });

  it('rejette une ligne avec logement renseigné mais sans panneau', async () => {
    const csv =
      'nom,prenom,adresse,panneau,colonne,logement\nDUPONT,Jean,35 Rue Claude Kogan,,,314\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.invalidCount).toBe(1);
    expect(preview.validCount).toBe(0);
  });

  it('rejette une ligne sans colonne ET sans logement', async () => {
    const csv = 'nom,prenom,adresse,panneau,colonne,logement\nDUPONT,Jean,35 Rue X,2,,\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.invalidCount).toBe(1);
  });

  it('l’ordre des colonnes du fichier est indifférent (lecture par nom d’en-tête)', async () => {
    const csv =
      'logement,nom,colonne,adresse,prenom,panneau\n314,DUPONT,,35 Rue Claude Kogan,Jean,2\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.validCount).toBe(1);
    expect(preview.toImport[0].logement).toBe('314');
    expect(preview.toImport[0].colonne).toBeNull();
  });
});

describe('personsToCSV — export', () => {
  it('8. nouvel en-tête nom,prenom,adresse,panneau,colonne,logement, colonne logement incluse', () => {
    const persons: Person[] = [
      {
        id: '1',
        nom: 'DUPONT',
        prenom: 'Jean',
        adresse: '12 Rue Victor Hugo',
        numeroRue: 12,
        rueId: 'r1',
        colonne: 5,
        panneau: 1,
        logement: null,
      },
      {
        id: '2',
        nom: 'LEROY',
        prenom: null,
        adresse: '3 Rue des Tilleuls',
        numeroRue: 3,
        rueId: 'r2',
        colonne: null,
        panneau: 4,
        logement: '314',
      },
    ];

    expect(CSV_HEADER).toBe('nom,prenom,adresse,panneau,colonne,logement');

    const lines = personsToCSV(persons).trim().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines[1]).toBe('DUPONT,Jean,12 Rue Victor Hugo,1,5,');
    expect(lines[2]).toBe('LEROY,,3 Rue des Tilleuls,4,,314');
  });
});
