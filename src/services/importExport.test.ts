import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Person } from '../types/person';

let mockExistingPersons: Person[] = [];

vi.mock('../db/database', () => ({
  getAllPersons: vi.fn(async () => mockExistingPersons),
}));

import { CSV_HEADER, buildImportPreview, personsToCSV, personsToJSON } from './importExport';

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

describe('buildImportPreview — colonne reexpedition', () => {
  it('ancien CSV sans colonne "reexpedition" -> false', async () => {
    const csv = 'nom,prenom,adresse,colonne,panneau\nDUPONT,Jean,12 Rue Victor Hugo,5,1\n';
    const preview = await buildImportPreview(csvFile(csv));

    expect(preview.validCount).toBe(1);
    expect(preview.toImport[0].reexpedition).toBe(false);
  });

  it('cellule vide -> false', async () => {
    const csv =
      'nom,prenom,adresse,colonne,panneau,reexpedition\nDUPONT,Jean,12 Rue Victor Hugo,5,1,\n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].reexpedition).toBe(false);
  });

  it('"oui" -> true', async () => {
    const csv =
      'nom,prenom,adresse,colonne,panneau,reexpedition\nDUPONT,Jean,12 Rue Victor Hugo,5,1,oui\n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].reexpedition).toBe(true);
  });

  it('"true" -> true', async () => {
    const csv =
      'nom,prenom,adresse,colonne,panneau,reexpedition\nDUPONT,Jean,12 Rue Victor Hugo,5,1,true\n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].reexpedition).toBe(true);
  });

  it('"1" -> true', async () => {
    const csv =
      'nom,prenom,adresse,colonne,panneau,reexpedition\nDUPONT,Jean,12 Rue Victor Hugo,5,1,1\n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].reexpedition).toBe(true);
  });

  it('insensible à la casse et aux espaces ("  OUI  ")', async () => {
    const csv =
      'nom,prenom,adresse,colonne,panneau,reexpedition\nDUPONT,Jean,12 Rue Victor Hugo,5,1,  OUI  \n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].reexpedition).toBe(true);
  });
});

describe('personsToCSV — export', () => {
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
      reexpedition: true,
      remarque: null,
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
      reexpedition: false,
      remarque: 'Boîte au nom de MARTIN',
    },
  ];

  it('8. nouvel en-tête nom,prenom,adresse,panneau,colonne,logement,reexpedition,remarque', () => {
    expect(CSV_HEADER).toBe(
      'nom,prenom,adresse,panneau,colonne,logement,reexpedition,remarque',
    );

    const lines = personsToCSV(persons).trim().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER);
  });

  it('reexpedition = true -> "oui" ; reexpedition = false -> cellule vide ; remarque exportée', () => {
    const lines = personsToCSV(persons).trim().split('\r\n');
    expect(lines[1]).toBe('DUPONT,Jean,12 Rue Victor Hugo,1,5,,oui,');
    expect(lines[2]).toBe('LEROY,,3 Rue des Tilleuls,4,,314,,Boîte au nom de MARTIN');
  });
});

describe('personsToJSON — export', () => {
  it('conserve reexpedition et remarque dans l’export JSON', () => {
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
        reexpedition: true,
        remarque: 'BAL derrière la porte',
      },
    ];
    const parsed = JSON.parse(personsToJSON(persons));
    expect(parsed[0].reexpedition).toBe(true);
    expect(parsed[0].remarque).toBe('BAL derrière la porte');
  });
});

describe('remarque — CSV import/export (échappement correct, pas de split naïf)', () => {
  it('ancien CSV sans colonne "remarque" -> null', async () => {
    const csv = 'nom,prenom,adresse,colonne,panneau\nDUPONT,Jean,12 Rue Victor Hugo,5,1\n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].remarque).toBeNull();
  });

  it('cellule remarque vide -> null', async () => {
    const csv =
      'nom,prenom,adresse,colonne,panneau,remarque\nDUPONT,Jean,12 Rue Victor Hugo,5,1,\n';
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].remarque).toBeNull();
  });

  it('export puis import d’une remarque simple : contenu conservé', async () => {
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
        reexpedition: false,
        remarque: 'Boîte au nom de MARTIN',
      },
    ];
    const csv = personsToCSV(persons);
    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].remarque).toBe('Boîte au nom de MARTIN');
  });

  it('remarque contenant une virgule : échappée à l’export, restituée à l’import', async () => {
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
        reexpedition: false,
        remarque: 'BAL au fond, à droite',
      },
    ];
    const csv = personsToCSV(persons);
    // La cellule contenant une virgule doit être entourée de guillemets.
    expect(csv).toContain('"BAL au fond, à droite"');

    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].remarque).toBe('BAL au fond, à droite');
  });

  it('remarque contenant des guillemets : échappée à l’export, restituée à l’import', async () => {
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
        reexpedition: false,
        remarque: 'Boîte marquée "DUPONT"',
      },
    ];
    const csv = personsToCSV(persons);
    // Guillemets internes doublés, cellule entourée de guillemets.
    expect(csv).toContain('"Boîte marquée ""DUPONT"""');

    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].remarque).toBe('Boîte marquée "DUPONT"');
  });

  it('remarque contenant un retour à la ligne : échappée à l’export, restituée à l’import', async () => {
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
        reexpedition: false,
        remarque: 'BAL derrière la porte\nSonner deux fois',
      },
    ];
    const csv = personsToCSV(persons);
    expect(csv).toContain('"BAL derrière la porte\nSonner deux fois"');

    const preview = await buildImportPreview(csvFile(csv));
    expect(preview.toImport[0].remarque).toBe('BAL derrière la porte\nSonner deux fois');
  });
});
