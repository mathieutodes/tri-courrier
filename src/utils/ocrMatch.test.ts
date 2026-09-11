import { describe, expect, it } from 'vitest';
import { matchPersonFromOcrText } from './ocrMatch';
import type { Person } from '../types/person';

function person(
  id: string,
  nom: string,
  adresse: string,
  opts: { prenom?: string | null; colonne?: number | null; panneau?: number | null } = {},
): Person {
  return {
    id,
    nom,
    prenom: opts.prenom ?? null,
    adresse,
    numeroRue: null,
    rueId: null,
    colonne: opts.colonne ?? 1,
    panneau: opts.panneau ?? null,
    logement: null,
  };
}

describe('matchPersonFromOcrText', () => {
  it('reconnaît un nom exact, seul destinataire correspondant → match confiant', () => {
    const persons = [person('p1', 'DUPONT', '24 Rue Victor Hugo', { prenom: 'Jean' })];
    const result = matchPersonFromOcrText('M. Jean DUPONT\n24 Rue Victor Hugo\n75000 PARIS', persons);
    expect(result.status).toBe('match');
    if (result.status === 'match') {
      expect(result.person.id).toBe('p1');
      expect(result.confidence).toBeGreaterThan(0.9);
    }
  });

  it('tolère une erreur OCR mineure sur une lettre du nom (ex. 0/O)', () => {
    const persons = [person('p1', 'DUPONT', '24 Rue Victor Hugo')];
    const result = matchPersonFromOcrText('DUP0NT\n24 Rue Victor Hugo', persons);
    expect(result.status).toBe('match');
    if (result.status === 'match') expect(result.person.id).toBe('p1');
  });

  it('ne matche rien pour un texte OCR sans rapport avec la base locale', () => {
    const persons = [person('p1', 'DUPONT', '24 Rue Victor Hugo')];
    const result = matchPersonFromOcrText('ARTICLE 12 DU REGLEMENT INTERIEUR', persons);
    expect(result.status).toBe('none');
  });

  it('texte vide → aucune correspondance', () => {
    const persons = [person('p1', 'DUPONT', '24 Rue Victor Hugo')];
    expect(matchPersonFromOcrText('', persons).status).toBe('none');
    expect(matchPersonFromOcrText('   ', persons).status).toBe('none');
  });

  it('deux homonymes, adresse absente du texte OCR → ambiguïté (aucun choix arbitraire)', () => {
    const persons = [
      person('p1', 'MARTIN', '5 Rue de la Paix'),
      person('p2', 'MARTIN', '18 Avenue des Fleurs'),
    ];
    const result = matchPersonFromOcrText('MARTIN', persons);
    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') {
      expect(result.candidates.map((c) => c.person.id).sort()).toEqual(['p1', 'p2']);
    }
  });

  it('deux homonymes, l’adresse OCR désambiguïse le bon destinataire', () => {
    const persons = [
      person('p1', 'MARTIN', '5 Rue de la Paix'),
      person('p2', 'MARTIN', '18 Avenue des Fleurs'),
    ];
    const result = matchPersonFromOcrText('MARTIN\n18 Avenue des Fleurs\n75000 PARIS', persons);
    expect(result.status).toBe('match');
    if (result.status === 'match') expect(result.person.id).toBe('p2');
  });

  it('ne confond pas un numéro de rue avec un sous-nombre (12 ne matche pas dans 123)', () => {
    const persons = [
      person('p1', 'MARTIN', '12 Rue de la Paix'),
      person('p2', 'MARTIN', '123 Rue de la Paix'),
    ];
    const result = matchPersonFromOcrText('MARTIN\n123 Rue de la Paix', persons);
    expect(result.status).toBe('match');
    if (result.status === 'match') expect(result.person.id).toBe('p2');
  });

  it('reconnaît l’ordre "Prénom NOM" comme "NOM Prénom"', () => {
    const persons = [person('p1', 'BERNARD', '3 Impasse des Lilas', { prenom: 'Alice' })];
    const result = matchPersonFromOcrText('Alice BERNARD\n3 Impasse des Lilas', persons);
    expect(result.status).toBe('match');
    if (result.status === 'match') expect(result.person.id).toBe('p1');
  });

  it('ignore les accents et la casse (réutilise normalizeText)', () => {
    const persons = [person('p1', 'Lefèvre', '9 Rue André')];
    const result = matchPersonFromOcrText('LEFEVRE\n9 rue andre', persons);
    expect(result.status).toBe('match');
    if (result.status === 'match') expect(result.person.id).toBe('p1');
  });

  it('un nom très court (<=3 lettres) exige une correspondance exacte, sans tolérance floue', () => {
    const persons = [person('p1', 'LY', '1 Rue Basse')];
    // "LY" -> "LX" : une seule lettre différente mais nom trop court pour la tolérance floue.
    const result = matchPersonFromOcrText('LX\n1 Rue Basse', persons);
    expect(result.status).toBe('none');
  });
});
