import type { Person } from '../types/person';
import ResultCard from './ResultCard';

interface Props {
  person: Person;
  onNewSearch: () => void;
}

export default function SearchResultView({ person, onNewSearch }: Props) {
  return (
    <div className="result">
      <ResultCard person={person} />

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
