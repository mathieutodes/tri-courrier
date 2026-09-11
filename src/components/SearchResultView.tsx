import type { CSSProperties } from 'react';
import type { Person } from '../types/person';
import { getColumnAccent } from '../utils/columnColors';

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

  // La couleur de colonne devient l'accent visuel de la carte. Sans colonne
  // (cas PANNEAU + LOGEMENT), on n'invente aucune couleur : la carte garde
  // le style dark neutre existant (fallback CSS vers le token global).
  const accent = hasColonne ? getColumnAccent(person.colonne as number) : null;
  const cardStyle = accent ? ({ '--accent': accent } as CSSProperties) : undefined;

  const showPanneauFigure = hasPanneau && secondaryValue !== null;
  const solo = !showPanneauFigure;

  return (
    <div className="result">
      <div className="result-name">{fullName(person)}</div>

      <div className={`result-card${solo ? ' result-card-solo' : ''}`} style={cardStyle}>
        {showPanneauFigure && (
          <>
            <div className="rfig">
              <span className="rfig-label">PANNEAU</span>
              <span className="rfig-num">{person.panneau}</span>
            </div>
            <div className="rfig-divider" aria-hidden="true" />
          </>
        )}
        {secondaryValue !== null && (
          <div className="rfig">
            <span className="rfig-label">{secondaryLabel}</span>
            <span className="rfig-num">{secondaryValue}</span>
          </div>
        )}
      </div>

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
