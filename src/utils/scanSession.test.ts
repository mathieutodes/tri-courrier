import { describe, expect, it } from 'vitest';
import { INITIAL_SCAN_DISPLAY_STATE, nextScanDisplayState } from './scanSession';
import type { OcrMatchResult } from './ocrMatch';
import type { Person } from '../types/person';

function person(id: string, nom: string): Person {
  return {
    id,
    nom,
    prenom: null,
    adresse: '1 Rue Test',
    numeroRue: null,
    rueId: null,
    colonne: 1,
    panneau: null,
    logement: null,
  };
}

const dupont = person('p1', 'DUPONT');
const martin = person('p2', 'MARTIN');

function matchResult(p: Person, confidence = 0.9): OcrMatchResult {
  return { status: 'match', person: p, confidence, candidates: [{ person: p, confidence, addressConfirmed: true }] };
}

const noneResult: OcrMatchResult = { status: 'none', candidates: [] };
const ambiguousResult: OcrMatchResult = { status: 'ambiguous', candidates: [] };

describe('nextScanDisplayState', () => {
  it('affiche immédiatement un premier résultat trouvé', () => {
    const next = nextScanDisplayState(INITIAL_SCAN_DISPLAY_STATE, matchResult(dupont));
    expect(next.person?.id).toBe('p1');
    expect(next.missStreak).toBe(0);
  });

  it('ne « redéclenche » pas le résultat pour la même enveloppe sur des cycles répétés', () => {
    const first = nextScanDisplayState(INITIAL_SCAN_DISPLAY_STATE, matchResult(dupont, 0.8));
    // Cycle suivant : même personne re-détectée avec une confiance différente.
    const second = nextScanDisplayState(first, matchResult(dupont, 0.95));
    expect(second.person).toBe(first.person); // même référence, pas de nouvel affichage
    expect(second.person?.id).toBe('p1');
  });

  it('affiche une nouvelle enveloppe dès qu’une personne différente est détectée', () => {
    const first = nextScanDisplayState(INITIAL_SCAN_DISPLAY_STATE, matchResult(dupont));
    const second = nextScanDisplayState(first, matchResult(martin));
    expect(second.person?.id).toBe('p2');
    expect(second.missStreak).toBe(0);
  });

  it('conserve la carte affichée pendant quelques cycles sans correspondance (bruit ponctuel)', () => {
    const shown = nextScanDisplayState(INITIAL_SCAN_DISPLAY_STATE, matchResult(dupont));
    const miss1 = nextScanDisplayState(shown, noneResult);
    const miss2 = nextScanDisplayState(miss1, ambiguousResult);
    expect(miss1.person?.id).toBe('p1');
    expect(miss2.person?.id).toBe('p1');
  });

  it('efface la carte après plusieurs cycles consécutifs sans correspondance', () => {
    let state = nextScanDisplayState(INITIAL_SCAN_DISPLAY_STATE, matchResult(dupont));
    for (let i = 0; i < 5; i += 1) {
      state = nextScanDisplayState(state, noneResult);
    }
    expect(state.person).toBeNull();
  });

  it('reste vide si aucune correspondance n’a jamais été trouvée', () => {
    let state = INITIAL_SCAN_DISPLAY_STATE;
    state = nextScanDisplayState(state, noneResult);
    state = nextScanDisplayState(state, ambiguousResult);
    expect(state.person).toBeNull();
    expect(state.missStreak).toBe(2);
  });
});
