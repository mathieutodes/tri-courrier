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
});
