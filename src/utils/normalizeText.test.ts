import { describe, expect, it } from 'vitest';
import { normalizeText } from './normalizeText';

describe('normalizeText', () => {
  it('met en minuscules', () => {
    expect(normalizeText('DUPONT')).toBe('dupont');
  });

  it('supprime les accents', () => {
    expect(normalizeText('Dùpont')).toBe('dupont');
    expect(normalizeText('DUPRÉ')).toBe('dupre');
  });

  it('supprime les espaces superflus', () => {
    expect(normalizeText('  DUPONT  ')).toBe('dupont');
    expect(normalizeText('DE  LA  TOUR')).toBe('de la tour');
  });

  it('considère les variantes comme équivalentes', () => {
    const variants = ['DUPONT', 'dupont', 'Dupont', 'Dùpont', ' DUPONT '];
    const normalized = variants.map(normalizeText);
    expect(new Set(normalized).size).toBe(1);
  });

  it('gère null / undefined / vide', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText('')).toBe('');
  });

  it('permet la recherche par préfixe', () => {
    const q = normalizeText('DUP');
    expect(normalizeText('DUPONT').includes(q)).toBe(true);
    expect(normalizeText('DUPUIS').includes(q)).toBe(true);
    expect(normalizeText('MARTIN').includes(q)).toBe(false);
  });

  it('unifie les apostrophes droites et typographiques', () => {
    // U+0027 (droite, celle du clavier) vs U+2019 (typographique, celle que
    // le clavier iOS/Safari substitue automatiquement à la saisie).
    expect(normalizeText("Rue de l'Église")).toBe(normalizeText('Rue de l’Église'));
    expect(normalizeText("Galerie de l'Arlequin")).toBe(normalizeText('Galerie de l’Arlequin'));
  });

  it('unifie aussi les autres variantes d’apostrophe (‘ ‛ ʼ ` )', () => {
    const variants = ["l'eglise", 'l’eglise', 'l‘eglise', 'l‛eglise', 'lʼeglise', 'l`eglise'];
    const normalized = variants.map(normalizeText);
    expect(new Set(normalized).size).toBe(1);
  });

  it('déplie les ligatures œ/æ (non décomposées par la normalisation des accents)', () => {
    expect(normalizeText('Rue du Bœuf')).toBe(normalizeText('Rue du Boeuf'));
    expect(normalizeText('Cœur')).toBe('coeur');
  });

  it('ne rapproche jamais deux mots simplement parce qu’ils se ressemblent', () => {
    // Garde-fou : l’unification de l’apostrophe ne doit jamais faire
    // disparaître de vraies différences entre deux rues distinctes.
    expect(normalizeText("Rue de l'Église")).not.toBe(normalizeText('Rue de la Poste'));
    expect(normalizeText('Rue Claude Kogan')).not.toBe(normalizeText('Avenue Claude Kogan'));
  });
});
