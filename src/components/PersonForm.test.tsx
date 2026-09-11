// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PersonForm from './PersonForm';
import type { Person } from '../types/person';
import type { Rue } from '../types/rue';

const rues: Rue[] = [{ id: 'r1', nom: 'Rue des Tilleuls' }];

function existingPerson(overrides: Partial<Person>): Person {
  return {
    id: 'p1',
    nom: 'LEROY',
    prenom: 'Camille',
    adresse: '3 Rue des Tilleuls',
    numeroRue: 3,
    rueId: 'r1',
    colonne: null,
    panneau: 4,
    logement: '314',
    reexpedition: false,
    remarque: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('PersonForm', () => {
  it('mode Colonne actif par défaut pour une nouvelle personne', () => {
    render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Colonne' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByLabelText(/colonne \*/i)).not.toBeNull();
    expect(screen.queryByLabelText(/numéro de logement/i)).toBeNull();
  });

  it('bascule vers Panneau + Logement : le champ Colonne disparaît, Logement apparaît', () => {
    render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Panneau + Logement' }));

    expect(screen.getByLabelText(/numéro de logement/i)).not.toBeNull();
    expect(screen.queryByLabelText(/colonne \*/i)).toBeNull();
  });

  it('10. édition d’une personne PANNEAU + LOGEMENT : mode présélectionné et champs pré-remplis', () => {
    render(
      <PersonForm
        initial={existingPerson({})}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'Panneau + Logement' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect((screen.getByLabelText(/panneau \*/i) as HTMLInputElement).value).toBe('4');
    expect((screen.getByLabelText(/numéro de logement/i) as HTMLInputElement).value).toBe('314');
  });

  it('10bis. soumet la modification avec colonne=null et le logement mis à jour', () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        initial={existingPerson({})}
        rues={rues}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/numéro de logement/i), {
      target: { value: '315' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const value = onSubmit.mock.calls[0][0];
    expect(value.colonne).toBeNull();
    expect(value.logement).toBe('315');
    expect(value.panneau).toBe(4);
    expect(value.rueId).toBe('r1');
  });

  it('édition d’une personne « colonne uniquement » : mode Colonne présélectionné', () => {
    render(
      <PersonForm
        initial={existingPerson({ colonne: 5, panneau: null, logement: null })}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Colonne' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect((screen.getByLabelText(/colonne \*/i) as HTMLInputElement).value).toBe('5');
  });

  it('mode Logement sans panneau : rejette et n’appelle pas onSubmit', () => {
    const onSubmit = vi.fn();
    render(<PersonForm rues={rues} onSubmit={onSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/^nom/i), { target: { value: 'DUPONT' } });
    fireEvent.change(screen.getByLabelText(/numéro \*/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/^rue/i), { target: { value: 'r1' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Panneau + Logement' }));
    fireEvent.change(screen.getByLabelText(/numéro de logement/i), { target: { value: '314' } });
    // panneau volontairement laissé vide
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/panneau est obligatoire/i)).not.toBeNull();
  });

  it('nouvelle fiche : la case Réexpédition est décochée par défaut', () => {
    render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
    expect((screen.getByLabelText(/réexpédition/i) as HTMLInputElement).checked).toBe(false);
  });

  it('édition : la case Réexpédition reflète la valeur actuelle de la fiche', () => {
    render(
      <PersonForm
        initial={existingPerson({ reexpedition: true })}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect((screen.getByLabelText(/réexpédition/i) as HTMLInputElement).checked).toBe(true);
  });

  it('cocher puis enregistrer transmet reexpedition = true', () => {
    const onSubmit = vi.fn();
    render(<PersonForm rues={rues} onSubmit={onSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/^nom/i), { target: { value: 'DUPONT' } });
    fireEvent.change(screen.getByLabelText(/numéro \*/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/^rue/i), { target: { value: 'r1' } });
    fireEvent.change(screen.getByLabelText(/colonne \*/i), { target: { value: '5' } });
    fireEvent.click(screen.getByLabelText(/réexpédition/i));
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].reexpedition).toBe(true);
  });

  it('modification : décocher une fiche en réexpédition repasse reexpedition = false', () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        initial={existingPerson({ colonne: 5, panneau: null, logement: null, reexpedition: true })}
        rues={rues}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    expect((screen.getByLabelText(/réexpédition/i) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText(/réexpédition/i));
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].reexpedition).toBe(false);
  });

  it('nouvelle fiche : le champ Remarque est vide par défaut', () => {
    render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
    expect((screen.getByLabelText(/remarque/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('édition : la remarque existante est affichée dans la textarea', () => {
    render(
      <PersonForm
        initial={existingPerson({ remarque: 'BAL derrière la porte' })}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect((screen.getByLabelText(/remarque/i) as HTMLTextAreaElement).value).toBe(
      'BAL derrière la porte',
    );
  });

  it('création avec remarque : transmise (espaces début/fin retirés)', () => {
    const onSubmit = vi.fn();
    render(<PersonForm rues={rues} onSubmit={onSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/^nom/i), { target: { value: 'DUPONT' } });
    fireEvent.change(screen.getByLabelText(/numéro \*/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/^rue/i), { target: { value: 'r1' } });
    fireEvent.change(screen.getByLabelText(/colonne \*/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/remarque/i), {
      target: { value: '  Boîte au nom de MARTIN  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].remarque).toBe('Boîte au nom de MARTIN');
  });

  it('modification d’une remarque existante', () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        initial={existingPerson({ remarque: 'Ancienne remarque' })}
        rues={rues}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/remarque/i), {
      target: { value: 'Nouvelle remarque' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].remarque).toBe('Nouvelle remarque');
  });

  it('suppression d’une remarque (textarea vidée) -> remarque devient null', () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        initial={existingPerson({ remarque: 'À supprimer' })}
        rues={rues}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/remarque/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].remarque).toBeNull();
  });

  it('ne modifie pas les autres champs de la fiche en ne touchant que la remarque', () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        initial={existingPerson({ colonne: 5, panneau: null, logement: null })}
        rues={rues}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/remarque/i), { target: { value: 'Une précision' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

    const value = onSubmit.mock.calls[0][0];
    expect(value.nom).toBe('LEROY');
    expect(value.prenom).toBe('Camille');
    expect(value.colonne).toBe(5);
    expect(value.remarque).toBe('Une précision');
  });

  it('autoFocusRemarque : place le focus dans la textarea Remarque au montage', () => {
    render(
      <PersonForm
        initial={existingPerson({})}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
        autoFocusRemarque
      />,
    );
    expect(document.activeElement).toBe(screen.getByLabelText(/remarque/i));
  });

  it('sans autoFocusRemarque, le focus n’est pas forcé dans la textarea', () => {
    render(
      <PersonForm
        initial={existingPerson({})}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(document.activeElement).not.toBe(screen.getByLabelText(/remarque/i));
  });

  describe('BUG 1 — régression : ne jamais altérer adresse/rue en ne modifiant que la remarque', () => {
    // Rue dédiée à ce bloc (id `r1` mais nom distinct de la fixture partagée
    // en tête de fichier) pour vérifier précisément la reconstruction de
    // `adresse` à partir de `numeroRue` + le nom réel de la rue.
    const claudeKoganRues: Rue[] = [{ id: 'r1', nom: 'Rue Claude Kogan' }];

    function claudeKogan(): Person {
      return {
        id: 'p1',
        nom: 'DUPONT',
        prenom: 'Jean',
        adresse: '35 Rue Claude Kogan',
        numeroRue: 35,
        rueId: 'r1',
        colonne: 4,
        panneau: 2,
        logement: null,
        reexpedition: false,
        remarque: null,
      };
    }

    it('la rue existante est bien sélectionnée au montage (rues déjà chargées)', () => {
      render(
        <PersonForm
          initial={claudeKogan()}
          rues={claudeKoganRues}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r1');
      expect((screen.getByLabelText(/numéro \*/i) as HTMLInputElement).value).toBe('35');
    });

    it('modifier uniquement Remarque et enregistrer conserve adresse/numeroRue/rueId/panneau/colonne', () => {
      const onSubmit = vi.fn();
      render(
        <PersonForm
          initial={claudeKogan()}
          rues={claudeKoganRues}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />,
      );

      fireEvent.change(screen.getByLabelText(/remarque/i), {
        target: { value: 'Boîte derrière la porte' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const value = onSubmit.mock.calls[0][0];
      expect(value.adresse).toBe('35 Rue Claude Kogan');
      expect(value.numeroRue).toBe(35);
      expect(value.rueId).toBe('r1');
      expect(value.panneau).toBe(2);
      expect(value.colonne).toBe(4);
      expect(value.remarque).toBe('Boîte derrière la porte');
    });

    it("rues pas encore chargées au montage (store retardé) : le select est masqué (« Aucune rue enregistrée »), puis la rue se corrige dès que la liste arrive", () => {
      // Montage AVANT que le store des rues n'ait fini de charger : `rues`
      // vaut encore `[]` au moment précis où `PersonForm` calcule son état
      // initial (exactement le scénario du bug). Avec 0 rue, le composant
      // masque le `<select>` (rien à choisir) — c'est déjà, en soi, le
      // symptôme visible du bug : la rue "a disparu" du formulaire.
      const { rerender } = render(
        <PersonForm initial={claudeKogan()} rues={[]} onSubmit={() => {}} onCancel={() => {}} />,
      );
      expect(screen.queryByLabelText(/^rue/i)).toBeNull();
      expect(screen.getByText(/aucune rue enregistrée/i)).not.toBeNull();

      // Le store termine son chargement : le composant parent transmet enfin
      // la vraie liste de rues (même `initial`, seule `rues` change).
      rerender(
        <PersonForm
          initial={claudeKogan()}
          rues={claudeKoganRues}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r1');
    });

    it("ne réapplique jamais la rue d'origine si l'utilisateur en a déjà choisi une autre entre-temps", () => {
      const autreRue: Rue = { id: 'r2', nom: 'Avenue de Paris' };
      const { rerender } = render(
        <PersonForm initial={claudeKogan()} rues={[]} onSubmit={() => {}} onCancel={() => {}} />,
      );

      // Le store termine son chargement : auto-résolution vers la rue d'origine.
      rerender(
        <PersonForm
          initial={claudeKogan()}
          rues={[...claudeKoganRues, autreRue]}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r1');

      // L'utilisateur choisit lui-même une autre rue.
      fireEvent.change(screen.getByLabelText(/^rue/i), { target: { value: 'r2' } });
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r2');

      // Un nouveau rendu avec la même liste de rues (ex. rafraîchissement du
      // store) ne doit JAMAIS revenir en arrière sur le choix de l'utilisateur.
      rerender(
        <PersonForm
          initial={claudeKogan()}
          rues={[...claudeKoganRues, autreRue]}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r2');
    });
  });

  describe('BUG 2 — textarea Remarque : correction automatique native iOS activée', () => {
    it('déclare explicitement autoCorrect="on", spellCheck et autoCapitalize="sentences"', () => {
      render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
      const textarea = screen.getByLabelText(/remarque/i) as HTMLTextAreaElement;
      // Lecture par attribut brut (fiable indépendamment du support des
      // propriétés IDL `autocapitalize`/`spellcheck` par l'environnement de
      // test — c'est bien l'attribut HTML rendu que Safari/iOS interprète).
      expect(textarea.getAttribute('autocapitalize')).toBe('sentences');
      expect(textarea.getAttribute('spellcheck')).toBe('true');
      expect(textarea.getAttribute('autocorrect')).toBe('on');
    });

    it("n'utilise jamais autoCorrect/spellCheck/autoCapitalize désactivés", () => {
      render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
      const textarea = screen.getByLabelText(/remarque/i) as HTMLTextAreaElement;
      expect(textarea.getAttribute('autocorrect')).not.toBe('off');
      expect(textarea.getAttribute('spellcheck')).not.toBe('false');
      expect(textarea.getAttribute('autocapitalize')).not.toBe('none');
    });
  });
});
