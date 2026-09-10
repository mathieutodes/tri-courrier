export interface Person {
  id: string;
  nom: string;
  prenom: string | null;
  adresse: string;
  colonne: number;
  panneau: number | null;
}

/** Données d'un formulaire avant validation / création de l'id. */
export interface PersonInput {
  nom: string;
  prenom: string | null;
  adresse: string;
  colonne: number;
  panneau: number | null;
}

export const MIN_COLONNE = 1;
export const MAX_COLONNE = 16;
