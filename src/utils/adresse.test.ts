import { describe, expect, it } from 'vitest';
import { buildAdresse, decomposeAdresse, splitAdresse } from './adresse';
import type { Rue } from '../types/rue';

const rues: Rue[] = [
  { id: 'r1', nom: 'Rue Victor Hugo' },
  { id: 'r2', nom: 'Avenue de Paris' },
];

describe('buildAdresse', () => {
  it('assemble numéro + rue', () => {
    expect(buildAdresse(24, 'Rue Victor Hugo')).toBe('24 Rue Victor Hugo');
    expect(buildAdresse(1, '  Rue   des Lilas ')).toBe('1 Rue des Lilas');
  });
});

describe('decomposeAdresse', () => {
  it('reconnaît "<n> <rue connue>" (insensible casse/accents)', () => {
    expect(decomposeAdresse('24 Rue Victor Hugo', rues)).toEqual({ numeroRue: 24, rueId: 'r1' });
    expect(decomposeAdresse('3 avenue de paris', rues)).toEqual({ numeroRue: 3, rueId: 'r2' });
  });

  it('renvoie null si la rue est inconnue (jamais bloquant)', () => {
    expect(decomposeAdresse('5 Rue Inconnue', rues)).toBeNull();
  });

  it('renvoie null si pas de numéro en tête', () => {
    expect(decomposeAdresse('Rue Victor Hugo', rues)).toBeNull();
    expect(decomposeAdresse('12bis Rue Victor Hugo', rues)).toBeNull();
    expect(decomposeAdresse('', rues)).toBeNull();
  });
});

describe('splitAdresse', () => {
  it('décompose "<n> <rue>" SANS consulter un catalogue (rue inconnue acceptée)', () => {
    expect(splitAdresse('35 Rue Claude Kogan')).toEqual({
      numeroRue: 35,
      rueNom: 'Rue Claude Kogan',
    });
  });

  it('nettoie les espaces superflus du nom de rue obtenu', () => {
    expect(splitAdresse('12   Rue   des   Lilas  ')).toEqual({
      numeroRue: 12,
      rueNom: 'Rue des Lilas',
    });
  });

  it('renvoie null sans numéro en tête, avec bis/ter/lettre, ou adresse vide', () => {
    expect(splitAdresse('Rue Victor Hugo')).toBeNull();
    expect(splitAdresse('12bis Rue Victor Hugo')).toBeNull();
    expect(splitAdresse('12 A Rue Victor Hugo')).not.toBeNull(); // "A Rue..." devient le nom de rue
    expect(splitAdresse('')).toBeNull();
    expect(splitAdresse('0 Rue Victor Hugo')).toBeNull();
  });
});
