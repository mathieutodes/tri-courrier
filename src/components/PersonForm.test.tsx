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

  it('autoFocusRemarque : positionne la vue sur Remarque (scrollIntoView) SANS jamais lui donner le focus', () => {
    // jsdom n'implémente pas `scrollIntoView` par défaut : on le fournit
    // nous-mêmes pour pouvoir vérifier qu'il est bien appelé.
    const scrollIntoViewSpy = vi.fn();
    HTMLTextAreaElement.prototype.scrollIntoView = scrollIntoViewSpy;
    const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');

    render(
      <PersonForm
        initial={existingPerson({})}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
        autoFocusRemarque
      />,
    );

    expect(scrollIntoViewSpy).toHaveBeenCalledTimes(1);
    // Le cœur de la correction : plus aucun `.focus()` programmatique, quel
    // que soit le contexte — c'est à l'utilisateur de toucher le champ
    // lui-même pour que Safari/iOS gère normalement le clavier et
    // l'autocorrection native.
    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByLabelText(/remarque/i));

    focusSpy.mockRestore();
    // @ts-expect-error nettoyage du polyfill de test (absent par défaut de jsdom)
    delete HTMLTextAreaElement.prototype.scrollIntoView;
  });

  it('sans autoFocusRemarque, ni scroll ni focus ne sont déclenchés', () => {
    const scrollIntoViewSpy = vi.fn();
    HTMLTextAreaElement.prototype.scrollIntoView = scrollIntoViewSpy;
    const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, 'focus');

    render(
      <PersonForm
        initial={existingPerson({})}
        rues={rues}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(screen.getByLabelText(/remarque/i));

    focusSpy.mockRestore();
    // @ts-expect-error nettoyage du polyfill de test (absent par défaut de jsdom)
    delete HTMLTextAreaElement.prototype.scrollIntoView;
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

  describe('BUG 1 (suite) — résolution de rue selon la forme des données, et protection de l’adresse', () => {
    function legacyPerson(overrides: Partial<Person> = {}): Person {
      return {
        id: 'p2',
        nom: 'MARTIN',
        prenom: null,
        adresse: '35 Rue Claude Kogan',
        // Très ancienne fiche : numeroRue/rueId jamais renseignés (créée
        // avant l'introduction de ces champs) — seule `adresse` existe.
        numeroRue: null,
        rueId: null,
        colonne: 4,
        panneau: 2,
        logement: null,
        reexpedition: false,
        remarque: null,
        ...overrides,
      };
    }

    it('1. fiche moderne avec rueId valide : sélectionnée directement, aucune déduction nécessaire', () => {
      const modernRues: Rue[] = [{ id: 'r9', nom: 'Rue Claude Kogan' }];
      render(
        <PersonForm
          initial={legacyPerson({ numeroRue: 35, rueId: 'r9' })}
          rues={modernRues}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r9');
      expect((screen.getByLabelText(/numéro \*/i) as HTMLInputElement).value).toBe('35');
    });

    it('2. ancienne fiche sans rueId mais adresse décomposable : numéro + rue déduits automatiquement', () => {
      const legacyRues: Rue[] = [{ id: 'r9', nom: 'Rue Claude Kogan' }];
      render(
        <PersonForm
          initial={legacyPerson()}
          rues={legacyRues}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r9');
      expect((screen.getByLabelText(/numéro \*/i) as HTMLInputElement).value).toBe('35');
    });

    it('3. rue avec apostrophe : déduite même si l’apostrophe saisie diffère (droite/typographique)', () => {
      const arlequinRues: Rue[] = [{ id: 'r10', nom: "Galerie de l'Arlequin" }];
      render(
        <PersonForm
          // Adresse d'origine tapée avec l'apostrophe typographique (ex. clavier iOS).
          initial={legacyPerson({ adresse: '140 Galerie de l’Arlequin' })}
          rues={arlequinRues}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r10');
      expect((screen.getByLabelText(/numéro \*/i) as HTMLInputElement).value).toBe('140');
    });

    it('4. rue avec accents : déduite malgré une casse/accentuation différente', () => {
      const constantineRues: Rue[] = [{ id: 'r11', nom: 'Avenue de Constantine' }];
      render(
        <PersonForm
          initial={legacyPerson({ adresse: '80 AVENUE DE CÔNSTANTINE' })}
          rues={constantineRues}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('r11');
    });

    it('5. adresse valide mais impossible à résoudre (rue absente du catalogue) : select laissé vide, formulaire pas bloqué à l’ouverture', () => {
      render(
        <PersonForm
          initial={legacyPerson({ adresse: '35 Rue Introuvable' })}
          rues={[{ id: 'r12', nom: 'Rue Sans Rapport' }]}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      );
      expect((screen.getByLabelText(/^rue/i) as HTMLSelectElement).value).toBe('');
      // L'adresse d'origine reste visible pour information.
      expect(screen.getByText(/adresse actuelle.*35 rue introuvable/i)).not.toBeNull();
    });

    it('6. rue impossible à résoudre : modifier UNIQUEMENT la remarque préserve l’adresse d’origine à l’identique (aucune perte silencieuse)', () => {
      const onSubmit = vi.fn();
      render(
        <PersonForm
          initial={legacyPerson({ adresse: '35 Rue Introuvable' })}
          rues={[{ id: 'r12', nom: 'Rue Sans Rapport' }]}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />,
      );

      // On ne touche NI numéro NI rue : uniquement la remarque.
      fireEvent.change(screen.getByLabelText(/remarque/i), {
        target: { value: 'Boîte au fond de la cour' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

      // Jamais bloqué, jamais d'erreur "rue obligatoire" dans ce cas précis.
      expect(screen.queryByText(/rue est obligatoire/i)).toBeNull();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      const value = onSubmit.mock.calls[0][0];
      expect(value.adresse).toBe('35 Rue Introuvable');
      expect(value.numeroRue).toBeNull();
      expect(value.rueId).toBeNull();
      expect(value.panneau).toBe(2);
      expect(value.colonne).toBe(4);
      expect(value.remarque).toBe('Boîte au fond de la cour');
    });

    it('si la rue reste non résolue et que l’utilisateur touche lui-même le numéro, la protection se désactive (validation normale)', () => {
      const onSubmit = vi.fn();
      render(
        <PersonForm
          initial={legacyPerson({ adresse: '35 Rue Introuvable' })}
          rues={[{ id: 'r12', nom: 'Rue Sans Rapport' }]}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />,
      );

      fireEvent.change(screen.getByLabelText(/numéro \*/i), { target: { value: '35' } });
      fireEvent.click(screen.getByRole('button', { name: 'ENREGISTRER' }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/rue est obligatoire/i)).not.toBeNull();
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

  describe('BUG 3 — Remarque ne doit jamais être détectée par Safari comme un champ Contact', () => {
    it('autoComplete="off" est déclaré explicitement sur la textarea', () => {
      render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
      const textarea = screen.getByLabelText(/remarque/i) as HTMLTextAreaElement;
      expect(textarea.getAttribute('autocomplete')).toBe('off');
    });

    it('name/id sont sémantiquement neutres ("note libre"), jamais évocateurs d’un champ de contact', () => {
      render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
      const textarea = screen.getByLabelText(/remarque/i) as HTMLTextAreaElement;
      const contactLike = /\b(name|prenom|nom|adresse|address|contact|person|email|tel|phone)\b/i;
      expect(textarea.name).not.toBe('');
      expect(textarea.name).not.toMatch(contactLike);
      expect(textarea.id).not.toBe('');
      expect(textarea.id).not.toMatch(contactLike);
    });

    it("n'utilise jamais un autocomplete de type identité/contact (name, given-name, family-name, street-address…)", () => {
      render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
      const textarea = screen.getByLabelText(/remarque/i) as HTMLTextAreaElement;
      const forbidden = [
        'name',
        'given-name',
        'family-name',
        'street-address',
        'address-line1',
        'tel',
        'email',
        'organization',
      ];
      expect(forbidden).not.toContain(textarea.getAttribute('autocomplete'));
    });

    it('les champs Nom/Prénom/Numéro/Rue ne sont pas affectés par cette correction (comportement inchangé)', () => {
      render(<PersonForm rues={rues} onSubmit={() => {}} onCancel={() => {}} />);
      const nomInput = screen.getByLabelText(/^nom/i) as HTMLInputElement;
      const prenomInput = screen.getByLabelText(/^prénom/i) as HTMLInputElement;
      const numeroInput = screen.getByLabelText(/numéro \*/i) as HTMLInputElement;
      // Comportement d'origine préservé : Nom garde son autoCorrect="off"
      // dédié (majuscules forcées), les autres restent sans attribut
      // autocomplete/autocorrect particulier — rien de tout cela ne vient de
      // la correction apportée à Remarque.
      expect(nomInput.getAttribute('autocorrect')).toBe('off');
      expect(prenomInput.getAttribute('autocomplete')).toBeNull();
      expect(numeroInput.getAttribute('autocomplete')).toBeNull();
    });
  });
});
