import type { Person } from '../types/person';
import type { OcrMatchResult } from './ocrMatch';

/**
 * État d'affichage du mode SCAN, mis à jour à chaque cycle OCR.
 *
 * Règle demandée : une même enveloppe ne doit pas « redéclencher » le même
 * résultat en boucle (pas de scintillement), mais une NOUVELLE enveloppe doit
 * immédiatement produire un nouveau résultat. On tolère aussi quelques cycles
 * de bruit (angle, reflet, main qui bouge) avant d'effacer une carte déjà
 * affichée, pour éviter qu'elle disparaisse à la moindre image ratée.
 */
export interface ScanDisplayState {
  person: Person | null;
  confidence: number | null;
  /** Cycles consécutifs sans correspondance confiante depuis le dernier affichage. */
  missStreak: number;
}

export const INITIAL_SCAN_DISPLAY_STATE: ScanDisplayState = {
  person: null,
  confidence: null,
  missStreak: 0,
};

/** Nombre de cycles OCR sans correspondance avant d'effacer la carte affichée. */
const CLEAR_AFTER_MISSES = 3;

export function nextScanDisplayState(
  current: ScanDisplayState,
  result: OcrMatchResult,
): ScanDisplayState {
  if (result.status === 'match') {
    if (current.person && current.person.id === result.person.id) {
      // Même enveloppe déjà affichée : on rafraîchit juste la confiance, sans
      // « re-déclencher » de nouvel affichage.
      return { person: current.person, confidence: result.confidence, missStreak: 0 };
    }
    // Premier résultat, ou enveloppe différente de celle actuellement affichée
    // (nouvelle enveloppe présentée à la caméra) : nouvel affichage immédiat.
    return { person: result.person, confidence: result.confidence, missStreak: 0 };
  }

  // Cycle sans correspondance confiante ('none' ou 'ambiguous').
  if (!current.person) {
    return { person: null, confidence: null, missStreak: current.missStreak + 1 };
  }
  const missStreak = current.missStreak + 1;
  if (missStreak >= CLEAR_AFTER_MISSES) {
    return { person: null, confidence: null, missStreak };
  }
  return { ...current, missStreak };
}
