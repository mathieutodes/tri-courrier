import { useEffect, useRef, useState } from 'react';
import type { Person, PersonInput } from '../types/person';
import type { Rue } from '../types/rue';
import { decomposeAdresse } from '../utils/adresse';
import {
  validatePersonForm,
  type LegacyAddress,
  type PersonFormErrors,
  type RawPersonForm,
} from '../utils/validation';

interface Props {
  initial?: Person;
  rues: Rue[];
  onSubmit: (value: PersonInput) => void;
  onCancel: () => void;
  /**
   * Fait défiler la page jusqu'au champ Remarque au montage — utilisé par le
   * bouton « APPORTER UNE PRÉCISION » de l'écran résultat. Positionne
   * UNIQUEMENT la vue : ne donne PAS le focus par programmation (voir
   * l'effet correspondant plus bas pour le détail). L'utilisateur touche
   * lui-même le champ pour l'activer ; le focus provient alors réellement
   * de son geste, ce qui laisse iOS gérer son clavier et son autocorrection
   * exactement comme pour n'importe quel champ de texte natif.
   */
  autoFocusRemarque?: boolean;
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

  // Colonne prioritaire si (cas limite) une fiche avait les deux.
  const mode: 'colonne' | 'logement' =
    person && person.colonne === null && person.logement !== null ? 'logement' : 'colonne';

  return {
    nom: person?.nom ?? '',
    prenom: person?.prenom ?? '',
    numero,
    rueId,
    mode,
    colonne: person?.colonne != null ? String(person.colonne) : '',
    panneau: person && person.panneau !== null ? String(person.panneau) : '',
    logement: person?.logement ?? '',
    // Nouvelle fiche : décochée par défaut. Modification : reflète la valeur
    // actuelle (les anciennes fiches sans ce champ valent `false`, voir
    // `fromStored` dans src/db/database.ts).
    reexpedition: person?.reexpedition ?? false,
    // Textarea libre : la remarque existante est affichée telle quelle
    // (aucune transformation), vide pour une nouvelle fiche.
    remarque: person?.remarque ?? '',
  };
}

export default function PersonForm({
  initial,
  rues,
  onSubmit,
  onCancel,
  autoFocusRemarque = false,
}: Props) {
  const [fields, setFields] = useState<RawPersonForm>(() => toRawForm(initial, rues));
  const [errors, setErrors] = useState<PersonFormErrors>({});
  const remarqueRef = useRef<HTMLTextAreaElement>(null);

  // Filet de sécurité (défense en profondeur) : si ce formulaire a malgré
  // tout été monté avant que le store des rues ait fini son premier
  // chargement (`rues` encore vide à l'instant précis du montage), l'état
  // initial ci-dessus n'a pas pu résoudre `initial.rueId` — le select rue
  // démarre alors vide alors que la donnée existe bel et bien. On mémorise
  // cet ID "en attente" une seule fois au montage, puis on le réconcilie dès
  // que `rues` le contient réellement — mais UNIQUEMENT si l'utilisateur n'a
  // rien choisi entre-temps (`fields.rueId` toujours vide) : on ne doit
  // jamais écraser un choix volontaire. Appliqué au plus une fois.
  const pendingRueId = useRef<string | null>(
    initial && initial.rueId && !rues.some((r) => r.id === initial.rueId) ? initial.rueId : null,
  );

  useEffect(() => {
    const target = pendingRueId.current;
    if (!target) return;
    const rue = rues.find((r) => r.id === target);
    if (!rue) return; // toujours pas chargée : on retentera au prochain changement de `rues`
    pendingRueId.current = null;
    setFields((f) => (f.rueId === '' ? { ...f, rueId: rue.id } : f));
  }, [rues]);

  useEffect(() => {
    if (!autoFocusRemarque) return;
    // Déclenché par l'intention utilisateur du clic « APPORTER UNE
    // PRÉCISION » (voir SearchResultView) : on amène le champ dans la zone
    // visible, SANS lui donner le focus par programmation.
    //
    // Volontairement PAS de `.focus()` ici : un focus déclenché par du code
    // (plutôt que par un geste tactile direct de l'utilisateur sur le champ)
    // peut amener Safari/iOS — notamment en PWA installée sur l'écran
    // d'accueil — à initialiser le clavier avec des réglages de saisie
    // dégradés (autocorrection, suggestions), de façon peu fiable selon les
    // versions d'iOS. En laissant l'utilisateur toucher lui-même la
    // textarea, le focus provient d'une vraie interaction tactile et iOS
    // gère alors son clavier normalement, comme pour n'importe quel champ
    // de texte natif.
    //
    // `scrollIntoView` n'existe pas dans tous les environnements (ex. jsdom
    // en test) : accès défensif via `?.` sur la méthode elle-même, pas
    // seulement sur la ref.
    remarqueRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    // Volontairement `[]` : ce positionnement initial ne doit se déclencher
    // qu'une fois au montage, jamais se répéter si `autoFocusRemarque` était
    // déjà vrai (il ne change pas après coup pour une instance de formulaire
    // donnée).
  }, []);

  // Adresse actuelle non retrouvée automatiquement : on la montre pour info.
  const legacyAdresse =
    initial && (fields.numero === '' || fields.rueId === '') ? initial.adresse : null;

  // Protection contre la perte silencieuse de données : tant que
  // l'utilisateur n'a pas lui-même touché Numéro ou Rue, on garde la
  // possibilité de préserver l'adresse d'origine si la rue reste non résolue
  // à l'enregistrement (voir `handleSubmit`). Dès qu'il modifie l'un de ces
  // deux champs, ce filet se désactive DÉFINITIVEMENT pour cette session de
  // formulaire : il est alors en train d'éditer l'adresse lui-même, la
  // validation normale (rue obligatoire) doit s'appliquer pleinement.
  const addressTouched = useRef(false);

  function set<K extends Exclude<keyof RawPersonForm, 'mode' | 'reexpedition'>>(
    key: K,
    value: string,
  ) {
    if (key === 'numero' || key === 'rueId') addressTouched.current = true;
    setFields((f) => ({ ...f, [key]: value }));
  }

  function setMode(mode: RawPersonForm['mode']) {
    setFields((f) => ({ ...f, mode }));
  }

  function setReexpedition(value: boolean) {
    setFields((f) => ({ ...f, reexpedition: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const legacyAddress: LegacyAddress | null =
      initial && !addressTouched.current
        ? { adresse: initial.adresse, numeroRue: initial.numeroRue, rueId: initial.rueId }
        : null;
    const result = validatePersonForm(fields, rues, legacyAddress);
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

      <div className="field">
        <span className="field-label">Localisation *</span>
        <div className="mode-toggle" role="tablist" aria-label="Type de localisation">
          <button
            type="button"
            role="tab"
            aria-selected={fields.mode === 'colonne'}
            className={`mode-toggle-btn${fields.mode === 'colonne' ? ' active' : ''}`}
            onClick={() => setMode('colonne')}
          >
            Colonne
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={fields.mode === 'logement'}
            className={`mode-toggle-btn${fields.mode === 'logement' ? ' active' : ''}`}
            onClick={() => setMode('logement')}
          >
            Panneau + Logement
          </button>
        </div>
        <span className="field-hint">
          Choisissez soit une colonne, soit un panneau accompagné d'un numéro de logement.
        </span>
      </div>

      {fields.mode === 'colonne' ? (
        <>
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
        </>
      ) : (
        <>
          <label className="field">
            <span className="field-label">Panneau *</span>
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

          <label className="field">
            <span className="field-label">Numéro de logement *</span>
            <input
              className="input"
              type="text"
              placeholder="ex. 314, A12"
              value={fields.logement}
              onChange={(e) => set('logement', e.target.value)}
            />
            {errors.logement && <span className="field-error">{errors.logement}</span>}
          </label>
        </>
      )}

      <label className="checkbox-row checkbox-row-neutral">
        <input
          type="checkbox"
          checked={fields.reexpedition}
          onChange={(e) => setReexpedition(e.target.checked)}
        />
        <span>Réexpédition</span>
      </label>

      <label className="field">
        <span className="field-label">Remarque</span>
        <textarea
          ref={remarqueRef}
          className="input textarea"
          // Identifiant sémantiquement NEUTRE, volontairement distinct de
          // "nom"/"prenom"/"adresse"/toute sémantique de contact : sans
          // `name`/`id` explicite, Safari doit deviner le rôle du champ à
          // partir du contexte — ici un `<form>` qui contient Nom, Prénom,
          // Numéro et Rue juste au-dessus. Cette combinaison ressemble
          // fortement à un formulaire de fiche contact aux yeux de
          // l'heuristique d'auto-remplissage d'iOS/Safari, qui peut alors
          // proposer de préremplir Remarque avec une donnée de Contacts. Un
          // identifiant explicite de note libre retire cette ambiguïté.
          name="freeform-note"
          id="freeform-note"
          rows={3}
          placeholder="ex. Boîte au nom de MARTIN, BAL derrière la porte…"
          value={fields.remarque}
          onChange={(e) => set('remarque', e.target.value)}
          // Champ de texte libre en langage naturel, PAS une donnée de
          // contact : `autoComplete="off"` indique explicitement à Safari de
          // ne pas y appliquer d'auto-remplissage (Contact, adresse…) — sans
          // toucher au clavier lui-même, qui doit rester NATIF complet
          // (autocorrection, suggestions, majuscule automatique en début de
          // phrase), jamais désactivé, et jamais de correction "maison".
          // Concerne UNIQUEMENT ce champ : Nom/Prénom/Numéro/Rue ne sont pas
          // modifiés.
          //
          // Limite connue : Safari applique aussi ses propres heuristiques et
          // peut, dans certains cas, ignorer `autocomplete="off"` — cet
          // attribut réduit la probabilité de détection Contact, il ne la
          // supprime pas avec certitude à lui seul.
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck={true}
        />
        <span className="field-hint">Facultatif. Visible sur l'écran résultat.</span>
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
