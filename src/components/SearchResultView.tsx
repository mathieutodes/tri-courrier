import { useState, type CSSProperties } from 'react';
import { navigateToEditPerson } from '../App';
import { deletePersonSynced } from '../db/personStore';
import type { Person } from '../types/person';
import {
  BackIcon,
  MailboxIcon,
  MoreIcon,
  NoteIcon,
  PencilIcon,
  PersonIcon,
  TrashIcon,
  TruckIcon,
} from './icons';

// Les chiffres PANNEAU/COLONNE/LOGEMENT suivent tous le même bleu iOS (voir
// section « couleurs » du design system) — l'ancienne palette de 16 couleurs
// par numéro de colonne a été retirée. `--card-accent` reste injecté en
// style inline uniquement pour marquer « une colonne est renseignée » (voir
// `cardStyle` plus bas et le test correspondant) ; sa valeur ne varie plus.
const COLONNE_ACCENT = 'var(--ios-blue)';

interface Props {
  person: Person;
  onNewSearch: () => void;
}

function fullName(person: Person): string {
  return person.prenom ? `${person.nom} ${person.prenom}` : person.nom;
}

export default function SearchResultView({ person, onNewSearch }: Props) {
  // Menu « ••• » (Modifier / Supprimer) et confirmation de suppression —
  // purement local à cet écran, aucun nouveau système d'édition/suppression :
  // « Modifier la fiche » réutilise exactement `navigateToEditPerson` (le
  // mécanisme déjà utilisé par APPORTER UNE PRÉCISION) et « Supprimer la
  // fiche » réutilise exactement `deletePersonSynced` (le même mécanisme que
  // la Base de données, IndexedDB compris — aucune logique dupliquée).
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deletePersonSynced(person.id);
      setConfirmDeleteOpen(false);
      // Ce destinataire n'existe plus : on ne peut plus rester sur son écran
      // résultat — retour propre à la recherche, exactement comme
      // NOUVELLE RECHERCHE / "‹ Recherche".
      onNewSearch();
    } finally {
      setDeleting(false);
    }
  }

  const hasPanneau = person.panneau !== null && person.panneau !== undefined;
  const hasColonne = person.colonne !== null && person.colonne !== undefined;
  // La colonne reste prioritaire à l'affichage si — cas limite — une fiche
  // avait les deux (la validation l'empêche normalement côté formulaire
  // manuel ; un CSV externe malformé pourrait théoriquement le produire).
  const hasLogement =
    !hasColonne &&
    person.logement !== null &&
    person.logement !== undefined &&
    person.logement.trim() !== '';

  const secondaryLabel = hasColonne ? 'COLONNE' : hasLogement ? 'LOGEMENT' : null;
  const secondaryValue = hasColonne
    ? String(person.colonne)
    : hasLogement
      ? (person.logement as string)
      : null;

  // Avec colonne : `--card-accent` est explicitement fixé au bleu iOS (voir
  // `COLONNE_ACCENT` en tête de fichier). Sans colonne (cas PANNEAU +
  // LOGEMENT), on n'injecte rien : la carte garde le fallback CSS global
  // (également bleu iOS désormais — voir :root) — aucune couleur inventée.
  const cardStyle = hasColonne ? ({ '--card-accent': COLONNE_ACCENT } as CSSProperties) : undefined;

  const showPanneauFigure = hasPanneau && secondaryValue !== null;

  return (
    <div className="result">
      {/* Barre du haut : "‹ Recherche" (réutilise EXACTEMENT `onNewSearch`,
          la même action que l'ancien bouton NOUVELLE RECHERCHE) à gauche,
          menu "•••" (Modifier / Supprimer) à droite — équilibrés
          horizontalement. */}
      <div className="result-topbar">
        <button type="button" className="result-nav-back" onClick={onNewSearch}>
          <BackIcon size={16} />
          <span>Recherche</span>
        </button>
        <button
          type="button"
          className="result-menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Options"
        >
          <MoreIcon size={18} />
        </button>
      </div>

      {/* CARTE IDENTITÉ : avatar rond sur petite surface bleu pâle à gauche,
          NOM Prénom + adresse à droite. `min-width: 0` (voir CSS) laisse un
          nom long (ex. « KHATCHADOURIAN ») se répartir proprement sur
          plusieurs lignes, jamais tronqué. */}
      <div className="identity-card result-card-shell card card-hero">
        <span className="avatar avatar-blue avatar-lg" aria-hidden="true">
          <PersonIcon size={25} />
        </span>
        <div className="result-header">
          <div className="result-name">{fullName(person)}</div>
          {/* Information de vérification visuelle uniquement — jamais
              l'information principale pendant la tournée (voir carte
              panneau/colonne/logement ci-dessous) : réutilise directement
              `person.adresse` existant, aucune nouvelle donnée. */}
          <p className="result-address">{person.adresse}</p>
        </div>
      </div>

      {person.reexpedition && (
        <div className="reexpedition-banner result-card-shell card card-hero" role="status">
          <span className="avatar avatar-red avatar-lg reexpedition-banner-icon" aria-hidden="true">
            <TruckIcon size={25} />
          </span>
          <div className="reexpedition-banner-text">
            <span className="reexpedition-banner-title">RÉEXPÉDITION</span>
            <span className="reexpedition-banner-subtitle">
              Vérifiez vos ordres de réexpédition actifs
            </span>
          </div>
        </div>
      )}

      {/* CARTE EMPLACEMENT — priorité maximale pendant la tournée. Carte
          HORIZONTALE généreuse : pastille icône à gauche, grands chiffres à
          droite — la hauteur ne varie (quasiment) pas selon 1 ou 2
          informations affichées (voir CSS : pas de mode "solo" distinct). */}
      <div className="result-card result-card-shell card card-hero" style={cardStyle}>
        <span className="avatar avatar-blue avatar-lg result-card-icon" aria-hidden="true">
          <MailboxIcon size={26} />
        </span>
        <div className="result-card-figures">
          {showPanneauFigure && (
            <>
              {/* PANNEAU : même typographie de libellé que COLONNE/LOGEMENT
                  (voir `.rfig-label` — plus aucun modificateur par titre) et
                  même bleu iOS pour le chiffre — plus de distinction "neutre
                  vs accent" (voir design system). */}
              <div className="rfig">
                <span className="rfig-label">PANNEAU</span>
                <span className="rfig-num rfig-num-neutral">{person.panneau}</span>
              </div>
              <div className="rfig-divider" aria-hidden="true" />
            </>
          )}
          {secondaryValue !== null && (
            <div className="rfig">
              <span className="rfig-label">{secondaryLabel}</span>
              {/* Le logement est une chaîne libre (peut atteindre 4 caractères
                  et plus, ex. "8407", "A12") : taille réduite dédiée pour
                  toujours tenir dans sa case, sans toucher à PANNEAU/COLONNE. */}
              <span
                className={`rfig-num${secondaryLabel === 'LOGEMENT' ? ' rfig-num-logement' : ''}`}
              >
                {secondaryValue}
              </span>
            </div>
          )}
        </div>
      </div>

      {person.remarque !== null && person.remarque.trim() !== '' && (
        <div className="remarque-block result-card-shell card card-hero">
          <span className="avatar avatar-blue avatar-lg remarque-icon" aria-hidden="true">
            <NoteIcon size={23} />
          </span>
          <div className="remarque-body">
            <span className="remarque-label">REMARQUE</span>
            <p className="remarque-text">{person.remarque}</p>
          </div>
        </div>
      )}

      {/* APPORTER UNE PRÉCISION : action PRIMAIRE — seule action de bas
          d'écran désormais (NOUVELLE RECHERCHE est remplacée par la
          navigation "‹ Recherche" en haut, qui déclenche exactement le même
          `onNewSearch` : plus de deux actions identiques). */}
      <button
        type="button"
        className="btn btn-primary btn-block result-secondary"
        onClick={() => navigateToEditPerson(person.id)}
      >
        <PencilIcon size={18} />
        APPORTER UNE PRÉCISION
      </button>

      {/* Menu "•••" : deux actions, réutilisant chacune un mécanisme déjà
          existant — aucun second système d'édition/suppression. */}
      {menuOpen && (
        <div className="modal-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet-group">
              {/* Exactement la même action que APPORTER UNE PRÉCISION. */}
              <button
                type="button"
                className="action-sheet-item"
                onClick={() => navigateToEditPerson(person.id)}
              >
                <PencilIcon size={18} />
                Modifier la fiche
              </button>
              <button
                type="button"
                className="action-sheet-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDeleteOpen(true);
                }}
              >
                <TrashIcon size={18} />
                Supprimer la fiche
              </button>
            </div>
            <button
              type="button"
              className="action-sheet-cancel"
              onClick={() => setMenuOpen(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Confirmation explicite avant toute suppression — nomme le
          destinataire concerné, jamais de suppression immédiate. Ne
          supprime QUE ce destinataire (`deletePersonSynced` ne touche ni
          aux rues ni aux autres personnes), puis revient à la recherche. */}
      {confirmDeleteOpen && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">Supprimer {fullName(person)} ?</p>
            <p className="hint">Cette action est irréversible.</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                ANNULER
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
              >
                SUPPRIMER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
