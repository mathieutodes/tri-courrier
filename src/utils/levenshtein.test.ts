import { describe, expect, it } from 'vitest';
import { levenshteinDistance } from './levenshtein';

describe('levenshteinDistance', () => {
  it('vaut 0 pour deux chaînes identiques', () => {
    expect(levenshteinDistance('dupont', 'dupont')).toBe(0);
  });

  it('vaut la longueur de l’autre chaîne quand une chaîne est vide', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('compte une substitution unique', () => {
    expect(levenshteinDistance('dupont', 'dup0nt')).toBe(1);
  });

  it('compte une insertion et une suppression', () => {
    expect(levenshteinDistance('dupont', 'duponts')).toBe(1);
    expect(levenshteinDistance('duponts', 'dupont')).toBe(1);
  });

  it('cumule plusieurs erreurs', () => {
    expect(levenshteinDistance('martin', 'martln')).toBe(1);
    expect(levenshteinDistance('martin', 'mart1n')).toBe(1);
    expect(levenshteinDistance('bernard', 'bemrd')).toBeGreaterThanOrEqual(2);
  });
});
