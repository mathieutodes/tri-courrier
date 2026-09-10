import { useState } from 'react';
import type { Person, PersonInput } from '../types/person';
import { validatePerson, type RawPersonFields, type ValidationErrors } from '../utils/validation';

interface Props {
  initial?: Person;
  onSubmit: (value: PersonInput) => void;
  onCancel: () => void;
}

function toRaw(person?: Person): RawPersonFields {
  return {
    nom: person?.nom ?? '',
    prenom: person?.prenom ?? '',
    adresse: person?.adresse ?? '',
    colonne: person ? String(person.colonne) : '',
    panneau: person && person.panneau !== null ? String(person.panneau) : '',
  };
}

export default function PersonForm({ initial, onSubmit, onCancel }: Props) {
  const [fields, setFields] = useState<RawPersonFields>(toRaw(initial));
  const [errors, setErrors] = useState<ValidationErrors>({});

  function set<K extends keyof RawPersonFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validatePerson(fields);
    if (!result.valid || !result.value) {
      setErrors(result.errors);
      return;
    }
    onSubmit(result.value);
  }

  return (
    <form className="person-form" onSubmit={handleSubmit} noValidate>
      <h2 className="form-title">{initial ? 'Modifier une personne' : 'Ajouter une personne'}</h2>

      <label className="field">
        <span className="field-label">Nom *</span>
        <input
          className="text-input"
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
          className="text-input"
          type="text"
          value={fields.prenom}
          onChange={(e) => set('prenom', e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Adresse *</span>
        <input
          className="text-input"
          type="text"
          value={fields.adresse}
          onChange={(e) => set('adresse', e.target.value)}
        />
        {errors.adresse && <span className="field-error">{errors.adresse}</span>}
      </label>

      <label className="field">
        <span className="field-label">Colonne * (1 à 16)</span>
        <input
          className="text-input"
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
          className="text-input"
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
