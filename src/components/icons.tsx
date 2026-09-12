interface IconProps {
  size?: number;
}

export function SearchIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DatabaseIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="7" ry="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function BackIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Petit crayon — bouton APPORTER UNE PRÉCISION. */
export function PencilIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20l.9-4.2L15.5 5.2a1.5 1.5 0 0 1 2.12 0l1.18 1.18a1.5 1.5 0 0 1 0 2.12L8.2 19.1 4 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M13.5 7.2l3.3 3.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Triangle d'avertissement + point d'exclamation — bandeau RÉEXPÉDITION. */
export function WarningIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 L21.5 20 H2.5 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1="12" y1="9.5" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Silhouette simple — avatar identité (carte destinataire, suggestions, liste). */
export function PersonIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4.5 20c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Feuille à coin plié + lignes de texte — bloc REMARQUE (esprit SF Symbols
 * « doc.text ») : traits fins et réguliers, coins arrondis cohérents avec le
 * reste de la famille d'icônes. */
export function NoteIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.75 3.5h7.4l4.35 4.35V19.5a1.25 1.25 0 0 1-1.25 1.25h-10.5a1.25 1.25 0 0 1-1.25-1.25v-15A1.25 1.25 0 0 1 6.75 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.15 3.5v3.6a1 1 0 0 0 1 1h3.35"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line x1="8.3" y1="12.2" x2="15.7" y2="12.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8.3" y1="15.5" x2="15.7" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Croix simple — action d'ajout compacte. */
export function PlusIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}

/** Curseurs de réglage — filtres. */
export function FilterIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="6" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="12" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="18" r="2" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Grille de quatre casiers — carte emplacement (esprit SF Symbols
 * « square.grid.2x2 ») : évoque directement un ensemble de boîtes aux
 * lettres / casiers de distribution, en géométrie pure — sans toit ni
 * silhouette de bâtiment, pour un rendu plus élégant qu'une illustration
 * littérale. Même poids de trait (1.6) et mêmes coins arrondis que le reste
 * de la famille d'icônes de cet écran. */
export function MailboxIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.6" height="7.6" rx="1.9" stroke="currentColor" strokeWidth="1.6" />
      <rect x="12.9" y="3.5" width="7.6" height="7.6" rx="1.9" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="12.9" width="7.6" height="7.6" rx="1.9" stroke="currentColor" strokeWidth="1.6" />
      <rect x="12.9" y="12.9" width="7.6" height="7.6" rx="1.9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Camion de livraison + lignes de vitesse — bandeau RÉEXPÉDITION. Forme
 * inspirée fidèlement du pictogramme de référence fourni (camion + trois
 * lignes de vitesse décroissantes évoquant la rapidité de renvoi), mais
 * redessinée en traits fins (poids 1.6, cohérent avec le reste de la
 * famille d'icônes de cet écran) plutôt qu'en silhouette pleine — la couleur
 * n'est jamais fixée ici : `currentColor` hérite du rouge iOS déjà appliqué
 * par `.reexpedition-banner svg` / `.avatar-red`, fond toujours transparent. */
export function TruckIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="1.4" y1="8" x2="7.6" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="3.3" y1="11.3" x2="7.6" y2="11.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="5.2" y1="14.6" x2="7.6" y2="14.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="9.5" y="6.6" width="7.3" height="8.4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M16.8 10.1h2.5a1 1 0 0 1 .8.4l1.75 2.25a1 1 0 0 1 .2.6v1.65a1 1 0 0 1-1 1h-4.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12.1" cy="17.3" r="1.5" fill="currentColor" />
      <circle cx="19.5" cy="17.3" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Trois points horizontaux — menu d'actions (« ••• »). */
export function MoreIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <circle cx="19" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

/** Corbeille — action « Supprimer la fiche ». */
export function TrashIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="10" y1="10.8" x2="10" y2="16.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="10.8" x2="14" y2="16.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Deux voies parallèles — gestion des rues. */
export function StreetIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3 5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 3l4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="11.3" y1="9" x2="12.7" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="11.7" y1="14.5" x2="13.1" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
