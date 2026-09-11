// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    remarque: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  window.location.hash = '';
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
    expect(card.style.getPropertyValue('--card-accent')).not.toBe('');
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

    // Pas de colonne -> pas de couleur de colonne injectée (style neutre).
    const card = document.querySelector('.result-card') as HTMLElement;
    expect(card.style.getPropertyValue('--card-accent')).toBe('');
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

  it('affiche le nom complet et la navigation "‹ Recherche" en haut', () => {
    render(<SearchResultView person={person({ colonne: 5 })} onNewSearch={() => {}} />);
    expect(screen.getByText('DUPONT Jean')).not.toBeNull();
    expect(screen.getByRole('button', { name: /recherche/i })).not.toBeNull();
    // Un seul déclencheur de nouvelle recherche : plus de gros bouton
    // NOUVELLE RECHERCHE en bas d'écran (remplacé par la navigation du haut).
    expect(screen.queryByRole('button', { name: /nouvelle recherche/i })).toBeNull();
  });

  it('le bouton "‹ Recherche" déclenche exactement `onNewSearch` (même action que l’ancien bouton)', () => {
    const onNewSearch = vi.fn();
    render(<SearchResultView person={person({ colonne: 5 })} onNewSearch={onNewSearch} />);
    fireEvent.click(screen.getByRole('button', { name: /recherche/i }));
    expect(onNewSearch).toHaveBeenCalledTimes(1);
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

  it('remarque absente : aucun bloc REMARQUE affiché', () => {
    render(
      <SearchResultView person={person({ colonne: 5, remarque: null })} onNewSearch={() => {}} />,
    );
    expect(screen.queryByText('REMARQUE')).toBeNull();
  });

  it('remarque vide (chaîne blanche) : aucun bloc REMARQUE affiché', () => {
    render(
      <SearchResultView person={person({ colonne: 5, remarque: '   ' })} onNewSearch={() => {}} />,
    );
    expect(screen.queryByText('REMARQUE')).toBeNull();
  });

  it('remarque présente : bloc REMARQUE affiché sous le panneau/colonne/logement', () => {
    render(
      <SearchResultView
        person={person({ colonne: 5, remarque: 'Boîte au nom de MARTIN' })}
        onNewSearch={() => {}}
      />,
    );
    expect(screen.getByText('REMARQUE')).not.toBeNull();
    expect(screen.getByText('Boîte au nom de MARTIN')).not.toBeNull();
    // Le résultat principal reste visible.
    expect(screen.getByText('COLONNE')).not.toBeNull();
    expect(screen.getByText('5')).not.toBeNull();
  });

  it('réexpédition + remarque : les deux sont affichés en même temps', () => {
    render(
      <SearchResultView
        person={person({ colonne: 5, reexpedition: true, remarque: 'BAL derrière la porte' })}
        onNewSearch={() => {}}
      />,
    );
    expect(screen.getByText('RÉEXPÉDITION')).not.toBeNull();
    expect(screen.getByText('REMARQUE')).not.toBeNull();
    expect(screen.getByText('BAL derrière la porte')).not.toBeNull();
  });

  it('le bouton APPORTER UNE PRÉCISION est toujours disponible, même sans remarque', () => {
    render(<SearchResultView person={person({ colonne: 5 })} onNewSearch={() => {}} />);
    expect(
      screen.getByRole('button', { name: /apporter une précision/i }),
    ).not.toBeNull();
  });

  it('APPORTER UNE PRÉCISION cible le bon ID (navigation par ID stable, pas par nom)', () => {
    render(
      <SearchResultView person={person({ id: 'person-42', colonne: 5 })} onNewSearch={() => {}} />,
    );
    screen.getByRole('button', { name: /apporter une précision/i }).click();
    expect(window.location.hash).toBe('#/database/edit/person-42');
  });

  describe('adresse complète sous le nom', () => {
    it("affiche person.adresse du bon destinataire, directement sous NOM Prénom", () => {
      render(
        <SearchResultView
          person={person({ adresse: '35 Rue Claude Kogan', colonne: 5 })}
          onNewSearch={() => {}}
        />,
      );
      expect(screen.getByText('35 Rue Claude Kogan')).not.toBeNull();
    });

    it('adresse longue : affichée intégralement, sans troncature', () => {
      const longue = '128 bis Avenue Maréchal Juin, Résidence Les Terrasses du Parc';
      render(
        <SearchResultView person={person({ adresse: longue, colonne: 5 })} onNewSearch={() => {}} />,
      );
      expect(screen.getByText(longue)).not.toBeNull();
    });

    it('ordre : NOM puis adresse, avant le bandeau réexpédition et la carte principale', () => {
      render(
        <SearchResultView
          person={person({ adresse: '35 Rue Claude Kogan', colonne: 5, reexpedition: true })}
          onNewSearch={() => {}}
        />,
      );
      const container = document.querySelector('.result') as HTMLElement;
      const text = container.textContent ?? '';
      const iName = text.indexOf('DUPONT Jean');
      const iAddress = text.indexOf('35 Rue Claude Kogan');
      const iReexpedition = text.indexOf('RÉEXPÉDITION');
      const iCard = text.indexOf('COLONNE');
      expect(iName).toBeGreaterThanOrEqual(0);
      expect(iName).toBeLessThan(iAddress);
      expect(iAddress).toBeLessThan(iReexpedition);
      expect(iAddress).toBeLessThan(iCard);
    });

    it('adresse + COLONNE : les deux informations coexistent, la carte reste visible', () => {
      render(
        <SearchResultView
          person={person({ adresse: '35 Rue Claude Kogan', colonne: 4 })}
          onNewSearch={() => {}}
        />,
      );
      expect(screen.getByText('35 Rue Claude Kogan')).not.toBeNull();
      expect(screen.getByText('COLONNE')).not.toBeNull();
      expect(screen.getByText('4')).not.toBeNull();
    });

    it('adresse + PANNEAU + LOGEMENT 8407 : les deux informations coexistent', () => {
      render(
        <SearchResultView
          person={person({
            adresse: '35 Rue Claude Kogan',
            colonne: null,
            panneau: 7,
            logement: '8407',
          })}
          onNewSearch={() => {}}
        />,
      );
      expect(screen.getByText('35 Rue Claude Kogan')).not.toBeNull();
      expect(screen.getByText('PANNEAU')).not.toBeNull();
      expect(screen.getByText('LOGEMENT')).not.toBeNull();
      expect(screen.getByText('8407')).not.toBeNull();
    });

    it('adresse + réexpédition + remarque : toutes les informations sont affichées ensemble', () => {
      render(
        <SearchResultView
          person={person({
            adresse: '35 Rue Claude Kogan',
            colonne: 5,
            reexpedition: true,
            remarque: 'Boîte derrière la porte',
          })}
          onNewSearch={() => {}}
        />,
      );
      expect(screen.getByText('35 Rue Claude Kogan')).not.toBeNull();
      expect(screen.getByText('RÉEXPÉDITION')).not.toBeNull();
      expect(screen.getByText('REMARQUE')).not.toBeNull();
      expect(screen.getByText('Boîte derrière la porte')).not.toBeNull();
    });

    it('deux destinataires homonymes : chacun affiche sa propre adresse', () => {
      const { unmount } = render(
        <SearchResultView
          person={person({ id: 'p1', adresse: '12 Rue Victor Hugo', colonne: 5 })}
          onNewSearch={() => {}}
        />,
      );
      expect(screen.getByText('12 Rue Victor Hugo')).not.toBeNull();
      unmount();

      render(
        <SearchResultView
          person={person({ id: 'p2', adresse: '4 Avenue de Paris', colonne: 2 })}
          onNewSearch={() => {}}
        />,
      );
      expect(screen.getByText('4 Avenue de Paris')).not.toBeNull();
      expect(screen.queryByText('12 Rue Victor Hugo')).toBeNull();
    });
  });
});
