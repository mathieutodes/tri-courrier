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

/** Feuille + lignes de texte — bloc REMARQUE. */
export function NoteIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="3.5" width="15" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="17" x2="12.5" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

/** Boîtes aux lettres / panneau — carte emplacement. */
export function MailboxIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="17" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="12" x2="9" y2="19" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7V5.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V7" stroke="currentColor" strokeWidth="2" />
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
