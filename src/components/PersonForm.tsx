import { useState } from 'react';
import type { Person, PersonInput } from '../types/person';
import type { Rue } from '../types/rue';
import { decomposeAdresse } from '../utils/adresse';
import {
  validatePersonForm,
  type PersonFormErrors,
  type RawPersonForm,
} from '../utils/validation';

interface Props {
  initial?: Person;
  rues: Rue[];
  onSubmit: (value: PersonInput) => void;
  onCancel: () => void;
}

function toRawForm(person: Person | undefined, rues: Rue[]): RawPersonForm {
  let numero = person?.numeroRue != null ? String(person.numeroRue) : '';
  let rueId = person?.rueId && rues.some((r) => r.id === person.rueId) ? person.rueId : '';

  // Ancienne entrée (adresse libre) : tentative de correspondance best-effort.
  if (person && (numero === '' || rueId === '')) {
    const guess = decomposeAdresse(person.adresse, rues);
    if (guess) {
      if (numero === '') numero = String(guess.numeroRue);
      if (rueId === '') rueId = guess.rueId;
    }
  }

  return {
    nom: person?.nom ?? '',
    prenom: person?.prenom ?? '',
    numero,
    rueId,
    colonne: person ? String(person.colonne) : '',
    panneau: person && person.panneau !== null ? String(person.panneau) : '',
  };
}

export default function PersonForm({ initial, rues, onSubmit, onCancel }: Props) {
  const [fields, setFields] = useState<RawPersonForm>(() => toRawForm(initial, rues));
  const [errors, setErrors] = useState<PersonFormErrors>({});

  // Adresse actuelle non retrouvée automatiquement : on la montre pour info.
  const legacyAdresse =
    initial && (fields.numero === '' || fields.rueId === '') ? initial.adresse : null;

  function set<K extends keyof RawPersonForm>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validatePersonForm(fields, rues);
    if (!result.valid || !result.value) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Nom *</span>
        <input
          className="input"
          type="text"
          value={fields.nom}
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(e) => set('nom', e.target.value)}
        />
        {errors.nom && <span className="field-error">{errors.nom}</span>}
      </label>

      <label className="field">
        <span className="field-label">Prénom</span>
        <input
          className="input"
          type="text"
          value={fields.prenom}
          onChange={(e) => set('prenom', e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Numéro *</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={fields.numero}
          onChange={(e) => set('numero', e.target.value)}
        />
        {errors.numero && <span className="field-error">{errors.numero}</span>}
      </label>

      <label className="field">
        <span className="field-label">Rue *</span>
        {rues.length === 0 ? (
          <span className="field-hint">
            Aucune rue enregistrée. Ajoutez d'abord une rue via « Gérer les rues ».
          </span>
        ) : (
          <select
            className="input"
            value={fields.rueId}
            onChange={(e) => set('rueId', e.target.value)}
          >
            <option value="">— Choisir une rue —</option>
            {rues.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        )}
        {errors.rueId && <span className="field-error">{errors.rueId}</span>}
        {legacyAdresse && (
          <span className="field-hint">Adresse actuelle : {legacyAdresse}</span>
        )}
      </label>

      <label className="field">
        <span className="field-label">Colonne * (1 à 16)</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={16}
          value={fields.colonne}
          onChange={(e) => set('colonne', e.target.value)}
        />
        {errors.colonne && <span className="field-error">{errors.colonne}</span>}
      </label>

      <label className="field">
        <span className="field-label">Panneau</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          value={fields.panneau}
          onChange={(e) => set('panneau', e.target.value)}
        />
        {errors.panneau && <span className="field-error">{errors.panneau}</span>}
      </label>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          ANNULER
        </button>
        <button type="submit" className="btn btn-primary">
          ENREGISTRER
        </button>
      </div>
    </form>
  );
}
