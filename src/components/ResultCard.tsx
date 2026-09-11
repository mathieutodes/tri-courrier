import type { CSSProperties } from 'react';
import type { Person } from '../types/person';
import { getColumnAccent } from '../utils/columnColors';

interface Props {
  person: Person;
}

export function fullName(person: Person): string {
  return person.prenom ? `${person.nom} ${person.prenom}` : person.nom;
}

/**
 * Carte de résultat NOM + PANNEAU/COLONNE/LOGEMENT, partagée entre l'écran de
 * résultat de la recherche manuelle (`SearchResultView`) et le mode SCAN
 * (`ScanView`), pour garantir un langage visuel strictement identique entre
 * les deux — voir les mêmes classes `.result-name` / `.result-card` / `.rfig*`
 * dans `styles.css`.
 */
export default function ResultCard({ person }: Props) {
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
  // le style neutre existant (fallback CSS vers le token global).
  const accent = hasColonne ? getColumnAccent(person.colonne as number) : null;
  const cardStyle = accent ? ({ '--accent': accent } as CSSProperties) : undefined;

  const showPanneauFigure = hasPanneau && secondaryValue !== null;
  const solo = !showPanneauFigure;

  return (
    <>
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
    </>
  );
}
