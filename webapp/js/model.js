/* Modèle de données du dossier, nomenclature budgétaire du Cerfa 12156*06 et calculs. */
(function (AFM) {
  'use strict';

  const SCHEMA = 'askformoney.dossier';
  const VERSION = 1;

  /* Nomenclature des budgets (association : page 4, projet : page 7).
   * `custom` : ligne dont le libellé est saisi par l'utilisateur. */
  const CHARGES = [
    { code: '60', label: 'Achats', lines: [
      { key: '601', label: 'Achats matières et fournitures' },
      { key: '602', label: 'Autres fournitures' },
      { key: '60x', custom: true, placeholder: 'Autre achat (préciser)' }] },
    { code: '61', label: 'Services extérieurs', lines: [
      { key: '613', label: 'Locations' },
      { key: '615', label: 'Entretien et réparation' },
      { key: '616', label: 'Assurance' },
      { key: '618', label: 'Documentation' },
      { key: '61x', custom: true, placeholder: 'Autre service extérieur (préciser)' }] },
    { code: '62', label: 'Autres services extérieurs', lines: [
      { key: '622', label: 'Rémunérations intermédiaires et honoraires' },
      { key: '623', label: 'Publicité, publication' },
      { key: '625', label: 'Déplacements, missions' },
      { key: '627', label: 'Services bancaires, autres' }] },
    { code: '63', label: 'Impôts et taxes', lines: [
      { key: '631', label: 'Impôts et taxes sur rémunération' },
      { key: '635', label: 'Autres impôts et taxes' }] },
    { code: '64', label: 'Charges de personnel', lines: [
      { key: '641', label: 'Rémunération des personnels' },
      { key: '645', label: 'Charges sociales' },
      { key: '647', label: 'Autres charges de personnel' }] },
    { code: '65', label: 'Autres charges de gestion courante', projectSingle: true, lines: [
      { key: '65a', custom: true, placeholder: 'Préciser' },
      { key: '65b', custom: true, placeholder: 'Préciser' }] },
    { code: '66', label: 'Charges financières' },
    { code: '67', label: 'Charges exceptionnelles' },
    { code: '68', label: 'Dotations aux amortissements, provisions et engagements' },
    { code: '69', label: 'Impôt sur les bénéfices (IS) ; participation des salariés' }];

  const PRODUITS = [
    { code: '70', label: 'Vente de produits finis, de marchandises, prestations de services' },
    { code: '73', label: 'Concours publics' },
    { code: '74', label: "Subventions d'exploitation", funders: true },
    { code: '75', label: 'Autres produits de gestion courante', lines: [
      { key: '756', label: 'Cotisations' },
      { key: '758', label: 'Dons manuels – mécénat' }] },
    { code: '76', label: 'Produits financiers' },
    { code: '77', label: 'Produits exceptionnels' },
    { code: '78', label: 'Reprises sur amortissements, dépréciations et provisions' },
    { code: '79', label: 'Transfert de charges' }];

  /* Financeurs publics et privés (compte 74). `rows` = nombre de lignes nommées dans le Cerfa. */
  const FUNDERS = [
    { key: 'etat', label: 'État', rows: 3, placeholder: 'Ministère, direction ou service déconcentré' },
    { key: 'region', label: 'Conseil(s) régional(aux)', rows: 2, placeholder: 'Région' },
    { key: 'departement', label: 'Conseil(s) départemental(aux)', rows: 2, placeholder: 'Département' },
    { key: 'communes', label: "Communes, communautés de communes ou d'agglomérations", rows: 3,
      placeholder: 'Commune ou intercommunalité' },
    { key: 'organismesSociaux', label: 'Organismes sociaux (CAF, etc.)', single: true },
    { key: 'europe', label: 'Fonds européens (FSE, FEDER, etc.)', single: true },
    { key: 'asp', label: "Agence de services et de paiement (emplois aidés)", single: true },
    { key: 'autresEP', label: 'Autres établissements publics', single: true },
    { key: 'prives', label: 'Aides privées (fondation)', single: true }];

  const CVN_CHARGES = [
    { key: '860', label: 'Secours en nature' },
    { key: '861', label: 'Mise à disposition gratuite de biens et services' },
    { key: '862', label: 'Prestations' },
    { key: '864', label: 'Personnel bénévole' }];
  const CVN_PRODUITS = [
    { key: '870', label: 'Dons en nature' },
    { key: '871', label: 'Prestations en nature' },
    { key: '87x', custom: true, placeholder: 'Autre contribution (préciser)' },
    { key: '875', label: 'Bénévolat' }];

  function emptyBudget() {
    const funders = {};
    FUNDERS.forEach(function (f) { funders[f.key] = f.single ? '' : []; });
    return {
      annee: '', du: '', au: '',
      v: {},          // montants par clé de ligne ou code de groupe
      labels: {},     // libellés des lignes personnalisées
      funders: funders,
      indirect: { cff: '', ff: '', autres: '' },              // projet uniquement
      propres: [{ label: '', montant: '' }, { label: '', montant: '' }, { label: '', montant: '' }],
    };
  }

  function emptyPerson() {
    return { nom: '', prenom: '', fonction: '', telephone: '', courriel: '' };
  }

  function emptyProject() {
    return {
      intitule: '', politiqueVille: false, contratVille: '',
      objectifs: '', description: '', beneficiaires: '', territoire: '', moyens: '',
      rh: {
        benevoles: { n: '', etpt: '' }, salaries: { n: '', etpt: '' }, cdi: { n: '', etpt: '' },
        cdd: { n: '', etpt: '' }, aides: { n: '', etpt: '' }, volontaires: { n: '', etpt: '' },
      },
      recrutement: '', recrutementEtpt: '',
      dateDebut: '', dateFin: '', evaluation: '',
      budget: emptyBudget(),
      subvention: '',
    };
  }

  function newDossier() {
    return {
      schema: SCHEMA, version: VERSION, createdAt: new Date().toISOString(), updatedAt: null,
      demande: {
        numeraire: false, nature: false, recurrence: '', fonctionnement: false, projets: false, periode: '',
        investissement: false,
        dest: {
          etat: { on: false, nom: '', service: '' }, region: { on: false, nom: '', service: '' },
          departement: { on: false, nom: '', service: '' }, commune: { on: false, nom: '', service: '' },
          etablissement: { on: false, nom: '' }, autre: { on: false, nom: '' },
        },
      },
      identification: {
        nom: '', sigle: '', siteWeb: '', siret: '', rna: '', alsaceMoselle: false,
        registre: { date: '', volume: '', folio: '', tribunal: '' },
        siege: { adresse: '', cp: '', commune: '', deleguee: '' },
        gestionDifferente: false, gestion: { adresse: '', cp: '', commune: '', deleguee: '' },
        representant: emptyPerson(), chargeDifferente: false, charge: emptyPerson(),
      },
      relations: {
        agrements: '', agrementsListe: [{ type: '', par: '', date: '' }],
        rup: '', rupDate: '', impotsCommerciaux: 'non',
        reseau: '', adherentsPM: '', adherentsPMListe: '', sportive: false,
      },
      moyens: { benevoles: '', volontaires: '', salaries: '', emploisAides: '', etpt: '', misADisposition: '', adherents: '' },
      budget: emptyBudget(),
      projets: [emptyProject()],
      equipement: {
        projet: '', dateDemande: '', type: '',
        manif: { date: '', titre: '', descriptif: '', personnes: '', debutH: '', debutM: '', finH: '', finM: '' },
        perm: { debut: '', fin: '', besoin: '', beneficiaires: '' },
        sites: { parc: '', voie: '', stade: '', salle: '', specifique: '', autre: '' },
        materiel: {}, securite: { deH: '', deM: '', aH: '', aM: '', gardiennage: '' },
      },
      attestations: {
        signataire: '', mandat: false, aidesPubliques: '', demandes: [{ montant: '', annee: '' }],
        faitLe: '', faitA: '',
      },
      aidesEtat: { concerne: false, lignes: [{ date: '', annees: '', base: '', autorite: '', montant: '' }] },
      pieces: {},
    };
  }

  /* Complète un dossier importé avec les clés manquantes (fichiers d'anciennes versions ou partiels). */
  function normalize(d) {
    const base = newDossier();
    function merge(target, src) {
      if (src === null || typeof src !== 'object' || Array.isArray(src)) return src === undefined ? target : src;
      const out = Array.isArray(target) ? [] : Object.assign({}, target);
      Object.keys(src).forEach(function (k) {
        out[k] = (target && typeof target[k] === 'object' && target[k] !== null && !Array.isArray(target[k]))
          ? merge(target[k], src[k]) : src[k];
      });
      return out;
    }
    const out = merge(base, d || {});
    out.projets = (Array.isArray(out.projets) && out.projets.length ? out.projets : [emptyProject()])
      .map(function (p) {
        const m = merge(emptyProject(), p);
        m.budget = merge(emptyBudget(), p.budget || {});
        return m;
      });
    out.budget = merge(emptyBudget(), (d && d.budget) || {});
    out.schema = SCHEMA;
    out.version = VERSION;
    return out;
  }

  /* --- Nombres ---------------------------------------------------------------- */
  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const s = String(v).replace(/\s| |€/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function round(n) { return Math.round(n); }
  function fmtEuro(n) {
    return round(n).toLocaleString('fr-FR') + ' €';
  }

  /* --- Calculs budgétaires -------------------------------------------------------- */
  function groupLines(group, isProject) {
    if (!group.lines || (isProject && group.projectSingle)) return null;
    return group.lines;
  }

  function funderRowsTotal(b, f) {
    const v = b.funders[f.key];
    if (f.single) return num(v);
    return (v || []).reduce(function (s, r) { return s + num(r.montant); }, 0);
  }

  function computeBudget(b, isProject) {
    const t = { groups: {}, charges: 0, produits: 0, cvnCharges: 0, cvnProduits: 0 };
    CHARGES.forEach(function (g) {
      const lines = groupLines(g, isProject);
      const sum = lines ? lines.reduce(function (s, l) { return s + num(b.v[l.key]); }, 0) : num(b.v[g.code]);
      t.groups[g.code] = sum;
      t.charges += sum;
    });
    PRODUITS.forEach(function (g) {
      let sum;
      if (g.funders) sum = FUNDERS.reduce(function (s, f) { return s + funderRowsTotal(b, f); }, 0);
      else if (g.lines) sum = g.lines.reduce(function (s, l) { return s + num(b.v[l.key]); }, 0);
      else sum = num(b.v[g.code]);
      t.groups[g.code] = sum;
      t.produits += sum;
    });
    if (isProject) {
      t.indirect = num(b.indirect.cff) + num(b.indirect.ff) + num(b.indirect.autres);
      t.propres = (b.propres || []).reduce(function (s, r) { return s + num(r.montant); }, 0);
      t.charges += t.indirect;
      t.produits += t.propres;
    }
    t.cvnCharges = CVN_CHARGES.reduce(function (s, l) { return s + num(b.v[l.key]); }, 0);
    t.cvnProduits = CVN_PRODUITS.reduce(function (s, l) { return s + num(b.v[l.key]); }, 0);
    t.resultat = t.produits - t.charges;               // > 0 excédent, < 0 insuffisance
    t.totalCharges = t.charges + t.cvnCharges;
    t.totalProduits = t.produits + t.cvnProduits;
    t.subventions = t.groups['74'];
    return t;
  }

  /* Répartit les financeurs saisis sur les lignes disponibles du Cerfa : au-delà, les
   * derniers sont regroupés sur la dernière ligne (libellés concaténés, montants cumulés). */
  function funderRowsForPdf(list, rows) {
    const clean = (list || []).filter(function (r) { return (r.nom || '').trim() || num(r.montant); });
    if (clean.length <= rows) return { rows: clean, merged: false };
    const head = clean.slice(0, rows - 1);
    const rest = clean.slice(rows - 1);
    head.push({
      nom: rest.map(function (r) { return r.nom; }).filter(Boolean).join(', '),
      montant: rest.reduce(function (s, r) { return s + num(r.montant); }, 0),
    });
    return { rows: head, merged: true };
  }

  /* Somme des subventions demandées, par année, à partir des budgets de projet. */
  function demandesParAnnee(d) {
    const byYear = {};
    d.projets.forEach(function (p) {
      const y = (p.budget.annee || '').trim() || (p.budget.du || '').slice(0, 4);
      const amount = num(p.subvention);
      if (!amount) return;
      byYear[y || '?'] = (byYear[y || '?'] || 0) + amount;
    });
    return Object.keys(byYear).sort().map(function (y) { return { annee: y === '?' ? '' : y, montant: String(round(byYear[y])) }; });
  }

  /* --- Accès par chemin ("identification.siege.cp") -------------------------------- */
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function set(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] === undefined || o[keys[i]] === null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  }

  /* Prépare un renouvellement : décale d'un an les années et dates, vide la signature. */
  function prepareRenewal(d) {
    const out = normalize(JSON.parse(JSON.stringify(d)));
    out.demande.recurrence = 'renouvellement';
    function shiftYear(s) {
      if (!s) return s;
      if (/^\d{4}$/.test(s)) return String(+s + 1);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(+s.slice(0, 4) + 1) + s.slice(4);
      return s;
    }
    function shiftBudget(b) { b.annee = shiftYear(b.annee); b.du = shiftYear(b.du); b.au = shiftYear(b.au); }
    shiftBudget(out.budget);
    out.projets.forEach(function (p) {
      shiftBudget(p.budget);
      p.dateDebut = shiftYear(p.dateDebut);
      p.dateFin = shiftYear(p.dateFin);
    });
    out.attestations.demandes = out.attestations.demandes.map(function (r) {
      return { montant: r.montant, annee: shiftYear(r.annee) };
    });
    out.attestations.faitLe = '';
    out.equipement.dateDemande = '';
    out.createdAt = new Date().toISOString();
    return out;
  }

  AFM.model = {
    SCHEMA: SCHEMA, VERSION: VERSION, CHARGES: CHARGES, PRODUITS: PRODUITS, FUNDERS: FUNDERS,
    CVN_CHARGES: CVN_CHARGES, CVN_PRODUITS: CVN_PRODUITS,
    newDossier: newDossier, emptyProject: emptyProject, emptyBudget: emptyBudget, normalize: normalize,
    num: num, round: round, fmtEuro: fmtEuro, computeBudget: computeBudget, groupLines: groupLines,
    funderRowsForPdf: funderRowsForPdf, demandesParAnnee: demandesParAnnee,
    get: get, set: set, prepareRenewal: prepareRenewal,
  };
})(window.AFM = window.AFM || {});
