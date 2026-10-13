/* Aide contextuelle : contenus repris de la notice officielle n°51781#04
 * (assets/notice_51781_04.pdf). `page` = page de la notice où trouver le détail. */
(function (AFM) {
  'use strict';

  const H = {
    /* --- 0. Nature de la demande (notice p. 3-4) --- */
    'demande.intro': { page: 3, title: 'Le formulaire unique',
      text: "Le Cerfa 12156*06 sert aux subventions de <b>fonctionnement</b> : projets spécifiques ou fonctionnement global de l'association. Il <b>ne peut pas être utilisé pour une subvention d'investissement</b> (construction d'une structure d'accueil, par exemple), régie par le décret n° 2018-514. Un même formulaire peut porter plusieurs demandes ou projets, adressés à une ou plusieurs autorités administratives (co-financement)." },
    'demande.forme': { page: 3, title: 'Forme de la subvention',
      text: "<b>En numéraire</b> : versement d'une somme d'argent. <b>En nature</b> : aide autre que financière, pour un évènement ou une durée plus longue (prêt d'une salle, mise à disposition de matériel). Si vous cochez « en nature », la fiche « Demande d'équipements » sera ajoutée. Vous pouvez cocher les deux." },
    'demande.recurrence': { page: 3, title: 'Première demande ou renouvellement',
      text: "<b>Première demande</b> : première sollicitation de cette administration, ou demande pour un nouveau projet ou une nouvelle activité. <b>Renouvellement</b> : nouvelle subvention, pour le même objet et auprès de la même autorité, dans la continuité de la précédente." },
    'demande.objet': { page: 3, title: 'Objet de la subvention',
      text: "<b>Fonctionnement global</b> : participer au fonctionnement de l'association, sans projet précis (exemple : des locaux pour ses bureaux). <b>Projet(s)/action(s)</b> : mettre en œuvre un ou plusieurs projets portés par l'association." },
    'demande.periode': { page: 3, title: 'Période', text: "La subvention peut être demandée pour une ou plusieurs années ou exercices. Une demande pluriannuelle impose un budget par année et par projet." },
    'demande.dest': { page: 4, title: 'Autorités sollicitées',
      text: "Envoyez la demande à <b>chaque</b> autorité administrative sollicitée, y compris pour un même objet, en adaptant son contenu. Précisez sur chacun des formulaires, notamment dans les budgets, <b>l'intégralité</b> des autorités sollicitées. Coordonnées des services : <a href=\"https://lannuaire.service-public.fr/\" target=\"_blank\" rel=\"noopener\">lannuaire.service-public.fr</a>." },
    'demande.investissement': { page: 1, title: "Subvention d'investissement",
      text: "Ce formulaire n'est pas adapté : les subventions d'investissement de l'État relèvent du décret n° 2018-514 du 25 juin 2018. Renseignez-vous auprès du financeur sur le dossier à utiliser." },

    /* --- 1. Identification (notice p. 4-5) --- */
    'identification.siret': { page: 4, title: 'Numéro SIRET',
      text: "Obligatoire pour que l'autorité publique puisse <b>verser</b> une subvention. Pour l'obtenir, écrivez à la direction régionale de l'INSEE compétente en joignant une copie des statuts et de l'extrait paru au Journal officiel. Le SIRET compte 14 chiffres." },
    'identification.rna': { page: 4, title: 'Numéro RNA',
      text: "Attribué lors de l'enregistrement de la création, d'un changement de dirigeants ou d'une modification des statuts en préfecture : un <b>W suivi de 9 chiffres</b>. Les associations du Bas-Rhin, du Haut-Rhin et de la Moselle n'en ont pas. Retrouvez vos informations sur <a href=\"https://dataasso.fr/\" target=\"_blank\" rel=\"noopener\">dataasso.fr</a>." },
    'identification.registre': { page: 5, title: "Inscription au registre (Alsace-Moselle)",
      text: "Concerne uniquement les associations du Bas-Rhin, du Haut-Rhin et de la Moselle, enregistrées au tribunal : indiquez le tribunal, le volume et le folio figurant sur l'attestation remise." },
    'identification.representant': { page: 5, title: 'Représentant légal',
      text: "La personne désignée par les statuts (par exemple le président du conseil d'administration) ou par une décision de l'assemblée générale. Elle signe les contrats et les demandes de subvention. Une autre personne ne peut signer qu'avec un <b>mandat</b> spécifique, dans le respect des statuts." },

    /* --- 2-3. Relations (notice p. 5-6) --- */
    'relations.agrements': { page: 5, title: 'Agréments administratifs',
      text: "Certaines subventions sont conditionnées par un agrément (par exemple « Jeunesse et éducation populaire » pour le ministère chargé de la jeunesse). Indiquez le type d'agrément, l'autorité qui l'a attribué et sa date." },
    'relations.impots': { page: 6, title: 'Impôts commerciaux',
      text: "En principe une association n'y est pas soumise : « non » est la réponse par défaut. Cochez « oui » si l'association est assujettie à la TVA ou à l'impôt sur les sociétés ; cela détermine si la subvention est « hors taxes » ou « TTC »." },
    'relations.rup': { page: 19, title: "Reconnaissance d'utilité publique",
      text: "Les associations reconnues d'utilité publique sont réputées avoir souscrit au contrat d'engagement républicain. Indiquez la date de publication au Journal officiel." },
    'relations.reseau': { page: 5, title: 'Réseau, union ou fédération',
      text: "Ces informations aident l'autorité à appréhender l'activité de l'association et son environnement. Indiquez le nom complet, sans sigle." },

    /* --- 4. Moyens humains (notice p. 6) --- */
    'moyens.intro': { page: 6, title: 'Moyens humains au 31 décembre',
      text: "Dressez l'état des moyens humains au 31 décembre de la dernière année écoulée." },
    'moyens.etpt': { page: 6, title: 'Équivalent temps plein travaillé (ETPT)',
      text: "Effectifs pondérés par la quotité de travail et la durée de présence. Exemple de la notice : 1 salarié à temps plein toute l'année (1) + 1 salarié à 80 % toute l'année (0,8) + 1 salarié à 80 % recruté le 1er juillet (0,8 × 6/12 = 0,4) = <b>2,2 ETPT</b>. Utilisez le calculateur ci-dessous." },

    /* --- 5. Budget (notice p. 7-12) --- */
    'budget.intro': { page: 7, title: 'Budget prévisionnel',
      text: "Un budget prévisionnel est construit pour l'avenir, au plus près de la réalité des coûts et des recettes, à partir des années écoulées. Il est conseillé de prévoir un poste « imprévus » (par exemple 5 % du budget). Ne pas indiquer les centimes." },
    'budget.equilibre': { page: 7, title: "L'équilibre du budget",
      text: "La pratique recommande un budget à l'équilibre, mais <b>aucune réglementation ne l'impose</b> (sauf établissements sociaux et médico-sociaux). Un excédent ou une insuffisance est possible : expliquez l'affectation de l'excédent ou les perspectives de retour à l'équilibre." },
    'budget.cvn': { page: 11, title: 'Contributions volontaires en nature (CVN)',
      text: "Bénévolat, mises à disposition de personnes, de biens ou de locaux, dons en nature. Leur valorisation fait apparaître l'ensemble des aides reçues et peut <b>relever le plafond de subvention</b> : avec un plafond de financement public de 60 %, un projet de 3 000 € permet 1 800 € de subvention ; valorisé avec 1 000 € de bénévolat, il en permet 2 400 €. Les totaux 86 (emplois) et 87 (contributions) <b>doivent être égaux</b>." },
    'budget.74': { page: 10, title: "Subventions d'exploitation (74)",
      text: "Listez <b>toutes</b> les autorités sollicitées, en précisant les ministères, directions ou services pour l'État. Ces indications valent <b>déclaration sur l'honneur</b> et tiennent lieu de justificatifs." },
    'budget.lines': { page: 9, title: 'Où classer une dépense ?',
      text: "60 : fournitures, petits équipements, énergie. 61 : loyers, entretien, assurances, documentation. 62 : honoraires, communication, déplacements, frais bancaires. 63 : taxes sur les salaires, taxe foncière. 64 : salaires bruts et cotisations sociales. 66 : intérêts d'emprunt. 67 : dépenses inhabituelles. 68 : amortissements (exemple : véhicule de 20 000 € sur 5 ans = 4 000 € par an)." },
    'budget.benevolat': { page: 11, title: 'Valoriser le bénévolat',
      text: "Estimez le nombre d'heures données gracieusement et une valeur horaire réaliste (prix qu'aurait coûté le service dans des conditions normales de marché). Le montant est inscrit à la fois en 864 (personnel bénévole) et en 875 (bénévolat)." },

    /* --- 6. Projet (notice p. 14-18) --- */
    'projet.intro': { page: 14, title: 'Présenter le projet',
      text: "Le soin apporté à la description est <b>déterminant</b> pour l'obtention de la subvention : clarté et cohérence entre objectifs, actions et indicateurs. Proportionnez le niveau de détail à l'importance du projet. Pour une demande de fonctionnement global, présentez le projet associatif : son budget est celui de l'association." },
    'projet.intitule': { page: 15, title: 'Intitulé',
      text: "Il donne une idée globale du projet, de sa philosophie et des valeurs qu'il porte. « Un excellent projet, c'est un bon projet avec un bon titre ! » Exemple : « Territoire 0 chômeur de longue durée »." },
    'projet.objectifs': { page: 14, title: 'Objectifs',
      text: "Partez du problème ou du besoin auquel le projet répond. Déclinez un <b>objectif général</b>, des <b>objectifs spécifiques</b> et des <b>objectifs opérationnels</b> (verbes d'action). Des objectifs SMART (spécifiques, mesurables, accessibles, réalistes, temporellement définis) facilitent l'évaluation. En politique de la ville, rattachez-les aux axes du contrat de ville." },
    'projet.description': { page: 15, title: 'Description',
      text: "Présentez la phase opérationnelle : objectifs opérationnels, actions, activités et leur calendrier. Les financeurs doivent percevoir concrètement ce que vous allez réaliser." },
    'projet.beneficiaires': { page: 5, title: 'Bénéficiaires',
      text: "Caractéristiques sociales, dans le respect des valeurs d'égalité et de fraternité de la République (ouverture à tous, mixité, égalité femmes-hommes, non-discrimination) : nombre, âge, sexe, résidence, participation financière éventuelle." },
    'projet.moyens': { page: 15, title: 'Moyens matériels et humains',
      text: "Ne confondez pas moyens et objectifs : publier un guide est une action ; l'équipe de bénévoles qui le rédige est un moyen. Les moyens montrent la faisabilité et éclairent le financeur sur l'utilisation de la subvention." },
    'projet.evaluation': { page: 15, title: 'Évaluation et indicateurs',
      text: "Un projet non évaluable ne peut pas être subventionné. Pour chaque objectif, proposez des indicateurs datés et chiffrés : de <b>réalisation</b> (moyens mis en œuvre, actions réalisées), de <b>résultat</b> (effets obtenus), d'<b>impact</b> (retombées à moyen et long terme)." },
    'projet.budget': { page: 18, title: 'Budget du projet',
      text: "Mêmes règles que le budget de l'association, avec en plus les <b>charges indirectes</b> réparties (frais de siège ventilés selon une règle objective) et les <b>ressources propres</b> affectées (prélèvement sur réserves). Pour un projet pluriannuel, un budget par année. Les subventions publiques ne doivent pas excéder le coût du projet augmenté d'un excédent raisonnable (sinon : surcompensation)." },
    'projet.subvention': { page: 7, title: 'Subvention sollicitée',
      text: "Montant demandé dans la présente demande, et sa part dans le total des produits du projet, contributions volontaires comprises." },

    /* --- Équipements (notice p. 13) --- */
    'equipement.intro': { page: 13, title: "Demande d'équipements",
      text: "Fiche à remplir uniquement pour une subvention <b>en nature</b>. Pour une manifestation, déposez-la au moins un mois avant. Les rubriques de livraison et d'état des lieux sont complétées plus tard, si la subvention est accordée." },

    /* --- 7. Attestations (notice p. 19-20) --- */
    'attestations.intro': { page: 19, title: 'Attestations',
      text: "Les informations doivent être sincères et exactes. La signature vaut souscription au <b>contrat d'engagement républicain</b> (obligation réputée satisfaite pour les associations agréées au titre du tronc commun ou reconnues d'utilité publique)." },
    'attestations.aides': { page: 19, title: 'Aides publiques sur trois exercices',
      text: "Montant total et cumulé des aides publiques (financières et en nature) perçues sur les trois derniers exercices, dont l'exercice en cours. Exemple : demande le 1er février 2017, exercice du 1er septembre au 31 août → exercice en cours, exercices clos au 31 août 2016 et 2015." },
    'attestations.demandes': { page: 19, title: 'Montants demandés',
      text: "Pour plusieurs projets, indiquez la <b>somme</b> des subventions demandées pour chaque année. Exemple : 6 000 € pour un projet A sur 3 ans et 9 000 € pour un projet B sur 3 ans → 5 000 € par an. Non applicable à une demande uniquement en nature." },
    'attestations.signataire': { page: 5, title: 'Signataire',
      text: "Si le signataire n'est pas le représentant légal, joignez le pouvoir ou mandat portant les deux signatures." },
    'aidesEtat.intro': { page: 19, title: "Rubrique 7 bis : aides d'État",
      text: "À remplir <b>seulement</b> si l'association intervient dans un champ économique et a reçu, sur les 3 derniers exercices, des subventions attribuées sur la base d'un texte européen (« Décision Almunia », règlement de minimis, régime d'aide exempté…). La base juridique figure sur l'acte d'attribution (souvent article 1 ou 2)." },

    /* --- Pièces (notice p. 21) --- */
    'pieces.intro': { page: 21, title: 'Pièces à joindre',
      text: "Grâce au principe « Dites-le-nous une fois », les pièces sont réduites au minimum. Le <b>RIB</b> est à joindre sauf s'il est déjà en possession de l'autorité (BIC et IBAN suffisent). Les statuts et la liste des dirigeants sont accessibles via le RNA. Fournissez les états financiers approuvés du dernier exercice clos si vos comptes ne sont pas publiés au Journal officiel." },
  };

  /* Liste des agréments les plus courants (notice p. 5-6). */
  const AGREMENTS = [
    'Agrément des associations sportives', 'Agrément des fédérations sportives',
    'Agrément des associations sportives non affiliées à une fédération sportive agréée',
    'Agrément « Jeunesse Éducation Populaire »', 'Agrément des associations de supporters',
    "Agrément d'association éducative complémentaire de l'enseignement public",
    "Agrément des associations au titre de la protection de l'environnement",
    "Agrément des organismes de surveillance de la qualité de l'air",
    'Agrément des associations de pêche et de protection du milieu aquatique',
    'Agrément des associations de pêcheurs professionnels',
    'Agrément des associations communales et intercommunales de chasse',
    'Agrément des associations de défense de la langue française',
    'Agrément des associations chargées du parcours de sortie de la prostitution',
    "Agrément des centres d'information sur les droits des femmes et des familles",
    "Agrément des associations d'usagers du système de santé",
    'Agrément des associations pour la formation aux premiers secours',
    'Agrément des associations de sécurité civile',
    "Agrément des associations d'aide aux victimes d'infractions",
    "Agrément des associations de défense des victimes d'accidents collectifs",
    'Agrément des associations de lutte contre la corruption',
    "Agrément des associations d'insertion par la formation à la conduite et à la sécurité routière",
    'Association de défense des investisseurs', 'Agrément des associations de défense des consommateurs',
    "Agrément d'association des professions libérales"];

  AFM.help = { H: H, AGREMENTS: AGREMENTS, NOTICE_URL: 'assets/notice_51781_04.pdf' };
})(window.AFM = window.AFM || {});
