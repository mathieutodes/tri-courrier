import { useEffect, useMemo, useRef, useState } from 'react';
import { navigate } from '../App';
import {
  addPersonSynced,
  arePersonsLoaded,
  bulkAddPersonsSynced,
  bulkImportPersonsSynced,
  deleteAllPersonsSynced,
  deletePersonSynced,
  ensurePersonsLoaded,
  refreshPersons,
  updatePersonSynced,
  usePersons,
} from '../db/personStore';
import {
  addRueSynced,
  areRuesLoaded,
  deleteRueSynced,
  ensureRuesLoaded,
  refreshRues,
  updateRueSynced,
  useRues,
} from '../db/rueStore';
import type { Person, PersonInput } from '../types/person';
import type { Rue } from '../types/rue';
import { normalizeText } from '../utils/normalizeText';
import { getColumnColor } from '../utils/columnColors';
import { buildAddressOptions, filterPersonsByAddresses } from '../utils/addressFilter';
import {
  buildImportPreview,
  downloadFile,
  personsToCSV,
  personsToJSON,
  timestampedName,
  type ImportPreview,
} from '../services/importExport';
import PersonForm from '../components/PersonForm';
import RueManager from '../components/RueManager';
import AddressFilterModal from '../components/AddressFilterModal';
import { BackIcon } from '../components/icons';
import { DEMO_PERSONS } from '../services/demoData';

type View =
  | { kind: 'list' }
  | { kind: 'add' }
  | { kind: 'edit'; person: Person; autoFocusRemarque?: boolean }
  | { kind: 'rues' }
  | { kind: 'import'; preview: ImportPreview };

function fullName(p: Person): string {
  return p.prenom ? `${p.nom} ${p.prenom}` : p.nom;
}

interface Props {
  /**
   * ID d'un destinataire à ouvrir DIRECTEMENT en mode modification (venant du
   * bouton « APPORTER UNE PRÉCISION » de l'écran résultat) — voir `App.tsx`.
   * `null`/`undefined` : ouverture normale sur la liste.
   */
  editPersonId?: string | null;
}

export default function DatabasePage({ editPersonId = null }: Props) {
  const persons = usePersons();
  const rues = useRues();
  const [view, setView] = useState<View>({ kind: 'list' });
  // Évite de ré-imposer la vue « Modifier » si l'utilisateur revient ensuite
  // volontairement sur la liste (Retour) : un ID donné n'est consommé qu'UNE
  // SEULE fois.
  const appliedEditPersonId = useRef<string | null>(null);
  const [adminQuery, setAdminQuery] = useState('');
  const [toDelete, setToDelete] = useState<Person | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllConfirmed, setDeleteAllConfirmed] = useState(false);
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);
  const [addressFilterOpen, setAddressFilterOpen] = useState(false);
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensurePersonsLoaded();
    ensureRuesLoaded();
    void refreshPersons();
    void refreshRues();
  }, []);

  // Ouverture directe de la fiche « Modifier » pour `editPersonId` (bouton
  // « APPORTER UNE PRÉCISION »). On attend que le premier chargement depuis
  // IndexedDB soit terminé — pour LES DEUX stores, personnes ET RUES — avant
  // de faire quoi que ce soit.
  //
  // Pourquoi les rues aussi : si on ouvrait `PersonForm` alors que le store
  // des rues n'a pas encore fini son premier chargement (`rues` encore `[]`
  // à ce moment précis), `PersonForm` résout son état initial UNE SEULE FOIS
  // au montage (`useState(() => toRawForm(initial, rues))`) — avec cette
  // liste de rues vide, `toRawForm` ne peut jamais retrouver `person.rueId`
  // dedans et initialise le select sur « — Choisir une rue — » (rueId '').
  // La vraie liste arrive bien plus tard, mais l'état du formulaire ne se
  // corrige pas tout seul : la rue semble alors avoir disparu, alors que la
  // donnée en base est parfaitement intacte. Comme les deux stores sont des
  // caches en mémoire déjà chauds dès qu'ils ont servi une fois dans la
  // session, ce n'est PAS systématique — d'où un bug intermittent, qui ne
  // se produit que si aucune page n'a encore déclenché le chargement des
  // rues (ex. arrivée directe recherche -> résultat -> APPORTER UNE
  // PRÉCISION, sans être jamais passé par la Base de données).
  //
  // Une fois l'ID appliqué une fois, on ne le réévalue plus (voir
  // `appliedEditPersonId`) : l'utilisateur reste libre de revenir ensuite
  // sur la liste sans être renvoyé de force sur cette fiche.
  useEffect(() => {
    if (!editPersonId) return;
    if (appliedEditPersonId.current === editPersonId) return;
    if (!arePersonsLoaded() || !areRuesLoaded()) return;
    appliedEditPersonId.current = editPersonId;
    const person = persons.find((p) => p.id === editPersonId);
    if (person) {
      setView({ kind: 'edit', person, autoFocusRemarque: true });
    }
    // Consomme le lien profond : l'URL redevient `#/database`, pour qu'un
    // rechargement ultérieur ne rouvre pas cette fiche indéfiniment.
    navigate('database');
  }, [editPersonId, persons, rues]);

  // Filtre par ADRESSE COMPLÈTE (page Base de données uniquement) : source =
  // person.adresse, jamais le store `rues`. Recalculé à chaque changement de
  // `persons`, donc toujours à jour après import / ajout / modification /
  // suppression, sans rechargement de page.
  const addressOptions = useMemo(() => buildAddressOptions(persons), [persons]);

  // Si une adresse sélectionnée disparaît complètement de la base (toutes ses
  // personnes supprimées/modifiées), on nettoie automatiquement la sélection
  // pour éviter un filtre fantôme.
  useEffect(() => {
    setSelectedAddresses((prev) => {
      if (prev.size === 0) return prev;
      const validKeys = new Set(addressOptions.map((o) => o.key));
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (validKeys.has(key)) next.add(key);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [addressOptions]);

  const filtered = useMemo(() => {
    const q = normalizeText(adminQuery);
    const byAddress = filterPersonsByAddresses(persons, selectedAddresses);
    const list = [...byAddress].sort((a, b) => {
      const c = normalizeText(a.nom).localeCompare(normalizeText(b.nom));
      return c !== 0 ? c : normalizeText(a.prenom).localeCompare(normalizeText(b.prenom));
    });
    if (q === '') return list;
    return list.filter(
      (p) =>
        normalizeText(p.nom).includes(q) ||
        normalizeText(p.prenom).includes(q) ||
        normalizeText(p.adresse).includes(q),
    );
  }, [persons, adminQuery, selectedAddresses]);

  const addressFilterLabel =
    selectedAddresses.size === 0
      ? 'FILTRER PAR ADRESSE'
      : selectedAddresses.size === 1
        ? 'ADRESSE · 1 SÉLECTIONNÉE'
        : `ADRESSES · ${selectedAddresses.size} SÉLECTIONNÉES`;

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3500);
  }

  async function handleAdd(value: PersonInput) {
    await addPersonSynced(value);
    setView({ kind: 'list' });
    flash('Personne ajoutée.');
  }

  async function handleEdit(value: PersonInput) {
    if (view.kind !== 'edit') return;
    await updatePersonSynced({ id: view.person.id, ...value });
    setView({ kind: 'list' });
    flash('Modifications enregistrées.');
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await deletePersonSynced(toDelete.id);
    setToDelete(null);
    flash('Personne supprimée.');
  }

  function openDeleteAll() {
    setDeleteAllConfirmed(false);
    setDeleteAllOpen(true);
  }

  function cancelDeleteAll() {
    setDeleteAllOpen(false);
    setDeleteAllConfirmed(false);
  }

  async function confirmDeleteAll() {
    if (!deleteAllConfirmed) return;
    setDeleteAllBusy(true);
    try {
      // Supprime uniquement les personnes ; les rues ne sont jamais touchées.
      await deleteAllPersonsSynced();
      setDeleteAllOpen(false);
      setDeleteAllConfirmed(false);
      flash('Tous les destinataires ont été supprimés.');
    } finally {
      setDeleteAllBusy(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportBusy(true);
    try {
      const preview = await buildImportPreview(file);
      setView({ kind: 'import', preview });
    } catch {
      flash('Impossible de lire ce fichier CSV.');
    } finally {
      setImportBusy(false);
    }
  }

  async function confirmImport() {
    if (view.kind !== 'import') return;
    const { toImport, duplicateCount } = view.preview;
    // Résout / crée automatiquement les rues détectées dans les adresses
    // importées (dédupliquées, jamais de doublon) — voir personStore.ts.
    const { ruesCreated } = await bulkImportPersonsSynced(toImport);
    setView({ kind: 'list' });
    flash(
      `${toImport.length} personne(s) importée(s)` +
        (duplicateCount > 0 ? `, ${duplicateCount} doublon(s) ignoré(s)` : '') +
        (ruesCreated > 0 ? `, ${ruesCreated} nouvelle(s) rue(s) créée(s).` : '.'),
    );
  }

  function exportCSV() {
    downloadFile(timestampedName('tri-courrier', 'csv'), personsToCSV(persons), 'text/csv');
  }

  function exportJSON() {
    downloadFile(
      timestampedName('tri-courrier', 'json'),
      personsToJSON(persons),
      'application/json',
    );
  }

  async function loadDemo() {
    await bulkAddPersonsSynced(DEMO_PERSONS);
    flash('Données de démonstration ajoutées.');
  }

  // ---- Rendus ----

  if (view.kind === 'add' || view.kind === 'edit') {
    const isEdit = view.kind === 'edit';
    return (
      <div className="screen">
        <header className="appbar">
          <button
            type="button"
            className="appbar-back"
            onClick={() => setView({ kind: 'list' })}
          >
            <BackIcon size={20} />
            <span>Retour</span>
          </button>
          <span className="appbar-title">
            {isEdit ? 'Modifier une personne' : 'Ajouter une personne'}
          </span>
        </header>
        <div className="screen-body">
          <PersonForm
            initial={isEdit ? view.person : undefined}
            rues={rues}
            onSubmit={isEdit ? handleEdit : handleAdd}
            onCancel={() => setView({ kind: 'list' })}
            autoFocusRemarque={isEdit && view.autoFocusRemarque === true}
          />
        </div>
      </div>
    );
  }

  if (view.kind === 'rues') {
    return (
      <RueManager
        rues={rues}
        onAdd={async (nom) => {
          await addRueSynced(nom);
        }}
        onUpdate={(rue: Rue) => updateRueSynced(rue)}
        onDelete={(id) => deleteRueSynced(id)}
        onBack={() => setView({ kind: 'list' })}
      />
    );
  }

  if (view.kind === 'import') {
    const { preview } = view;
    return (
      <div className="screen">
        <header className="appbar">
          <button
            type="button"
            className="appbar-back"
            onClick={() => setView({ kind: 'list' })}
          >
            <BackIcon size={20} />
            <span>Retour</span>
          </button>
          <span className="appbar-title">Aperçu de l'import</span>
        </header>
        <div className="screen-body">
          <ul className="import-summary">
            <li>Personnes détectées : {preview.total}</li>
            <li>Lignes valides : {preview.validCount}</li>
            <li>Lignes invalides : {preview.invalidCount}</li>
            <li>Doublons : {preview.duplicateCount}</li>
          </ul>

          {preview.rows.some((r) => r.status !== 'valid') && (
            <div className="import-rows">
              {preview.rows
                .filter((r) => r.status !== 'valid')
                .map((r) => (
                  <div key={r.line} className={`import-row import-row-${r.status}`}>
                    <span className="import-row-line">Ligne {r.line}</span>{' '}
                    <span>
                      {r.display.nom} {r.display.prenom} — {r.display.adresse}
                    </span>
                    <span className="import-row-tag">
                      {r.status === 'duplicate' ? 'doublon ignoré' : 'invalide'}
                    </span>
                    {r.errors.length > 0 && (
                      <span className="import-row-errors">{r.errors.join(' ')}</span>
                    )}
                  </div>
                ))}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setView({ kind: 'list' })}
            >
              ANNULER
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void confirmImport()}
              disabled={preview.toImport.length === 0}
            >
              IMPORTER ({preview.toImport.length})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="appbar">
        <button type="button" className="appbar-back" onClick={() => navigate('search')}>
          <BackIcon size={20} />
          <span>Recherche</span>
        </button>
        <span className="appbar-title">Base de données</span>
      </header>

      <div className="screen-body">
        {message && <div className="toast">{message}</div>}

        <div className="db-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => setView({ kind: 'add' })}
          >
            AJOUTER UNE PERSONNE
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setView({ kind: 'rues' })}
          >
            GÉRER LES RUES ({rues.length})
          </button>
          <div className="db-tools">
            <label className="btn btn-secondary btn-file">
              IMPORTER
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void handleFileChosen(e)}
                hidden
              />
            </label>
            <button type="button" className="btn btn-secondary" onClick={exportCSV}>
              EXPORT CSV
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportJSON}>
              EXPORT JSON
            </button>
          </div>
          {importBusy && <p className="hint">Lecture du fichier…</p>}
          {import.meta.env.DEV && (
            <button type="button" className="btn btn-ghost" onClick={() => void loadDemo()}>
              + Données de démonstration (dev)
            </button>
          )}
        </div>

        <div className="field">
          <span className="section-label">Destinataires ({persons.length})</span>
          <input
            className="input"
            type="text"
            placeholder="Rechercher (nom, prénom, adresse)…"
            value={adminQuery}
            onChange={(e) => setAdminQuery(e.target.value)}
          />
          <button
            type="button"
            className={`btn btn-secondary btn-block filter-btn${
              selectedAddresses.size > 0 ? ' active' : ''
            }`}
            onClick={() => setAddressFilterOpen(true)}
          >
            {addressFilterLabel}
          </button>
        </div>

        <p className="hint">Données stockées uniquement sur cet appareil.</p>

        <ul className="card-list">
          {filtered.map((p) => {
            const color = p.colonne !== null ? getColumnColor(p.colonne) : null;
            return (
              <li key={p.id} className="card-row">
                <div className="card-main">
                  <span className="card-title">{fullName(p)}</span>
                  <span className="card-sub">{p.adresse}</span>
                  <span className="card-meta">
                    {p.panneau !== null && <>Panneau {p.panneau}</>}
                    {p.colonne !== null && color && (
                      <span
                        className="colonne-badge"
                        style={{ background: color.bg, color: color.fg }}
                      >
                        Colonne {p.colonne}
                      </span>
                    )}
                    {p.colonne === null && p.logement !== null && p.logement !== '' && (
                      <span className="logement-badge">Logement {p.logement}</span>
                    )}
                    {p.reexpedition && (
                      <span className="reexpedition-badge">RÉEXPÉDITION</span>
                    )}
                    {p.remarque !== null && p.remarque !== '' && (
                      <span className="remarque-badge">REMARQUE</span>
                    )}
                  </span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setView({ kind: 'edit', person: p })}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="link-btn danger"
                    onClick={() => setToDelete(p)}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="empty-row">Aucune entrée.</li>}
        </ul>

        <div className="danger-zone">
          <span className="danger-zone-title">Zone dangereuse</span>
          <p className="hint">
            Supprime définitivement tous les destinataires enregistrés sur cet appareil. Les
            rues enregistrées ne sont pas concernées.
          </p>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={openDeleteAll}
            disabled={persons.length === 0}
          >
            SUPPRIMER TOUS LES DESTINATAIRES
          </button>
        </div>
      </div>

      {deleteAllOpen && (
        <div className="modal-backdrop" onClick={cancelDeleteAll}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">Supprimer tous les destinataires ?</p>
            <p className="hint">
              Cette action supprimera définitivement tous les destinataires enregistrés sur cet
              appareil. Les rues enregistrées seront conservées. Cette action est irréversible.
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={deleteAllConfirmed}
                onChange={(e) => setDeleteAllConfirmed(e.target.checked)}
              />
              <span>Je confirme vouloir supprimer tous les destinataires</span>
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelDeleteAll}>
                ANNULER
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={!deleteAllConfirmed || deleteAllBusy}
                onClick={() => void confirmDeleteAll()}
              >
                SUPPRIMER DÉFINITIVEMENT
              </button>
            </div>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="modal-backdrop" onClick={() => setToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">Supprimer {fullName(toDelete)} ?</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setToDelete(null)}
              >
                ANNULER
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void confirmDelete()}>
                SUPPRIMER
              </button>
            </div>
          </div>
        </div>
      )}

      {addressFilterOpen && (
        <AddressFilterModal
          options={addressOptions}
          selected={selectedAddresses}
          onApply={setSelectedAddresses}
          onClose={() => setAddressFilterOpen(false)}
        />
      )}
    </div>
  );
}
