import { describe, expect, it } from 'vitest';
import {
  parseColonne,
  parseLogement,
  parseNumero,
  parsePanneau,
  parseReexpedition,
  parseRemarque,
  validatePerson,
  validatePersonForm,
} from './validation';
import type { Rue } from '../types/rue';

describe('parseColonne', () => {
  it('accepte 1 à 16', () => {
    expect(parseColonne('1')).toBe(1);
    expect(parseColonne('16')).toBe(16);
    expect(parseColonne(' 5 ')).toBe(5);
  });

  it('refuse hors plage', () => {
    expect(parseColonne('0')).toBeNull();
    expect(parseColonne('17')).toBeNull();
    expect(parseColonne('-3')).toBeNull();
  });

  it('refuse les valeurs non entières ou vides', () => {
    expect(parseColonne('')).toBeNull();
    expect(parseColonne('abc')).toBeNull();
    expect(parseColonne('5.5')).toBeNull();
  });
});

describe('parsePanneau', () => {
  it('accepte vide (facultatif)', () => {
    expect(parsePanneau('')).toEqual({ ok: true, value: null });
  });

  it('accepte un entier positif', () => {
    expect(parsePanneau('2')).toEqual({ ok: true, value: 2 });
  });

  it('refuse 0, négatif ou non entier', () => {
    expect(parsePanneau('0').ok).toBe(false);
    expect(parsePanneau('-1').ok).toBe(false);
    expect(parsePanneau('1.5').ok).toBe(false);
  });
});

describe('parseNumero', () => {
  it('accepte un entier strictement positif', () => {
    expect(parseNumero('24')).toBe(24);
    expect(parseNumero(' 1 ')).toBe(1);
  });

  it('refuse 0, négatif, vide, non entier', () => {
    expect(parseNumero('0')).toBeNull();
    expect(parseNumero('-3')).toBeNull();
    expect(parseNumero('')).toBeNull();
    expect(parseNumero('12.5')).toBeNull();
  });

  it('refuse bis / ter / lettres', () => {
    expect(parseNumero('12bis')).toBeNull();
    expect(parseNumero('12 ter')).toBeNull();
    expect(parseNumero('12A')).toBeNull();
  });
});

describe('parseLogement', () => {
  it('accepte du texte court alphanumérique', () => {
    expect(parseLogement('314')).toBe('314');
    expect(parseLogement('A12')).toBe('A12');
    expect(parseLogement('12B')).toBe('12B');
  });

  it('normalise les espaces superflus', () => {
    expect(parseLogement('  314  ')).toBe('314');
    expect(parseLogement('A   12')).toBe('A 12');
  });

  it('renvoie null si vide (facultatif)', () => {
    expect(parseLogement('')).toBeNull();
    expect(parseLogement('   ')).toBeNull();
  });
});

describe('validatePerson (CSV — adresse libre)', () => {
  const base = {
    nom: 'DUPONT',
    prenom: 'Jean',
    adresse: '12 rue Victor Hugo',
    colonne: '5',
    panneau: '1',
    logement: '',
    reexpedition: '',
    remarque: '',
  };

  it('1. colonne uniquement : valide (numeroRue / rueId / logement null)', () => {
    const r = validatePerson({ ...base, panneau: '' });
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '12 rue Victor Hugo',
      numeroRue: null,
      rueId: null,
      colonne: 5,
      panneau: null,
      logement: null,
      reexpedition: false,
      remarque: null,
    });
  });

  it('2. panneau + colonne : valide', () => {
    const r = validatePerson(base);
    expect(r.valid).toBe(true);
    expect(r.value?.colonne).toBe(5);
    expect(r.value?.panneau).toBe(1);
    expect(r.value?.logement).toBeNull();
  });

  it('3. panneau + logement (sans colonne) : valide', () => {
    const r = validatePerson({ ...base, colonne: '', panneau: '2', logement: '314' });
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '12 rue Victor Hugo',
      numeroRue: null,
      rueId: null,
      colonne: null,
      panneau: 2,
      logement: '314',
      reexpedition: false,
      remarque: null,
    });
  });

  it('4. logement sans panneau : refusé', () => {
    const r = validatePerson({ ...base, colonne: '', panneau: '', logement: '314' });
    expect(r.valid).toBe(false);
    expect(r.errors.panneau).toBeDefined();
  });

  it('5. ni colonne ni logement : refusé', () => {
    const r = validatePerson({ ...base, colonne: '', panneau: '', logement: '' });
    expect(r.valid).toBe(false);
    expect(r.errors.colonne).toBeDefined();
  });

  it('exige le nom', () => {
    expect(validatePerson({ ...base, nom: '   ' }).errors.nom).toBeDefined();
  });

  it('exige l’adresse', () => {
    expect(validatePerson({ ...base, adresse: '' }).errors.adresse).toBeDefined();
  });

  it('rejette une colonne hors 1..16', () => {
    expect(validatePerson({ ...base, colonne: '20' }).errors.colonne).toBeDefined();
  });

  it('accepte sans prénom ni panneau (colonne seule)', () => {
    const r = validatePerson({ ...base, prenom: '', panneau: '' });
    expect(r.valid).toBe(true);
    expect(r.value?.prenom).toBeNull();
    expect(r.value?.panneau).toBeNull();
  });

  it('normalise les espaces du logement', () => {
    const r = validatePerson({ ...base, colonne: '', panneau: '2', logement: '  314  ' });
    expect(r.value?.logement).toBe('314');
  });
});

describe('validatePersonForm (numéro + rue + mode colonne/logement)', () => {
  const rues: Rue[] = [
    { id: 'r1', nom: 'Rue Victor Hugo' },
    { id: 'r2', nom: 'Avenue de Paris' },
  ];
  const base = {
    nom: 'DUPONT',
    prenom: 'Jean',
    numero: '24',
    rueId: 'r1',
    mode: 'colonne' as const,
    colonne: '5',
    panneau: '1',
    logement: '',
    reexpedition: false,
    remarque: '',
  };

  it('mode colonne : construit l’adresse et renseigne numeroRue / rueId, logement null', () => {
    const r = validatePersonForm(base, rues);
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '24 Rue Victor Hugo',
      numeroRue: 24,
      rueId: 'r1',
      colonne: 5,
      panneau: 1,
      logement: null,
      reexpedition: false,
      remarque: null,
    });
  });

  it('mode colonne : exige un numéro entier strictement positif', () => {
    expect(validatePersonForm({ ...base, numero: '0' }, rues).errors.numero).toBeDefined();
    expect(validatePersonForm({ ...base, numero: '12bis' }, rues).errors.numero).toBeDefined();
  });

  it('mode colonne : exige une rue existante', () => {
    expect(validatePersonForm({ ...base, rueId: '' }, rues).errors.rueId).toBeDefined();
    expect(validatePersonForm({ ...base, rueId: 'inconnue' }, rues).errors.rueId).toBeDefined();
  });

  it('mode colonne : colonne entre 1 et 16, panneau facultatif', () => {
    expect(validatePersonForm({ ...base, colonne: '17' }, rues).errors.colonne).toBeDefined();
    const r = validatePersonForm({ ...base, panneau: '' }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.panneau).toBeNull();
  });

  it('3. mode logement : panneau + logement valides -> colonne null', () => {
    const r = validatePersonForm(
      { ...base, mode: 'logement', colonne: '', panneau: '2', logement: '314' },
      rues,
    );
    expect(r.valid).toBe(true);
    expect(r.value).toEqual({
      nom: 'DUPONT',
      prenom: 'Jean',
      adresse: '24 Rue Victor Hugo',
      numeroRue: 24,
      rueId: 'r1',
      colonne: null,
      panneau: 2,
      logement: '314',
      reexpedition: false,
      remarque: null,
    });
  });

  it('4. mode logement : logement sans panneau -> refusé', () => {
    const r = validatePersonForm(
      { ...base, mode: 'logement', colonne: '', panneau: '', logement: '314' },
      rues,
    );
    expect(r.valid).toBe(false);
    expect(r.errors.panneau).toBeDefined();
  });

  it('5. mode logement : logement manquant -> refusé (aucune localisation)', () => {
    const r = validatePersonForm(
      { ...base, mode: 'logement', colonne: '', panneau: '2', logement: '' },
      rues,
    );
    expect(r.valid).toBe(false);
    expect(r.errors.logement).toBeDefined();
  });

  it('mode logement : n’envoie jamais de colonne (exclusivité colonne/logement du formulaire)', () => {
    const r = validatePersonForm(
      { ...base, mode: 'logement', colonne: '9', panneau: '2', logement: 'A12' },
      rues,
    );
    expect(r.valid).toBe(true);
    expect(r.value?.colonne).toBeNull();
    expect(r.value?.logement).toBe('A12');
  });

  it('accepte un logement alphanumérique avec espaces normalisés', () => {
    const r = validatePersonForm(
      { ...base, mode: 'logement', colonne: '', panneau: '3', logement: '  A 12  ' },
      rues,
    );
    expect(r.valid).toBe(true);
    expect(r.value?.logement).toBe('A 12');
  });

  it('mode colonne : la case Réexpédition cochée passe reexpedition = true', () => {
    const r = validatePersonForm({ ...base, reexpedition: true }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.reexpedition).toBe(true);
  });

  it('modification true -> false : la case décochée repasse reexpedition = false', () => {
    const r = validatePersonForm({ ...base, reexpedition: false }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.reexpedition).toBe(false);
  });

  it('création avec remarque : conservée telle quelle (espaces début/fin retirés)', () => {
    const r = validatePersonForm({ ...base, remarque: '  Boîte au nom de MARTIN  ' }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.remarque).toBe('Boîte au nom de MARTIN');
  });

  it('modification d’une remarque existante', () => {
    const r = validatePersonForm({ ...base, remarque: 'BAL derrière la porte' }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.remarque).toBe('BAL derrière la porte');
  });

  it('suppression d’une remarque (champ vidé) -> null', () => {
    const r = validatePersonForm({ ...base, remarque: '' }, rues);
    expect(r.valid).toBe(true);
    expect(r.value?.remarque).toBeNull();
  });

  it('ne transforme jamais la remarque en majuscules', () => {
    const r = validatePersonForm({ ...base, remarque: 'Nom effacé sur la boîte' }, rues);
    expect(r.value?.remarque).toBe('Nom effacé sur la boîte');
  });
});

describe('parseRemarque', () => {
  it('supprime uniquement les espaces au début/à la fin', () => {
    expect(parseRemarque('  Boîte au nom de MARTIN  ')).toBe('Boîte au nom de MARTIN');
  });

  it('conserve les espaces/retours à la ligne internes (contrairement à cleanStored)', () => {
    expect(parseRemarque('BAL  derrière\nla porte')).toBe('BAL  derrière\nla porte');
  });

  it('vide ou absente -> null', () => {
    expect(parseRemarque('')).toBeNull();
    expect(parseRemarque('   ')).toBeNull();
    expect(parseRemarque(undefined)).toBeNull();
  });

  it('ne modifie jamais la casse', () => {
    expect(parseRemarque('Nom effacé sur la boîte')).toBe('Nom effacé sur la boîte');
  });

  it('conserve accents et apostrophes', () => {
    expect(parseRemarque("BAL derrière la porte, à l'étage")).toBe(
      "BAL derrière la porte, à l'étage",
    );
  });
});

describe('parseReexpedition', () => {
  it('reconnaît "oui", "true", "1" (insensible à la casse et aux espaces)', () => {
    expect(parseReexpedition('oui')).toBe(true);
    expect(parseReexpedition('OUI')).toBe(true);
    expect(parseReexpedition('  oui  ')).toBe(true);
    expect(parseReexpedition('true')).toBe(true);
    expect(parseReexpedition('TRUE')).toBe(true);
    expect(parseReexpedition('1')).toBe(true);
  });

  it('cellule vide ou colonne absente -> false', () => {
    expect(parseReexpedition('')).toBe(false);
    expect(parseReexpedition(undefined)).toBe(false);
    expect(parseReexpedition('   ')).toBe(false);
  });

  it('toute autre valeur -> false (jamais bloquant)', () => {
    expect(parseReexpedition('non')).toBe(false);
    expect(parseReexpedition('0')).toBe(false);
    expect(parseReexpedition('n’importe quoi')).toBe(false);
  });
});

describe('validatePersonForm — legacyAddress (protection contre la perte silencieuse de données)', () => {
  const rues: Rue[] = [{ id: 'r1', nom: 'Rue Victor Hugo' }];
  const baseUnresolved = {
    nom: 'DUPONT',
    prenom: 'Jean',
    numero: '', // rue jamais résolue -> numéro non plus affiché
    rueId: '', // select resté sur "— Choisir une rue —"
    mode: 'colonne' as const,
    colonne: '5',
    panneau: '',
    logement: '',
    reexpedition: false,
    remarque: '',
  };
  const legacyAddress = { adresse: '35 Rue Claude Kogan', numeroRue: 35, rueId: null };

  it('rue non résolue + legacyAddress fourni : enregistre sans exiger de rue, adresse/numeroRue préservés', () => {
    const r = validatePersonForm(
      { ...baseUnresolved, remarque: 'Boîte derrière la porte' },
      rues,
      legacyAddress,
    );
    expect(r.valid).toBe(true);
    expect(r.value?.adresse).toBe('35 Rue Claude Kogan');
    expect(r.value?.numeroRue).toBe(35);
    expect(r.value?.rueId).toBeNull();
    expect(r.value?.remarque).toBe('Boîte derrière la porte');
    expect(r.errors.rueId).toBeUndefined();
    expect(r.errors.numero).toBeUndefined();
  });

  it('rue non résolue SANS legacyAddress (comportement normal, inchangé) : rue obligatoire', () => {
    const r = validatePersonForm(baseUnresolved, rues);
    expect(r.valid).toBe(false);
    expect(r.errors.rueId).toBeDefined();
  });

  it('rue effectivement choisie : legacyAddress est ignoré, adresse reconstruite normalement', () => {
    const r = validatePersonForm(
      { ...baseUnresolved, numero: '24', rueId: 'r1' },
      rues,
      legacyAddress,
    );
    expect(r.valid).toBe(true);
    expect(r.value?.adresse).toBe('24 Rue Victor Hugo');
    expect(r.value?.rueId).toBe('r1');
  });

  it('legacyAddress avec rueId déjà null (très ancienne fiche) : préservé tel quel, sans jamais devenir une rue inventée', () => {
    const r = validatePersonForm(baseUnresolved, rues, {
      adresse: '80 Avenue de Constantine',
      numeroRue: null,
      rueId: null,
    });
    expect(r.valid).toBe(true);
    expect(r.value?.adresse).toBe('80 Avenue de Constantine');
    expect(r.value?.numeroRue).toBeNull();
    expect(r.value?.rueId).toBeNull();
  });
});
