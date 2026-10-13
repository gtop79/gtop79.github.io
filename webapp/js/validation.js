/* Contrôles de complétude et de cohérence. level : 'error' (à corriger) ou 'warning' (à vérifier). */
(function (AFM) {
  'use strict';
  const M = AFM.model;

  function blank(v) { return v === undefined || v === null || String(v).trim() === ''; }

  /* Clé de Luhn (le SIRET la respecte, sauf les établissements de La Poste). */
  function luhn(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let n = +digits[digits.length - 1 - i];
      if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return sum % 10 === 0;
  }
  function siretOk(s) {
    const d = String(s || '').replace(/\s/g, '');
    if (!/^\d{14}$/.test(d)) return 'format';
    if (d.indexOf('356000000') === 0) return 'ok';
    return luhn(d) ? 'ok' : 'cle';
  }
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function budgetIssues(b, isProject, step, base, label, out) {
    const t = M.computeBudget(b, isProject);
    const add = function (path, level, msg) { out.push({ step: step, path: base + path, level: level, msg: label + msg }); };
    if (blank(b.annee) && blank(b.du)) add('.annee', 'warning', 'indiquez l\'année ou les dates de l\'exercice.');
    if (!blank(b.du) && !blank(b.au) && b.du > b.au) add('.au', 'error', 'la fin de l\'exercice précède son début.');
    if (t.charges <= 0) add('.v', 'error', 'aucune charge n\'est renseignée.');
    if (t.produits <= 0) add('.funders', 'error', 'aucun produit n\'est renseigné.');
    if (t.charges > 0 && t.produits > 0 && Math.round(t.resultat) !== 0) {
      add('.resultat', 'warning', (t.resultat > 0 ? 'excédent' : 'insuffisance') + ' prévisionnel(le) de ' + M.fmtEuro(Math.abs(t.resultat)) +
        ' : possible, mais à expliquer (notice p. 7).');
    }
    if (Math.round(t.cvnCharges) !== Math.round(t.cvnProduits)) {
      add('.cvn', 'error', 'les contributions volontaires en nature doivent être équilibrées : emplois (86) ' +
        M.fmtEuro(t.cvnCharges) + ' ≠ contributions (87) ' + M.fmtEuro(t.cvnProduits) + '.');
    }
    M.FUNDERS.forEach(function (f) {
      if (f.single) return;
      const list = (b.funders[f.key] || []).filter(function (r) { return !blank(r.nom) || M.num(r.montant); });
      if (list.length > f.rows) {
        add('.funders.' + f.key, 'warning', f.label + ' : ' + list.length + ' financeurs pour ' + f.rows +
          ' lignes dans le Cerfa ; les derniers seront regroupés sur la dernière ligne.');
      }
      list.forEach(function (r, i) {
        if (M.num(r.montant) && blank(r.nom)) add('.funders.' + f.key + '.' + i + '.nom', 'error', f.label + ' : précisez le financeur.');
      });
    });
    return t;
  }

  function validate(d) {
    const out = [];
    const add = function (step, path, level, msg) { out.push({ step: step, path: path, level: level, msg: msg }); };
    const dm = d.demande;

    // Nature de la demande
    if (!dm.numeraire && !dm.nature) add('demande', 'demande.numeraire', 'error', 'Choisissez la forme de la subvention (numéraire et/ou nature).');
    if (blank(dm.recurrence)) add('demande', 'demande.recurrence', 'error', 'Indiquez s\'il s\'agit d\'une première demande ou d\'un renouvellement.');
    if (!dm.fonctionnement && !dm.projets) add('demande', 'demande.fonctionnement', 'error', 'Choisissez l\'objet : fonctionnement global et/ou projet(s).');
    if (blank(dm.periode)) add('demande', 'demande.periode', 'error', 'Indiquez la période (annuelle ou pluriannuelle).');
    if (dm.investissement) add('demande', 'demande.investissement', 'warning', 'Ce formulaire ne convient pas aux subventions d\'investissement (notice p. 1).');
    const dest = dm.dest;
    const anyDest = Object.keys(dest).some(function (k) { return dest[k].on; });
    if (!anyDest) add('demande', 'demande.dest', 'error', 'Cochez au moins une autorité destinataire.');
    Object.keys(dest).forEach(function (k) {
      if (dest[k].on && blank(dest[k].nom)) add('demande', 'demande.dest.' + k + '.nom', 'error', 'Précisez l\'autorité destinataire cochée.');
    });

    // Identification
    const id = d.identification;
    if (blank(id.nom)) add('identification', 'identification.nom', 'error', 'Indiquez le nom de l\'association.');
    if (blank(id.siret)) add('identification', 'identification.siret', 'warning', 'Sans SIRET, l\'autorité ne pourra pas verser la subvention (notice p. 4).');
    else {
      const s = siretOk(id.siret);
      if (s === 'format') add('identification', 'identification.siret', 'error', 'Le SIRET compte 14 chiffres.');
      else if (s === 'cle') add('identification', 'identification.siret', 'warning', 'Ce SIRET semble erroné (clé de contrôle) : vérifiez-le.');
    }
    if (!id.alsaceMoselle) {
      if (blank(id.rna)) add('identification', 'identification.rna', 'warning', 'Indiquez le numéro RNA (ou celui du récépissé de préfecture).');
      else if (!/^W\d{9}$/i.test(String(id.rna).replace(/\s/g, ''))) add('identification', 'identification.rna', 'warning', 'Un numéro RNA est un W suivi de 9 chiffres (notice p. 4).');
    } else if (blank(id.registre.tribunal) || blank(id.registre.volume) || blank(id.registre.folio)) {
      add('identification', 'identification.registre.tribunal', 'warning', 'Indiquez le tribunal, le volume et le folio de l\'inscription au registre.');
    }
    if (blank(id.siege.adresse)) add('identification', 'identification.siege.adresse', 'error', 'Indiquez l\'adresse du siège social.');
    if (!/^\d{5}$/.test(String(id.siege.cp || '').replace(/\s/g, ''))) add('identification', 'identification.siege.cp', 'error', 'Le code postal compte 5 chiffres.');
    if (blank(id.siege.commune)) add('identification', 'identification.siege.commune', 'error', 'Indiquez la commune du siège.');
    ['nom', 'prenom', 'fonction'].forEach(function (k) {
      if (blank(id.representant[k])) add('identification', 'identification.representant.' + k, 'error', 'Complétez l\'identité du représentant légal.');
    });
    [['representant', true], ['charge', id.chargeDifferente]].forEach(function (p) {
      if (!p[1]) return;
      const c = id[p[0]].courriel;
      if (!blank(c) && !EMAIL.test(c)) add('identification', 'identification.' + p[0] + '.courriel', 'error', 'Adresse électronique invalide.');
    });
    if (id.chargeDifferente && blank(id.charge.nom)) add('identification', 'identification.charge.nom', 'error', 'Indiquez la personne chargée de la demande.');

    // Relations
    const r = d.relations;
    if (r.agrements === 'oui' && !(r.agrementsListe || []).some(function (a) { return !blank(a.type); })) {
      add('relations', 'relations.agrementsListe', 'error', 'Précisez au moins un agrément.');
    }
    if (r.rup === 'oui' && blank(r.rupDate)) add('relations', 'relations.rupDate', 'warning', 'Indiquez la date de publication au Journal officiel.');
    if (r.adherentsPM === 'oui' && blank(r.adherentsPMListe)) add('relations', 'relations.adherentsPMListe', 'warning', 'Précisez les adhérents personnes morales.');

    // Moyens humains
    const mo = d.moyens;
    if (M.num(mo.etpt) > M.num(mo.salaries) && M.num(mo.salaries) > 0) add('moyens', 'moyens.etpt', 'warning', 'Le nombre d\'ETPT dépasse le nombre de salariés.');
    if (M.num(mo.emploisAides) > M.num(mo.salaries)) add('moyens', 'moyens.emploisAides', 'warning', 'Les emplois aidés font partie des salariés.');

    // Budget de l'association
    budgetIssues(d.budget, false, 'budget', 'budget', 'Budget de l\'association : ', out);

    // Projets
    d.projets.forEach(function (p, i) {
      const base = 'projets.' + i;
      const lbl = 'Projet ' + (i + 1) + ' : ';
      if (blank(p.intitule)) add('projets', base + '.intitule', 'error', lbl + 'indiquez l\'intitulé.');
      if (blank(p.objectifs)) add('projets', base + '.objectifs', 'error', lbl + 'décrivez les objectifs.');
      if (blank(p.description)) add('projets', base + '.description', 'warning', lbl + 'la description est déterminante pour la décision.');
      if (blank(p.evaluation)) add('projets', base + '.evaluation', 'warning', lbl + 'proposez des indicateurs d\'évaluation (notice p. 15).');
      if (!blank(p.dateDebut) && !blank(p.dateFin) && p.dateDebut > p.dateFin) add('projets', base + '.dateFin', 'error', lbl + 'la date de fin précède la date de début.');
      const t = budgetIssues(p.budget, true, 'projets', base + '.budget', lbl + 'budget — ', out);
      if (dm.numeraire && !M.num(p.subvention)) add('projets', base + '.subvention', 'warning', lbl + 'indiquez la subvention sollicitée.');
      if (t.subventions > t.charges && t.charges > 0) {
        add('projets', base + '.budget.funders', 'warning', lbl + 'les subventions dépassent le coût du projet : risque de surcompensation (notice p. 18).');
      }
    });

    // Équipements
    if (dm.nature) {
      const e = d.equipement;
      if (blank(e.type)) add('equipement', 'equipement.type', 'error', 'Choisissez le type de demande d\'équipement.');
      if (e.type === 'manifestation') {
        if (blank(e.manif.titre)) add('equipement', 'equipement.manif.titre', 'error', 'Indiquez le nom de la manifestation.');
        if (blank(e.manif.date)) add('equipement', 'equipement.manif.date', 'error', 'Indiquez la date de la manifestation.');
        else if (!blank(e.dateDemande)) {
          const limit = new Date(e.manif.date);
          limit.setMonth(limit.getMonth() - 1);
          if (new Date(e.dateDemande) > limit) add('equipement', 'equipement.dateDemande', 'warning', 'La fiche doit être déposée au moins un mois avant la manifestation.');
        }
      }
    }

    // Attestations
    const at = d.attestations;
    if (blank(at.signataire)) add('attestations', 'attestations.signataire', 'error', 'Indiquez le nom et le prénom du signataire.');
    if (blank(at.aidesPubliques)) add('attestations', 'attestations.aidesPubliques', 'error', 'Indiquez le montant cumulé des aides publiques sur trois exercices.');
    if (dm.numeraire && !(at.demandes || []).some(function (x) { return M.num(x.montant); })) {
      add('attestations', 'attestations.demandes', 'error', 'Indiquez le montant de subvention demandé et l\'année.');
    }
    (at.demandes || []).forEach(function (x, i) {
      if (M.num(x.montant) && blank(x.annee)) add('attestations', 'attestations.demandes.' + i + '.annee', 'error', 'Précisez l\'année ou l\'exercice de chaque montant demandé.');
    });
    if (blank(at.faitLe) || blank(at.faitA)) add('attestations', 'attestations.faitLe', 'warning', 'Date et lieu de signature à compléter (possible au moment de signer).');
    const rep = (id.representant.nom + ' ' + id.representant.prenom).toLowerCase().replace(/\s+/g, ' ').trim();
    const sig = String(at.signataire || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (sig && rep.trim() && sig !== rep && sig !== (id.representant.prenom + ' ' + id.representant.nom).toLowerCase().trim()) {
      add('attestations', 'attestations.signataire', 'warning', 'Le signataire n\'est pas le représentant légal : joignez le pouvoir ou mandat signé par les deux personnes.');
    }
    if (d.aidesEtat.concerne && !(d.aidesEtat.lignes || []).some(function (l) { return !blank(l.autorite) || M.num(l.montant); })) {
      add('attestations', 'aidesEtat.lignes', 'error', 'Rubrique 7 bis cochée : renseignez au moins une aide.');
    }
    return out;
  }

  AFM.validation = { validate: validate, siretOk: siretOk };
})(window.AFM = window.AFM || {});
