import { useEffect, useState } from 'react';
import SearchPage from './pages/SearchPage';
import DatabasePage from './pages/DatabasePage';

type Route = 'search' | 'database';

function currentRoute(): Route {
  return window.location.hash.replace(/^#/, '') === '/database' ? 'database' : 'search';
}

export function navigate(route: Route): void {
  window.location.hash = route === 'database' ? '/database' : '/';
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route === 'database' ? <DatabasePage /> : <SearchPage />;
}
