import type { CSSProperties } from 'react';
import { navigateToEditPerson } from '../App';
import type { Person } from '../types/person';
import { getColumnAccent } from '../utils/columnColors';
import { PencilIcon, WarningIcon } from './icons';

interface Props {
  person: Person;
  onNewSearch: () => void;
}

function fullName(person: Person): string {
  return person.prenom ? `${person.nom} ${person.prenom}` : person.nom;
}

export default function SearchResultView({ person, onNewSearch }: Props) {
  const hasPanneau = person.panneau !== null && person.panneau !== undefined;
  const hasColonne = person.colonne !== null && person.colonne !== undefined;
  // La colonne reste prioritaire à l'affichage si — cas limite — une fiche
  // avait les deux (la validation l'empêche normalement côté formulaire
  // manuel ; un CSV externe malformé pourrait théoriquement le produire).
  const hasLogement =
    !hasColonne &&
    person.logement !== null &&
    person.logement !== undefined &&
    person.logement.trim() !== '';

  const secondaryLabel = hasColonne ? 'COLONNE' : hasLogement ? 'LOGEMENT' : null;
  const secondaryValue = hasColonne
    ? String(person.colonne)
    : hasLogement
      ? (person.logement as string)
      : null;

  // La couleur de colonne devient l'accent visuel de la carte, via la
  // variable CSS dédiée `--card-accent` (distincte de `--accent-blue`, la
  // couleur des boutons d'action — les deux ne doivent jamais se confondre).
  // Sans colonne (cas PANNEAU + LOGEMENT), on n'invente aucune couleur : la
  // carte garde le style neutre existant (fallback CSS vers le token global).
  const accent = hasColonne ? getColumnAccent(person.colonne as number) : null;
  const cardStyle = accent ? ({ '--card-accent': accent } as CSSProperties) : undefined;

  const showPanneauFigure = hasPanneau && secondaryValue !== null;
  const solo = !showPanneauFigure;

  return (
    <div className="result">
      <div className="result-header">
        <div className="result-name">{fullName(person)}</div>
        {/* Information de vérification visuelle uniquement — jamais
            l'information principale pendant la tournée (voir carte
            panneau/colonne/logement ci-dessous) : réutilise directement
            `person.adresse` existant, aucune nouvelle donnée. */}
        <p className="result-address">{person.adresse}</p>
      </div>

      {person.reexpedition && (
        <div className="reexpedition-banner" role="status">
          <WarningIcon size={20} />
          <div className="reexpedition-banner-text">
            <span className="reexpedition-banner-title">RÉEXPÉDITION</span>
            <span className="reexpedition-banner-subtitle">
              Vérifiez vos ordres de réexpédition actifs
            </span>
          </div>
        </div>
      )}

      <div className={`result-card${solo ? ' result-card-solo' : ''}`} style={cardStyle}>
        {showPanneauFigure && (
          <>
            {/* PANNEAU : immédiatement identifiable (label légèrement
                agrandi) mais volontairement neutre — le chiffre le plus
                important reste celui de COLONNE/LOGEMENT à côté. */}
            <div className="rfig">
              <span className="rfig-label rfig-label-panneau">PANNEAU</span>
              <span className="rfig-num rfig-num-neutral">{person.panneau}</span>
            </div>
            <div className="rfig-divider" aria-hidden="true" />
          </>
        )}
        {secondaryValue !== null && (
          <div className="rfig">
            <span className="rfig-label">{secondaryLabel}</span>
            {/* Le logement est une chaîne libre (peut atteindre 4 caractères
                et plus, ex. "8407", "A12") : taille réduite dédiée pour
                toujours tenir dans sa case, sans toucher à PANNEAU/COLONNE. */}
            <span
              className={`rfig-num${secondaryLabel === 'LOGEMENT' ? ' rfig-num-logement' : ''}`}
            >
              {secondaryValue}
            </span>
          </div>
        )}
      </div>

      {person.remarque !== null && person.remarque.trim() !== '' && (
        <div className="remarque-block">
          <span className="remarque-label">REMARQUE</span>
          <p className="remarque-text">{person.remarque}</p>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block result-secondary"
        onClick={() => navigateToEditPerson(person.id)}
      >
        <PencilIcon size={18} />
        APPORTER UNE PRÉCISION
      </button>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block result-cta"
        onClick={onNewSearch}
      >
        NOUVELLE RECHERCHE
      </button>
    </div>
  );
}
