export interface Person {
  id: string;
  nom: string;
  prenom: string | null;
  /**
   * Adresse complète exploitable pour l'affichage / l'export / la compatibilité
   * avec les anciennes données. Pour les entrées récentes elle est construite
   * automatiquement à partir de `numeroRue` + le nom de la rue (`rueId`).
   */
  adresse: string;
  /** Numéro de rue (entier strictement positif). `null` pour les anciennes entrées. */
  numeroRue: number | null;
  /** Référence vers une rue enregistrée. `null` pour les anciennes entrées / imports libres. */
  rueId: string | null;
  colonne: number;
  panneau: number | null;
}

/** Données d'un formulaire avant validation / création de l'id. */
export interface PersonInput {
  nom: string;
  prenom: string | null;
  adresse: string;
  numeroRue: number | null;
  rueId: string | null;
  colonne: number;
  panneau: number | null;
}

export const MIN_COLONNE = 1;
export const MAX_COLONNE = 16;
