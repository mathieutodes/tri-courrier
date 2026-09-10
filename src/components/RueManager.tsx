import { useState } from 'react';
import type { Rue } from '../types/rue';
import { cleanStored, normalizeText } from '../utils/normalizeText';

interface Props {
  rues: Rue[];
  onAdd: (nom: string) => Promise<void> | void;
  onUpdate: (rue: Rue) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onBack: () => void;
}

export default function RueManager({ rues, onAdd, onUpdate, onDelete, onBack }: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNom, setEditingNom] = useState('');
  const [toDelete, setToDelete] = useState<Rue | null>(null);

  function exists(nom: string, exceptId?: string): boolean {
    const n = normalizeText(nom);
    return rues.some((r) => normalizeText(r.nom) === n && r.id !== exceptId);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const nom = cleanStored(draft);
    if (nom === '') {
      setError('Le nom de la rue est obligatoire.');
      return;
    }
    if (exists(nom)) {
      setError('Cette rue existe déjà.');
      return;
    }
    setError(null);
    setDraft('');
    void onAdd(nom);
  }

  function startEdit(rue: Rue) {
    setEditingId(rue.id);
    setEditingNom(rue.nom);
  }

  function saveEdit() {
    if (!editingId) return;
    const nom = cleanStored(editingNom);
    if (nom === '' || exists(nom, editingId)) return;
    void onUpdate({ id: editingId, nom });
    setEditingId(null);
    setEditingNom('');
  }

  return (
    <div className="page page-pad">
      <button type="button" className="btn-back" onClick={onBack}>
        <span>← RETOUR</span>
      </button>
      <h2 className="form-title">Gérer les rues</h2>

      <form className="rue-add" onSubmit={handleAdd}>
        <input
          className="text-input"
          type="text"
          placeholder="Nouvelle rue (ex. Rue Victor Hugo)"
          value={draft}
          autoCapitalize="words"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          AJOUTER
        </button>
      </form>
      {error && <span className="field-error">{error}</span>}

      <p className="hint">{rues.length} rue(s) enregistrée(s).</p>

      <ul className="person-list">
        {rues.map((rue) => (
          <li key={rue.id} className="person-item">
            {editingId === rue.id ? (
              <>
                <input
                  className="text-input"
                  type="text"
                  value={editingNom}
                  autoCapitalize="words"
                  onChange={(e) => setEditingNom(e.target.value)}
                />
                <div className="person-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    ANNULER
                  </button>
                  <button type="button" className="btn btn-small" onClick={saveEdit}>
                    ENREGISTRER
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="person-name">{rue.nom}</span>
                <div className="person-actions">
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => startEdit(rue)}
                  >
                    MODIFIER
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => setToDelete(rue)}
                  >
                    SUPPRIMER
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {rues.length === 0 && <li className="hint">Aucune rue.</li>}
      </ul>

      {toDelete && (
        <div className="modal-backdrop" onClick={() => setToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="modal-text">Supprimer la rue « {toDelete.nom} » ?</p>
            <p className="hint">
              Les personnes déjà enregistrées gardent leur adresse ; elles devront
              seulement resélectionner une rue si vous les modifiez.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setToDelete(null)}
              >
                ANNULER
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  void onDelete(toDelete.id);
                  setToDelete(null);
                }}
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
