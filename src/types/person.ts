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
  /**
   * Colonne (1 à 16). Facultative depuis l'ajout de `logement` : une fiche
   * localisée par PANNEAU + LOGEMENT n'a pas de colonne.
   * Voir `src/utils/validation.ts` pour la règle de localisation minimale.
   */
  colonne: number | null;
  panneau: number | null;
  /**
   * Numéro de logement (ex. "314", "A12"). Texte libre plutôt qu'un nombre
   * pour supporter des repères alphanumériques. Facultatif ; `null` pour
   * toutes les fiches localisées par colonne (le cas très largement majoritaire).
   */
  logement: string | null;
}

/** Données d'un formulaire avant validation / création de l'id. */
export interface PersonInput {
  nom: string;
  prenom: string | null;
  adresse: string;
  numeroRue: number | null;
  rueId: string | null;
  colonne: number | null;
  panneau: number | null;
  logement: string | null;
}

export const MIN_COLONNE = 1;
export const MAX_COLONNE = 16;
