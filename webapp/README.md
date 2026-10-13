# Demande de subvention assistée (askForMoney)

Application web qui guide une association, étape par étape, dans le remplissage du **formulaire unique de demande de subvention (Cerfa n°12156\*06)**. Elle produit le **PDF officiel rempli**, prêt à signer. L'aide affichée à chaque champ reprend la **notice officielle n°51781#04**.

## Utilisation

- **Sans installation** : ouvrez `index.html` dans un navigateur récent (Edge, Chrome, Firefox, Safari). Tout fonctionne hors ligne.
- **En ligne** : copiez le dossier `webapp/` tel quel sur n'importe quel hébergement de fichiers statiques. Aucun serveur applicatif n'est nécessaire.

Parcours en 8 étapes, alignées sur les rubriques du Cerfa :

| Étape | Rubrique du Cerfa |
|---|---|
| 1. Nature de la demande | page 1 |
| 2. Identification | § 1 |
| 3. Relations | § 2 et 3 |
| 4. Moyens humains (calculateur d'ETPT) | § 4 |
| 5. Budget de l'association | § 5 |
| 6. Projet(s), avec budget par projet | § 6 (pages 5 à 7, répétées par projet) |
| 7. Équipements (demande en nature uniquement) | page 8 |
| 8. Attestations et aides d'État | § 7 et 7 bis |

Une dernière page contrôle le dossier, liste les pièces à joindre et génère le PDF.

## Où sont conservées les données ?

Aucune donnée ne quitte le navigateur.

1. **Sauvegarde automatique** dans le navigateur (`localStorage`). On reprend où l'on en était sur le même poste. Elle est perdue si l'on vide les données du navigateur.
2. **Fichier de sauvegarde** (`.json`), via le bouton « Enregistrer le fichier ». Il se rouvre dans n'importe quel navigateur ou sur un autre poste.
3. **Dossier joint au Cerfa PDF** généré (pièce jointe `dossier-askformoney.json`). Rouvrir ce PDF redonne le dossier complet. L'option « Préparer un renouvellement » décale alors les années d'un an.

Si le PDF n'a pas de pièce jointe (par exemple un Cerfa rempli à la main dans Acrobat), l'application relit les principaux champs du formulaire.

## Structure

```
webapp/
├── index.html              page unique
├── css/styles.css          charte du projet, version mobile
├── js/
│   ├── vendor/pdf-lib.min.js   pdf-lib 1.17.1 (licence MIT)
│   ├── cerfa-template.js   Cerfa officiel embarqué en base64 (généré)
│   ├── model.js            modèle du dossier, nomenclature budgétaire, calculs
│   ├── help.js             aide contextuelle issue de la notice
│   ├── pdf-fill.js         correspondance des 406 champs et remplissage du PDF
│   ├── validation.js       contrôles (erreurs et points à vérifier)
│   ├── storage.js          sauvegarde automatique, fichier .json, réimport PDF
│   ├── ui.js               moteur de formulaires (liaison champ ↔ chemin du dossier)
│   ├── steps.js            contenu des étapes et éditeur de budget
│   ├── sample.js           dossier d'exemple entièrement fictif
│   └── app.js              navigation, accueil, vérification, génération
├── assets/                 Cerfa et notice officiels (PDF)
├── tools/build_template.py régénère js/cerfa-template.js
└── tests/                  tests automatisés (Playwright + PyMuPDF)
```

Le code n'a pas besoin de compilation (JavaScript « classique », sans modules). C'est ce qui permet l'ouverture directe de `index.html` depuis le disque.

## Particularités du PDF officiel gérées par l'application

- **Totaux** : les scripts de calcul du PDF additionnent toutes les lignes 74-1 à 74-19. L'application remplit donc uniquement les lignes de détail des financeurs, jamais les lignes d'en-tête (État, Région…). Ainsi, Acrobat retrouve les mêmes totaux.
- **Montants** : ils sont écrits **sans séparateur de milliers**, faute de quoi les recalculs d'Acrobat seraient faux.
- **Financeurs en surnombre** : au-delà des lignes prévues (3 pour l'État, 2 pour les régions, 2 pour les départements, 3 pour les communes), les derniers financeurs sont regroupés sur la dernière ligne. L'application le signale.
- **Champs mal construits** :
  - « Check Box3 » (page 8) couvre deux cases : il est remplacé par des cases dessinées ;
  - « Text33 » sert à deux quantités : celles-ci sont dessinées ;
  - « 2/65-1 » est partagé par deux lignes du budget projet : seul le total du compte 65 est rempli.
- **Projets 2 et suivants** : leurs pages 5 à 7 sont remplies sur une copie du formulaire, aplaties, puis insérées après la page 7.
- **Fiche équipements** (page 8) : retirée si la demande n'est pas « en nature », comme le prévoit la notice.
- **Dates** : chaque champ reçoit le format attendu par ses scripts (`jj/mm/aaaa` ou `j/m/aa`).
- **Textes longs** : la taille des caractères s'adapte au cadre, jusqu'à 5 pt. Au-delà, l'application avertit l'utilisateur.

## Tests

Prérequis : Python 3.9+, `pip install playwright pymupdf`, et Microsoft Edge installé. Pour utiliser Chrome, définissez `BROWSER_CHANNEL=chrome`.

```
python tests/test_pdf.py   # remplissage du PDF : 20 vérifications sur le PDF produit
python tests/test_app.py   # parcours complet dans le navigateur, captures dans tests/out/
```

Si le Cerfa change de version, remplacez `assets/cerfa_12156-06.pdf`, lancez `python tools/build_template.py`, puis mettez à jour les noms de champs dans `js/pdf-fill.js`. Les tests signalent tout champ introuvable.

## Limites connues

- La signature se fait sur le PDF généré : signature électronique dans un lecteur PDF, ou impression puis signature manuscrite.
- Une demande pluriannuelle dont les budgets diffèrent d'une année à l'autre se saisit sous forme d'un « projet » par année.
- La version V2 prévue dans la présentation (comptes en ligne, travail à plusieurs) n'est pas incluse : elle nécessiterait un serveur.
