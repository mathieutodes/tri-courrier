# Tri Courrier

Application **très simple** pour retrouver instantanément la **colonne** de boîte
aux lettres correspondant au **nom** inscrit sur un courrier.

- Fonctionne sur iPhone (Safari), installable comme une petite application (PWA).
- Fonctionne **hors ligne** après la première ouverture.
- **Aucun compte, aucun serveur, aucune connexion.**
- Toutes les données restent **uniquement sur votre appareil** (stockage local du
  navigateur, technologie IndexedDB).

---

## Utilisation quotidienne

1. Ouvrir l'application.
2. Taper **le nom** du destinataire.
3. Valider (bouton **RECHERCHER** ou touche Entrée).
4. La **colonne** s'affiche en très grand, avec sa couleur.
5. Le **panneau** s'affiche seulement s'il existe.
6. Appuyer sur **NOUVELLE RECHERCHE** et enchaîner.

S'il y a plusieurs personnes avec le même nom, l'application affiche la liste
avec les adresses : touchez la bonne personne pour voir sa colonne.

---

## Gérer les destinataires

Depuis l'écran principal, toucher **Base de données** (en bas).

- **AJOUTER UNE PERSONNE** : Nom et Adresse et Colonne obligatoires ; Prénom et
  Panneau facultatifs.
- **MODIFIER** / **SUPPRIMER** chaque personne (la suppression demande une
  confirmation).
- **IMPORTER UNE BASE** : fichier CSV au format
  `nom,prenom,adresse,colonne,panneau`. Un aperçu indique les lignes valides,
  invalides et les doublons avant de confirmer.
- **EXPORT CSV** / **EXPORT JSON** : télécharge une sauvegarde sur l'appareil.

### Exemple de fichier CSV

```csv
nom,prenom,adresse,colonne,panneau
DUPONT,Jean,12 rue Victor Hugo,5,1
MARTIN,Sophie,"8 rue des Lilas, Bât. B",2,
BERNARD,Paul,24 avenue de Paris,8,2
DURAND,,15 rue Pasteur,16,
```

---

## Développement local

Prérequis : [Node.js](https://nodejs.org/) 20 ou plus.

```bash
npm install
npm run dev
```

Ouvrir l'adresse affichée (en général <http://localhost:5173>).

En mode développement, la page **Base de données** propose un bouton
« + Données de démonstration » (données fictives, jamais présentes en
production).

### Autres commandes

```bash
npm run typecheck   # vérification TypeScript
npm run test        # tests (normalizeText + validation)
npm run build       # build de production dans dist/
npm run preview     # prévisualise le build de production
npm run generate-icons  # régénère les icônes PNG depuis assets/icon-source.svg
```

---

## Déploiement gratuit sur GitHub Pages

L'application est 100 % statique : le site hébergé ne contient que le code, jamais
vos destinataires.

### 1. Créer un dépôt GitHub

Sur <https://github.com/new>, créez un dépôt (par exemple `tri-courrier`).
Ne cochez rien (pas de README).

### 2. Envoyer le projet

Depuis le dossier du projet :

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git
git push -u origin main
```

### 3. Activer GitHub Pages

Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub
Actions**.

### 4. GitHub Actions

Le fichier `.github/workflows/deploy.yml` est déjà inclus. À chaque `push` sur
`main`, il :

1. installe Node,
2. lance `npm ci`,
3. build le projet (`npm run build`) en réglant automatiquement le chemin de base
   sur `/NOM-DU-DEPOT/`,
4. publie le dossier `dist`.

### 5. Adresse publique

Après le premier déploiement réussi (onglet **Actions**), l'application est
disponible à :

```
https://VOTRE-COMPTE.github.io/VOTRE-DEPOT/
```

> Build local pour un sous-chemin identique à GitHub Pages :
> `BASE_PATH=/VOTRE-DEPOT/ npm run build`

---

## Installation sur iPhone

1. Ouvrir l'adresse de l'application dans **Safari**.
2. Toucher le bouton **Partager**.
3. Choisir **« Sur l'écran d'accueil »**.
4. Valider le nom **Tri Courrier**.
5. Lancer ensuite l'application depuis son icône : elle s'ouvre en plein écran et
   fonctionne hors ligne.

---

## Sauvegarde des données

Les destinataires sont stockés **uniquement sur l'appareil**. Ils ne sont jamais
envoyés sur Internet et ne sont pas inclus dans le dépôt GitHub.

Ils peuvent être perdus si vous :

- changez d'iPhone,
- réinstallez l'application,
- effacez les données de Safari.

👉 Utilisez régulièrement **EXPORT JSON** (ou **EXPORT CSV**) depuis la page Base
de données, et conservez le fichier obtenu. Pour restaurer : **IMPORTER UNE
BASE** (CSV).

---

## Mises à jour

Déployer une nouvelle version du code **n'efface jamais** les destinataires
enregistrés : la base locale (IndexedDB) est indépendante du service worker.

---

## Vie privée

- Aucune donnée envoyée sur Internet, aucun cloud, aucune API externe.
- Aucun analytics, aucun tracking, aucun compte.
- Les données de démonstration sont entièrement fictives.
