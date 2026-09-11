import type { PersonInput } from '../types/person';
import { bulkAddPersons } from '../db/database';

/**
 * Données de démonstration ENTIÈREMENT FICTIVES.
 * Utilisées uniquement pour tester l'application en développement.
 * Le bouton qui appelle cette fonction n'est visible que si `import.meta.env.DEV`.
 *
 * `numeroRue` / `rueId` sont laissés à `null` : ces entrées imitent d'anciennes
 * données (adresse libre) et permettent de vérifier la rétro-compatibilité.
 * La dernière entrée illustre le cas PANNEAU + LOGEMENT (sans colonne).
 */
export const DEMO_PERSONS: PersonInput[] = [
  { nom: 'DUPONT', prenom: 'Jean', adresse: '12 Rue Victor Hugo', numeroRue: null, rueId: null, colonne: 5, panneau: 1, logement: null },
  { nom: 'DUPONT', prenom: 'Marie', adresse: '8 Rue des Lilas', numeroRue: null, rueId: null, colonne: 3, panneau: 2, logement: null },
  { nom: 'MARTIN', prenom: 'Sophie', adresse: '4 Avenue de Paris', numeroRue: null, rueId: null, colonne: 2, panneau: null, logement: null },
  { nom: 'BERNARD', prenom: 'Paul', adresse: '22 Rue Nationale', numeroRue: null, rueId: null, colonne: 8, panneau: 1, logement: null },
  { nom: 'DURAND', prenom: 'Michel', adresse: '15 Rue Pasteur', numeroRue: null, rueId: null, colonne: 16, panneau: null, logement: null },
  { nom: 'LEROY', prenom: 'Camille', adresse: '3 Rue des Tilleuls', numeroRue: null, rueId: null, colonne: null, panneau: 4, logement: '314' },
];

export async function loadDemoData(): Promise<number> {
  return bulkAddPersons(DEMO_PERSONS);
}
