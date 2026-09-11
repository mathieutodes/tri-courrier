import { useEffect, useState } from 'react';
import SearchPage from './pages/SearchPage';
import DatabasePage from './pages/DatabasePage';

/**
 * Routage minimal par hash, compatible GitHub Pages / PWA (aucun serveur,
 * aucune configuration de réécriture d'URL nécessaire).
 *
 * `database-edit` encode l'ID du destinataire à ouvrir DIRECTEMENT en mode
 * modification (bouton « APPORTER UNE PRÉCISION » de l'écran résultat) :
 * `#/database/edit/<id>`. On navigue bien par ID STABLE — jamais par nom —
 * pour rester correct même avec plusieurs destinataires homonymes.
 */
type Route =
  | { kind: 'search' }
  | { kind: 'database' }
  | { kind: 'database-edit'; personId: string };

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  const editMatch = /^\/database\/edit\/([^/]+)$/.exec(hash);
  if (editMatch) {
    return { kind: 'database-edit', personId: decodeURIComponent(editMatch[1]) };
  }
  if (hash === '/database') return { kind: 'database' };
  return { kind: 'search' };
}

export function navigate(route: 'search' | 'database'): void {
  window.location.hash = route === 'database' ? '/database' : '/';
}

/**
 * Ouvre directement la fiche « Modifier le destinataire » pour cet ID,
 * depuis l'écran résultat (bouton « APPORTER UNE PRÉCISION »). Si l'ID
 * n'existe plus au moment de l'affichage (donnée supprimée, lien obsolète,
 * rechargement), `DatabasePage` revient proprement à la liste — jamais de
 * plantage.
 */
export function navigateToEditPerson(personId: string): void {
  window.location.hash = `/database/edit/${encodeURIComponent(personId)}`;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.kind === 'search') return <SearchPage />;
  return <DatabasePage editPersonId={route.kind === 'database-edit' ? route.personId : null} />;
}
