import { useEffect, useMemo, useRef, useState } from 'react';
import { navigate } from '../App';
import { filterByNomPrefix, searchByNom } from '../db/database';
import { ensurePersonsLoaded, refreshPersons, usePersons } from '../db/personStore';
import type { Person } from '../types/person';
import { normalizeText } from '../utils/normalizeText';
import SearchResultView from '../components/SearchResultView';
import { DatabaseIcon, SearchIcon } from '../components/icons';

type Phase =
  | { kind: 'idle' }
  | { kind: 'none' }
  | { kind: 'list'; results: Person[] }
  | { kind: 'one'; person: Person };

/** Nombre maximum de suggestions affichées d'un coup (sécurité DOM). */
const MAX_SUGGESTIONS = 200;

function fullName(p: Person): string {
  return p.prenom ? `${p.nom} ${p.prenom}` : p.nom;
}

function sortByNom(a: Person, b: Person): number {
  const c = normalizeText(a.nom).localeCompare(normalizeText(b.nom));
  return c !== 0 ? c : normalizeText(a.prenom).localeCompare(normalizeText(b.prenom));
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  // Copie locale (store en mémoire) filtrée localement pour un preshot instantané.
  // Le store est resynchronisé avec IndexedDB à chaque écriture ET à chaque
  // retour sur cette page — voir src/db/personStore.ts.
  const allPersons = usePersons();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    ensurePersonsLoaded();
    // Retour sur la page Recherche : on relit IndexedDB pour garantir la fraîcheur
    // même si le composant n'a pas été démonté entre-temps.
    void refreshPersons();
  }, []);

  /** Preshot : destinataires dont le NOM commence par la saisie (préfixe). */
  const suggestions = useMemo(
    () => filterByNomPrefix(allPersons, query).sort(sortByNom).slice(0, MAX_SUGGESTIONS),
    [query, allPersons],
  );

  async function runSearch() {
    const q = query.trim();
    if (q === '') {
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const results = await searchByNom(q);
      if (results.length === 0) setPhase({ kind: 'none' });
      else if (results.length === 1) setPhase({ kind: 'one', person: results[0] });
      else setPhase({ kind: 'list', results });
    } finally {
      setBusy(false);
    }
  }

  function newSearch() {
    setQuery('');
    setPhase({ kind: 'idle' });
    // Laisse React repeindre puis remet le focus (fait apparaître le clavier).
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (phase.kind === 'one') {
    return <SearchResultView person={phase.person} onNewSearch={newSearch} />;
  }

  if (phase.kind === 'list') {
    return (
      <div className="screen">
        <header className="appbar">
          <span className="appbar-title">{phase.results.length} résultats</span>
        </header>
        <div className="screen-body">
          <div className="stack">
            {phase.results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="suggestion"
                onClick={() => setPhase({ kind: 'one', person: p })}
              >
                <span className="suggestion-name">{fullName(p)}</span>
                <span className="suggestion-addr">{p.adresse}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-block" onClick={newSearch}>
            NOUVELLE RECHERCHE
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === 'none') {
    return (
      <div className="screen center-screen">
        <p className="big-note">Aucun destinataire trouvé</p>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={newSearch}>
          NOUVELLE RECHERCHE
        </button>
      </div>
    );
  }

  const hasQuery = query.trim() !== '';

  return (
    <div className="screen home">
      <button
        type="button"
        className="icon-btn home-db"
        onClick={() => navigate('database')}
        aria-label="Base de données"
      >
        <DatabaseIcon />
      </button>

      <div className={`home-inner${hasQuery ? ' home-inner-active' : ''}`}>
        {!hasQuery && (
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            className="home-logo"
          />
        )}
        <h1 className="home-title">TRI COURRIER</h1>

        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
        >
          <div className="search-field">
            <span className="search-field-icon">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              className="search-input"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Nom du destinataire"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            RECHERCHER
          </button>
        </form>

        {hasQuery && (
          <div className="suggestions" role="listbox" aria-label="Suggestions">
            {suggestions.length === 0 ? (
              <p className="empty-note">Aucun nom ne commence par « {query.trim()} »</p>
            ) : (
              suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="suggestion"
                  onClick={() => setPhase({ kind: 'one', person: p })}
                >
                  <span className="suggestion-name">{fullName(p)}</span>
                  <span className="suggestion-addr">{p.adresse}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
