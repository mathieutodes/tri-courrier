import { useState } from 'react';
import type { AddressOption } from '../utils/addressFilter';

interface Props {
  options: AddressOption[];
  selected: ReadonlySet<string>;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
}

export default function AddressFilterModal({ options, selected, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selected));

  function toggle(key: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resetAll() {
    onApply(new Set());
    onClose();
  }

  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal address-filter-modal" onClick={(e) => e.stopPropagation()}>
        <p className="modal-text">Filtrer par adresse</p>

        {options.length === 0 ? (
          <p className="hint address-filter-empty">Aucune adresse enregistrée.</p>
        ) : (
          <ul className="address-filter-list">
            {options.map((opt) => (
              <li key={opt.key}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.has(opt.key)}
                    onChange={() => toggle(opt.key)}
                  />
                  <span>{opt.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={resetAll}>
            TOUTES LES ADRESSES
          </button>
          <button type="button" className="btn btn-primary" onClick={apply}>
            APPLIQUER
          </button>
        </div>
      </div>
    </div>
  );
}
