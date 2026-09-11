// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SearchResultView from './SearchResultView';
import type { Person } from '../types/person';

function person(overrides: Partial<Person>): Person {
  return {
    id: 'p1',
    nom: 'DUPONT',
    prenom: 'Jean',
    adresse: '12 Rue Victor Hugo',
    numeroRue: 12,
    rueId: 'r1',
    colonne: null,
    panneau: null,
    logement: null,
    reexpedition: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('SearchResultView', () => {
  it('cas 1 — colonne uniquement : COLONNE affichée, pas de PANNEAU', () => {
    render(<SearchResultView person={person({ colonne: 5 })} onNewSearch={() => {}} />);
    expect(screen.getByText('COLONNE')).not.toBeNull();
    expect(screen.getByText('5')).not.toBeNull();
    expect(screen.queryByText('PANNEAU')).toBeNull();
    expect(screen.queryByText('LOGEMENT')).toBeNull();
  });

  it('cas 2 — panneau + colonne : les deux affichés, même structure de figure', () => {
    render(
      <SearchResultView person={person({ colonne: 5, panneau: 2 })} onNewSearch={() => {}} />,
    );
    expect(screen.getByText('PANNEAU')).not.toBeNull();
    expect(screen.getByText('COLONNE')).not.toBeNull();
    expect(screen.getByText('2')).not.toBeNull();
    expect(screen.getByText('5')).not.toBeNull();

    // Couleur de colonne utilisée comme accent.
    const card = document.querySelector('.result-card') as HTMLElement;
    expect(card.style.getPropertyValue('--accent')).not.toBe('');
  });

  it('11. cas 3 — panneau + logement : LOGEMENT affiché, jamais COLONNE, aucune couleur inventée', () => {
    render(
      <SearchResultView
        person={person({ colonne: null, panneau: 2, logement: '314' })}
        onNewSearch={() => {}}
      />,
    );
    expect(screen.getByText('PANNEAU')).not.toBeNull();
    expect(screen.getByText('LOGEMENT')).not.toBeNull();
    expect(screen.getByText('2')).not.toBeNull();
    expect(screen.getByText('314')).not.toBeNull();
    expect(screen.queryByText('COLONNE')).toBeNull();

    // Pas de colonne -> pas de couleur de colonne injectée (style dark neutre).
    const card = document.querySelector('.result-card') as HTMLElement;
    expect(card.style.getPropertyValue('--accent')).toBe('');
  });

  it('sans panneau ni colonne, un logement seul reste affiché (défensif, ne casse jamais l’écran)', () => {
    render(
      <SearchResultView
        person={person({ colonne: null, panneau: null, logement: '314' })}
        onNewSearch={() => {}}
      />,
    );
    expect(screen.getByText('LOGEMENT')).not.toBeNull();
    expect(screen.getByText('314')).not.toBeNull();
  });

  it('affiche le nom complet et un bouton NOUVELLE RECHERCHE', () => {
    render(<SearchResultView person={person({ colonne: 5 })} onNewSearch={() => {}} />);
    expect(screen.getByText('DUPONT Jean')).not.toBeNull();
    expect(screen.getByRole('button', { name: /nouvelle recherche/i })).not.toBeNull();
  });

  it('reexpedition === true : affiche le bandeau d’avertissement', () => {
    render(
      <SearchResultView
        person={person({ colonne: 5, reexpedition: true })}
        onNewSearch={() => {}}
      />,
    );
    expect(screen.getByText('RÉEXPÉDITION')).not.toBeNull();
    expect(screen.getByText('Vérifiez vos ordres de réexpédition actifs')).not.toBeNull();
    // Le résultat panneau/colonne/logement reste parfaitement visible.
    expect(screen.getByText('COLONNE')).not.toBeNull();
    expect(screen.getByText('5')).not.toBeNull();
  });

  it('reexpedition === false : aucun bandeau affiché', () => {
    render(
      <SearchResultView
        person={person({ colonne: 5, reexpedition: false })}
        onNewSearch={() => {}}
      />,
    );
    expect(screen.queryByText('RÉEXPÉDITION')).toBeNull();
  });
});
