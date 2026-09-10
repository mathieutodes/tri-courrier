import type { Person } from '../types/person';
import { getColumnColor } from '../utils/columnColors';

interface Props {
  person: Person;
  onNewSearch: () => void;
}

function fullName(person: Person): string {
  return person.prenom ? `${person.nom} ${person.prenom}` : person.nom;
}

export default function SearchResultView({ person, onNewSearch }: Props) {
  const color = getColumnColor(person.colonne);
  const hasPanneau = person.panneau !== null && person.panneau !== undefined;

  return (
    <div className="result" style={{ background: color.bg, color: color.fg }}>
      <div className="result-name">{fullName(person)}</div>

      <div className={`result-figures${hasPanneau ? '' : ' result-figures-solo'}`}>
        {hasPanneau && (
          <div className="figure">
            PANNEAU <span className="figure-number">{person.panneau}</span>
          </div>
        )}
        <div className="figure">
          COLONNE <span className="figure-number">{person.colonne}</span>
        </div>
      </div>

      <button type="button" className="btn btn-on-color" onClick={onNewSearch}>
        NOUVELLE RECHERCHE
      </button>
    </div>
  );
}
