import type { PersonInput } from '../types/person';
import { bulkAddPersons } from '../db/database';

/**
 * Données de démonstration ENTIÈREMENT FICTIVES.
 * Utilisées uniquement pour tester l'application en développement.
 * Le bouton qui appelle cette fonction n'est visible que si `import.meta.env.DEV`.
 */
export const DEMO_PERSONS: PersonInput[] = [
  { nom: 'DUPONT', prenom: 'Jean', adresse: '12 rue Victor Hugo', colonne: 5, panneau: 1 },
  { nom: 'DUPONT', prenom: 'Marie', adresse: '8 rue des Lilas', colonne: 3, panneau: 2 },
  { nom: 'MARTIN', prenom: 'Sophie', adresse: '4 avenue de Paris', colonne: 2, panneau: null },
  { nom: 'BERNARD', prenom: 'Paul', adresse: '22 rue Nationale', colonne: 8, panneau: 1 },
  { nom: 'DURAND', prenom: 'Michel', adresse: '15 rue Pasteur', colonne: 16, panneau: null },
];

export async function loadDemoData(): Promise<number> {
  return bulkAddPersons(DEMO_PERSONS);
}
