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
  const accent = getColumnAccent(person.colonne);
  const hasPanneau = person.panneau !== null && person.panneau !== undefined;

  return (
    <div className="result">
      <div className="result-name">{fullName(person)}</div>

      <div
        className={`result-card${hasPanneau ? '' : ' result-card-solo'}`}
        style={{ '--accent': accent } as CSSProperties}
      >
        {hasPanneau && (
          <>
            <div className="rfig">
              <span className="rfig-label">PANNEAU</span>
              <span className="rfig-num">{person.panneau}</span>
            </div>
            <div className="rfig-divider" aria-hidden="true" />
          </>
        )}
        <div className="rfig">
          <span className="rfig-label">COLONNE</span>
          <span className="rfig-num">{person.colonne}</span>
        </div>
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
