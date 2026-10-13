/* Remplissage du Cerfa officiel 12156*06 avec pdf-lib, dans le navigateur.
 *
 * Particularités du PDF officiel prises en compte (voir README) :
 *  - les scripts de calcul du PDF additionnent toutes les lignes 74-1 à 74-19 : seules les lignes
 *    de détail des financeurs sont remplies, jamais les lignes d'en-tête de catégorie ;
 *  - les montants sont écrits sans séparateur de milliers (sinon les totaux recalculés par Acrobat sont faux) ;
 *  - « Check Box3 » (page 8) couvre deux cases et « Text33 » deux lignes : ils sont dessinés directement ;
 *  - « 2/65-1 » est partagé par deux lignes du budget projet : seul le total 65 est rempli ;
 *  - les projets 2, 3… sont produits sur une copie du formulaire puis aplatis et insérés après la page 7 ;
 *  - le dossier complet est joint au PDF (fichier JSON) pour pouvoir le réimporter. */
(function (AFM) {
  'use strict';
  const M = AFM.model;
  const ATTACHMENT_NAME = 'dossier-askformoney.json';

  /* ---------- Correspondance des champs « simples » (utilisée aussi pour la réimportation) ---------- */
  const SCALARS = [
    // Page 1 — nature de la demande et destinataires
    ['Check Box4', 'demande.numeraire', 'check'], ['Check Box2', 'demande.nature', 'check'],
    ['Check Box6', 'demande.recurrence', 'radio:premiere'], ['Check Box7', 'demande.recurrence', 'radio:renouvellement'],
    ['Check Box9', 'demande.fonctionnement', 'check'], ['Check Box8', 'demande.projets', 'check'],
    ['Check Box10', 'demande.periode', 'radio:annuelle'], ['Check Box11', 'demande.periode', 'radio:pluriannuelle'],
    ['Check Box12', 'demande.dest.etat.on', 'check'], ['État Ministère', 'demande.dest.etat.nom', 'text'],
    ['Direction ex  départementale ou régionalede la cohésion sociale etc', 'demande.dest.etat.service', 'text'],
    ['Check Box13', 'demande.dest.region.on', 'check'], ['Conseil régional', 'demande.dest.region.nom', 'text'],
    ['DirectionService', 'demande.dest.region.service', 'text'],
    ['Check Box14', 'demande.dest.departement.on', 'check'], ['Conseil départemental', 'demande.dest.departement.nom', 'text'],
    ['DirectionService_2', 'demande.dest.departement.service', 'text'],
    ['Check Box15', 'demande.dest.commune.on', 'check'], ['Commune ou Intercommunalité', 'demande.dest.commune.nom', 'text'],
    ['DirectionService_3', 'demande.dest.commune.service', 'text'],
    ['Check Box16', 'demande.dest.etablissement.on', 'check'], ['Établissement public', 'demande.dest.etablissement.nom', 'text'],
    ['Check Box17', 'demande.dest.autre.on', 'check'], ['Autre préciser', 'demande.dest.autre.nom', 'text'],
    // Page 2 — identification
    ['Sigle de lassociation', 'identification.sigle', 'text'], ['Site web', 'identification.siteWeb', 'text'],
    ['Text39', 'identification.siret', 'siret'], ['Text40', 'identification.rna', 'text'],
    ['Date22_af_date', 'identification.registre.date', 'date'], ['Text48', 'identification.registre.volume', 'text'],
    ['Text71', 'identification.registre.folio', 'text'], ['Text72', 'identification.registre.tribunal', 'text'],
    ['15 Adresse du siège social', 'identification.siege.adresse', 'text'],
    ['Code postal', 'identification.siege.cp', 'text'], ['Commune', 'identification.siege.commune', 'text'],
    ['Commune déléguée le cas échéant', 'identification.siege.deleguee', 'text'],
    ['151 Adresse de gestion ou de correspondance si différente', 'identification.gestion.adresse', 'text'],
    ['Code postal_2', 'identification.gestion.cp', 'text'], ['Commune_2', 'identification.gestion.commune', 'text'],
    ['Commune déléguée le cas échéant_2', 'identification.gestion.deleguee', 'text'],
    ['Nom', 'identification.representant.nom', 'text'], ['Prénom', 'identification.representant.prenom', 'text'],
    ['Fonction', 'identification.representant.fonction', 'text'], ['Téléphone', 'identification.representant.telephone', 'text'],
    ['Courriel', 'identification.representant.courriel', 'text'],
    ['Nom_2', 'identification.charge.nom', 'text'], ['Prénom_2', 'identification.charge.prenom', 'text'],
    ['Fonction_2', 'identification.charge.fonction', 'text'], ['Téléphone_2', 'identification.charge.telephone', 'text'],
    ['Courriel_2', 'identification.charge.courriel', 'text'],
    // Page 2 — relations avec l'administration
    ['Check Box25', 'relations.agrements', 'radio:oui'], ['Check Box27', 'relations.agrements', 'radio:non'],
    ['Check Box28', 'relations.rup', 'radio:oui'], ['Check Box29', 'relations.rup', 'radio:non'],
    ['Date30_af_date', 'relations.rupDate', 'date'],
    ['Check Box31', 'relations.impotsCommerciaux', 'radio:oui'], ['Check Box32', 'relations.impotsCommerciaux', 'radio:non'],
    // Page 3 — relations avec d'autres associations, moyens humains
    ['A quel réseau union ou fédération l 1', 'relations.reseau', 'text'],
    ['Check Box33', 'relations.adherentsPM', 'radio:non'], ['Check Box37', 'relations.adherentsPM', 'radio:oui'],
    ['Lassociation atelle des adhérents personnes morales 1', 'relations.adherentsPMListe', 'text'],
    ['Check Box36', 'relations.sportive', 'check'],
    ['Bénévole  personne contribuant régulièrement à lactivité de lassociation de manière', 'moyens.benevoles', 'text'],
    ['Volontaire  personne engagée pour une mission dintérêt général par un contrat', 'moyens.volontaires', 'text'],
    ['Nombre total de salariés', 'moyens.salaries', 'text'],
    ['dont nombre demplois aidés', 'moyens.emploisAides', 'text'],
    ['Nombre de salariés en équivalent temps plein travaillé ETPT', 'moyens.etpt', 'decimal'],
    ['Nombre de personnels mis à disposition ou détachés par une autorité', 'moyens.misADisposition', 'text'],
    ['Adhérents Adhérent  personne ayant marqué formellement son adhésion aux statuts de lassociation', 'moyens.adherents', 'text'],
    // Page 9 — attestations
    ['Check Box52', 'attestations.aidesPubliques', 'radio:inf'], ['Check Box53', 'attestations.aidesPubliques', 'radio:sup'],
    ['Date54_af_date', 'attestations.faitLe', 'date'], ['Text1', 'attestations.faitA', 'text'],
    ['association', 'attestations.signataire', 'text'],
  ];

  const AGREMENT_ROWS = [
    ['Type dagrément 1', 'attribué par 1', 'en date du 1'], ['Type dagrément 2', 'attribué par 2', 'en date du 2'],
    ['Type dagrément 3', 'attribué par 3', 'en date du 3'], ['undefined', 'undefined_2', 'undefined_3']];
  const DEMANDE_ROWS = [['Text36', 'Text57'], ['Text37', 'Text43'], ['Text38', 'Text44'], ['Text42', 'Text46']];
  const AIDES_ETAT_COLS = [
    'Date de signature de lacte dattribution de la subvention arrêté conventionRow',
    'Années pour laquelle lesquelles la subvention a été attribuéeRow',
    'Décision européenne Règlement ou régime daide européen à laquelle ou auquel il est fait référence le cas échéant sur l acte dattribution de la subventionRow',
    'Autorité publique ayant accordé la subventionRow', 'MontantRow'];

  const ETAT_LBL = 'Etat  préciser les ministères directions ou services déconcentrés sollicités cf 1ère page';
  const COMMUNES_LBL = 'Communes communautés de communes ou dagglomérations';

  /* Budget de l'association (page 4) */
  const BUDGET_ASSO = {
    annee: 'Text41', du: 'Année 20 ou exercice du', au: 'Date38_af_date', auFormat: 'short', duFormat: 'long',
    lines: { '601': '60-1', '602': '60-2', '60x': '60-3', '613': '61-1', '615': '61-2', '616': '61-3', '618': '61-4',
      '61x': '61-5', '622': '62-1', '623': '62-2', '625': '62-3', '627': '62-4', '631': '63-1', '635': '63-2',
      '641': '64-1', '645': '64-2', '647': '64-3', '65a': 'Total 65-2', '65b': 'Total 65-3', '756': '75-1', '758': '75-2',
      '860': '86-1', '861': '86-2', '862': '86-3', '864': '86-4', '870': '87-1', '871': '87-2', '87x': '87-3', '875': '87-4' },
    customLabels: { '60x': 'Autres fournituresRow1', '61x': 'Forme documentation 1',
      '65a': '65 Autres charges de gestion couranteRow1', '65b': '65 Autres charges de gestion couranteRow2',
      '87x': '871 Prestations en nature862 Prestations' },
    groups: { '60': 'Total 60', '61': 'Total 61', '62': 'Total 62', '63': 'Total 63', '64': 'Total 64', '65': 'Total 65-1',
      '66': 'Total 66', '67': 'Total 67', '68': 'Total 68', '69': 'Total 69', '70': 'Total 70', '73': 'Total 73',
      '74': 'Total 74', '75': 'Total 75', '76': 'Total 76', '77': 'Total 77', '78': 'Total 78', '79': 'Total 79' },
    funders: {
      etat: { labels: ['Etat', ETAT_LBL + 'Locations', ETAT_LBL + 'Entretien et réparation'], amounts: ['74-2', '74-3', '74-4'] },
      region: { labels: ['Conseils Régionalaux Documentation', 'Conseils Régionalaux Row2'], amounts: ['74-6', '74-7'] },
      departement: { labels: ['Conseils Départemental aux Rémunérations intermédiaires et honoraires',
        'Conseils Départemental aux Publicité publication'], amounts: ['74-9', '74-10'] },
      communes: { labels: [COMMUNES_LBL + 'Services bancaires autres', COMMUNES_LBL + '0',
        COMMUNES_LBL + 'Impôts et taxes sur rémunération'], amounts: ['74-12', '74-13', '74-14'] },
      organismesSociaux: '74-15', europe: '74-16', asp: '74-17', autresEP: '74-18', prives: '74-19' },
    totalCharges: 'Total des charges', totalProduits: 'Total des produits',
    excedent: '0Excédent prévisionnel bénéfice', deficit: '0Insuffisance prévisionnelle déficit',
    cvnCharges: 'Total 86', cvnProduits: 'Total 87', grandCharges: 'Text76', grandProduits: 'TOTAL général produits+cvn',
  };

  /* Budget du projet (page 7) */
  const BUDGET_PROJET = {
    annee: 'Text61', du: 'Date50_af_date', au: 'Date51_af_date', auFormat: 'long', duFormat: 'long',
    lines: { '601': '2/60-1', '602': '2/60-2', '60x': '2/60-3', '613': '2/61-1', '615': '2/61-2', '616': '2/61-3',
      '618': '2/61-4', '61x': '2/61-5', '622': '2/62-1', '623': '2/62-2', '625': '2/62-3', '627': '2/62-4',
      '631': '2/63-1', '635': '2/63-2', '641': '2/64-1', '645': '2/64-2', '647': '2/64-3', '756': '2/75-1', '758': '2/75-2',
      '860': '2/86-1', '861': '2/86-2', '862': '2/86-3', '864': '2/86-4', '870': '2/87-1', '871': '2/87-2', '87x': '2/87-3',
      '875': '2/87-4' },
    customLabels: { '60x': 'Autres fournituresRow1_2', '61x': 'DocumentationRow1_2',
      '87x': '871 Prestations en nature862 Prestations_2' },
    groups: { '60': '2/Total 60', '61': '2/Total 61', '62': '2/Total 62', '63': '2/Total 63', '64': '2/Total 64',
      '65': '2/Total 65', '66': '2/Total 66', '67': '2/Total 67', '68': '2/Total 68', '69': '2/Total 69',
      '70': '2/Total 70', '73': '2/Total 73', '74': '2/Total 74', '75': '2/Total 75', '76': '2/Total 76',
      '77': '2/Total 77', '78': '2/Total 78', '79': '2/Total 79' },
    funders: {
      etat: { labels: [ETAT_LBL + '0_2', ETAT_LBL + 'Locations_2', ETAT_LBL + 'Entretien et réparation_2'],
        amounts: ['2/74-2', '2/74-3', '2/74-4'] },
      region: { labels: ['Conseils Régionalaux Documentation_2', 'Conseils Régionalaux Row2_2'], amounts: ['2/74-6', '2/74-7'] },
      departement: { labels: ['Text18', 'Text19'], amounts: ['2/74-9', '2/74-10'] },
      communes: { labels: [COMMUNES_LBL + 'Services bancaires autres_2', COMMUNES_LBL + '0_2',
        COMMUNES_LBL + 'Impôts et taxes sur rémunération_2'], amounts: ['2/74-12', '2/74-13', '2/74-14'] },
      organismesSociaux: '2/74-15', europe: '2/74-16', asp: '2/74-17', autresEP: '2/74-18', prives: '2/74-19' },
    indirect: { cff: 'CFF1', ff: 'FF1', autres: 'A1' },
    propres: { labels: ['RESSOURCES PROPRES AFFECTEES AU PROJETCharges fixes de fonctionnement',
      'RESSOURCES PROPRES AFFECTEES AU PROJETFrais financiers', 'RESSOURCES PROPRES AFFECTEES AU PROJETAutres'],
      amounts: ['RP1', 'RP2', 'RP3'] },
    totalCharges: 'Total charges 2', totalProduits: 'Total produit 2',
    excedent: '0Row1', excedentLabel: 'TOTAL DES CHARGESRow1', deficit: '0Row1_2', deficitLabel: 'TOTAL DES PRODUITSRow1',
    cvnCharges: '2/Total 86', cvnProduits: '2/Total 87',
    grandCharges: 'Total général charges  2', grandProduits: 'Total général produit 2',
  };

  const PROJECT_TEXT = {
    numero: ['Text70', 'Text65', 'Text3'], politiqueVille: 'Check Box42', intitule: 'Text50', objectifs: 'Text49',
    description: 'Text67', beneficiaires: 'Text66', territoire: 'Text64', moyens: 'Text63',
    recrutementOui: 'Check Box46', recrutementNon: 'Check Box47', recrutementEtpt: 'Text45',
    dateDebut: 'Date43_af_date', dateFin: 'Date44_af_date', evaluation: 'Text62',
    subvention: 'Text59', pourcentage: 'Text60',
    rh: {
      benevoles: ['Nombre de personnesBénévoles participants activement à lactionprojet', 'Nombre en ETPTBénévoles participants activement à lactionprojet'],
      salaries: ['Nombre de personnesSalarié dont en CDI dont en CDD dont emplois aidés4', 'Nombre en ETPTSalarié dont en CDI dont en CDD dont emplois aidés4'],
      cdi: ['Nombre de personnesSalarié dont en CDI dont en CDD dont emplois aidés4_2', 'Nombre en ETPTSalarié dont en CDI dont en CDD dont emplois aidés4_2'],
      cdd: ['Nombre de personnesSalarié dont en CDI dont en CDD dont emplois aidés4_3', 'Nombre en ETPTSalarié dont en CDI dont en CDD dont emplois aidés4_3'],
      aides: ['Nombre de personnesSalarié dont en CDI dont en CDD dont emplois aidés4_4', 'Nombre en ETPTSalarié dont en CDI dont en CDD dont emplois aidés4_4'],
      volontaires: ['Nombre de personnesVolontaires services civiques', 'Nombre en ETPTVolontaires services civiques'],
    },
  };

  const EQUIPEMENT = {
    projet: 'Text73', dateDemande: 'Text2',
    manif: { date: 'Text4', titre: 'Text5', descriptif: 'Text6', personnes: 'Text11', debutH: 'Text12', debutM: 'Text13',
      finH: 'Text14', finM: 'Text15' },
    perm: { debut: 'Text7', fin: 'Text8', besoin: 'Text9', beneficiaires: 'Text10' },
    sites: { parc: 'Text16', voie: 'Text17', stade: 'Text20', salle: 'Text21', specifique: 'Text22', autre: 'Text23' },
    materiel: { sono: 'Text68', video: 'Text55', projecteurs: 'Text56', barnum: 'Text58', barnumElec: 'Text54',
      barnumEclairage: 'Text53', chaises: 'Text52', tables: 'Text51', bancs: 'Text35', grilles: 'Text34' },
    securite: { deH: 'Text32', deM: 'Text31', aH: 'Text30', aM: 'Text29', gardiennage: 'Text28' },
  };
  const PAGE_EQUIPEMENT = 7;      // index (0) de la page 8 dans le modèle
  const PROJECT_PAGES = [4, 5, 6]; // pages 5 à 7

  /* ---------- Formatage ---------- */
  function amount(v) {
    const n = M.num(v);
    return n ? String(Math.round(n)) : '';
  }
  function total(n) { return n ? String(Math.round(n)) : ''; }
  function decimal(v) {
    const n = M.num(v);
    return n ? String(Math.round(n * 100) / 100).replace('.', ',') : (v === 0 || v === '0' ? '0' : '');
  }
  function dateFR(iso, format) {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return String(iso);
    return format === 'short' ? (+m[3]) + '/' + (+m[2]) + '/' + m[1].slice(2) : m[3] + '/' + m[2] + '/' + m[1];
  }
  function parseDateFR(s) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec((s || '').trim());
    if (!m) return s || '';
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  function siret(v) {
    const d = String(v || '').replace(/\D/g, '');
    return d.length === 14 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6, 9) + ' ' + d.slice(9) : String(v || '');
  }
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ---------- Remplisseur ---------- */
  function Filler(doc, font) {
    this.doc = doc;
    this.form = doc.getForm();
    this.font = font;
    this.charset = new Set(font.getCharacterSet());
    this.byName = {};
    this.missing = [];
    this.warnings = [];
    const self = this;
    this.form.getFields().forEach(function (f) { self.byName[f.getName().normalize('NFC')] = f; });
  }
  Filler.prototype.field = function (name) {
    const f = this.byName[name.normalize('NFC')];
    if (!f) this.missing.push(name);
    return f;
  };
  /* Remplace les caractères absents de la police standard (WinAnsi) du PDF. */
  Filler.prototype.clean = function (s, multiline) {
    let out = '';
    const map = { '→': '->', '≤': '<=', '≥': '>=', '≠': '!=', '−': '-', ' ': ' ', ' ': ' ',
      ' ': ' ', '‑': '-', '‒': '-', '―': '-', '′': "'", '″': '"', '\t': ' ' };
    for (const ch of String(s).replace(/\r\n?/g, '\n')) {
      if (ch === '\n') { out += multiline ? '\n' : ' '; continue; }
      if (map[ch] !== undefined) { out += map[ch]; continue; }
      if (this.charset.has(ch.codePointAt(0))) { out += ch; continue; }
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      out += (base && this.charset.has(base.codePointAt(0))) ? base : '?';
    }
    return out;
  };
  Filler.prototype.lineCount = function (text, width, size) {
    const font = this.font;
    let lines = 0;
    text.split('\n').forEach(function (para) {
      const words = para.split(' ');
      let cur = '';
      lines += 1;
      words.forEach(function (w) {
        const next = cur ? cur + ' ' + w : w;
        if (font.widthOfTextAtSize(next, size) > width && cur) { lines += 1; cur = w; } else cur = next;
      });
    });
    return lines;
  };
  Filler.prototype.text = function (name, value, opts) {
    if (value === undefined || value === null || String(value).trim() === '') return;
    const f = this.field(name);
    if (!f) return;
    const widgets = f.acroField.getWidgets();
    const r = widgets[0].getRectangle();
    const w = r.width - 4;
    const h = r.height - 2;
    const multiline = h > 21 || (opts && opts.multiline);
    const text = this.clean(String(value), multiline);
    let size;
    if (!multiline) {
      const unit = this.font.widthOfTextAtSize(text, 1) || 1;
      size = Math.min(9, h * 0.8, w / unit);
      if (size < 5) { this.warnings.push({ field: name, text: text }); size = 5; }
    } else {
      f.enableMultiline();
      for (size = 9.5; size > 5; size -= 0.5) {
        if (this.lineCount(text, w - 2, size) * size * 1.18 <= h) break;
      }
      if (this.lineCount(text, w - 2, size) * size * 1.18 > h) this.warnings.push({ field: name, text: text.slice(0, 60) });
    }
    // Certains champs du Cerfa n'ont pas d'apparence par défaut (/DA) : on reprend celle du formulaire.
    if (!f.acroField.getDefaultAppearance()) f.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
    f.setText(text);
    f.setFontSize(Math.max(5, Math.floor(size * 10) / 10));
  };
  Filler.prototype.check = function (name, on) {
    const f = this.field(name);
    if (!f) return;
    if (on) f.check(); else f.uncheck();
  };
  Filler.prototype.amount = function (name, v) { this.text(name, amount(v)); };

  /* ---------- Remplissage par rubrique ---------- */
  function fillScalars(F, d) {
    SCALARS.forEach(function (s) {
      const [field, path, kind] = s;
      const v = M.get(d, path);
      if (kind === 'check') F.check(field, !!v);
      else if (kind.indexOf('radio:') === 0) F.check(field, v === kind.slice(6));
      else if (kind === 'date') F.text(field, dateFR(v));
      else if (kind === 'siret') F.text(field, siret(v));
      else if (kind === 'decimal') F.text(field, decimal(v));
      else F.text(field, v);
    });
  }

  function splitName(F, name, field) {
    const f = F.field(field);
    if (!f) return [name, ''];
    const width = f.acroField.getWidgets()[0].getRectangle().width - 6;
    const clean = F.clean(name, false);
    if (F.font.widthOfTextAtSize(clean, 10) <= width) return [clean, ''];
    const words = clean.split(' ');
    let first = '';
    let i = 0;
    for (; i < words.length; i++) {
      const next = first ? first + ' ' + words[i] : words[i];
      if (F.font.widthOfTextAtSize(next, 10) > width && first) break;
      first = next;
    }
    return [first, words.slice(i).join(' ')];
  }

  function fillIdentification(F, d) {
    const parts = splitName(F, d.identification.nom || '', '11 Nom Dénomination 1');
    F.text('11 Nom Dénomination 1', parts[0]);
    F.text('11 Nom Dénomination 2', parts[1]);
    if (d.relations.agrements === 'oui') {
      (d.relations.agrementsListe || []).slice(0, 4).forEach(function (a, i) {
        F.text(AGREMENT_ROWS[i][0], a.type);
        F.text(AGREMENT_ROWS[i][1], a.par);
        F.text(AGREMENT_ROWS[i][2], dateFR(a.date));
      });
    }
  }

  function fillBudget(F, b, map, isProject) {
    const t = M.computeBudget(b, isProject);
    F.text(map.annee, b.annee);
    F.text(map.du, dateFR(b.du, map.duFormat));
    F.text(map.au, dateFR(b.au, map.auFormat));
    M.CHARGES.forEach(function (g) {
      const lines = M.groupLines(g, isProject);
      if (lines) lines.forEach(function (l) {
        if (map.lines[l.key]) F.amount(map.lines[l.key], b.v[l.key]);
        if (l.custom && map.customLabels[l.key] && M.num(b.v[l.key])) F.text(map.customLabels[l.key], b.labels[l.key]);
      });
      F.text(map.groups[g.code], total(t.groups[g.code]));
    });
    M.PRODUITS.forEach(function (g) {
      if (g.lines) g.lines.forEach(function (l) { F.amount(map.lines[l.key], b.v[l.key]); });
      if (g.funders) {
        M.FUNDERS.forEach(function (fd) {
          const target = map.funders[fd.key];
          if (fd.single) { F.amount(target, b.funders[fd.key]); return; }
          const res = M.funderRowsForPdf(b.funders[fd.key], target.amounts.length);
          res.rows.forEach(function (r, i) {
            F.text(target.labels[i], r.nom);
            F.amount(target.amounts[i], r.montant);
          });
        });
      }
      F.text(map.groups[g.code], total(t.groups[g.code]));
    });
    M.CVN_CHARGES.concat(M.CVN_PRODUITS).forEach(function (l) {
      F.amount(map.lines[l.key], b.v[l.key]);
      if (l.custom && map.customLabels[l.key] && M.num(b.v[l.key])) F.text(map.customLabels[l.key], b.labels[l.key]);
    });
    if (isProject) {
      F.amount(map.indirect.cff, b.indirect.cff);
      F.amount(map.indirect.ff, b.indirect.ff);
      F.amount(map.indirect.autres, b.indirect.autres);
      (b.propres || []).slice(0, 3).forEach(function (r, i) {
        if (!M.num(r.montant) && !(r.label || '').trim()) return;
        F.text(map.propres.labels[i], r.label);
        F.amount(map.propres.amounts[i], r.montant);
      });
    }
    F.text(map.totalCharges, total(t.charges));
    F.text(map.totalProduits, total(t.produits));
    if (t.resultat > 0) {
      if (map.excedentLabel) F.text(map.excedentLabel, 'Excédent prévisionnel (bénéfice)');
      F.text(map.excedent, total(t.resultat));
    } else if (t.resultat < 0) {
      if (map.deficitLabel) F.text(map.deficitLabel, 'Insuffisance prévisionnelle (déficit)');
      F.text(map.deficit, total(-t.resultat));
    }
    F.text(map.cvnCharges, total(t.cvnCharges));
    F.text(map.cvnProduits, total(t.cvnProduits));
    F.text(map.grandCharges, total(t.totalCharges));
    F.text(map.grandProduits, total(t.totalProduits));
    return t;
  }

  function fillProject(F, p, number) {
    PROJECT_TEXT.numero.forEach(function (n) { F.text(n, String(number)); });
    F.check(PROJECT_TEXT.politiqueVille, !!p.politiqueVille);
    F.text(PROJECT_TEXT.intitule, p.intitule);
    let objectifs = p.objectifs || '';
    if (p.politiqueVille && (p.contratVille || '').trim()) objectifs = 'Contrat de ville : ' + p.contratVille.trim() + '\n' + objectifs;
    F.text(PROJECT_TEXT.objectifs, objectifs);
    F.text(PROJECT_TEXT.description, p.description);
    F.text(PROJECT_TEXT.beneficiaires, p.beneficiaires);
    F.text(PROJECT_TEXT.territoire, p.territoire);
    F.text(PROJECT_TEXT.moyens, p.moyens);
    Object.keys(PROJECT_TEXT.rh).forEach(function (k) {
      F.text(PROJECT_TEXT.rh[k][0], p.rh[k].n);
      F.text(PROJECT_TEXT.rh[k][1], decimal(p.rh[k].etpt));
    });
    F.check(PROJECT_TEXT.recrutementOui, p.recrutement === 'oui');
    F.check(PROJECT_TEXT.recrutementNon, p.recrutement === 'non');
    if (p.recrutement === 'oui') F.text(PROJECT_TEXT.recrutementEtpt, decimal(p.recrutementEtpt));
    F.text(PROJECT_TEXT.dateDebut, dateFR(p.dateDebut, 'short'));
    F.text(PROJECT_TEXT.dateFin, dateFR(p.dateFin, 'short'));
    F.text(PROJECT_TEXT.evaluation, p.evaluation);
    const t = fillBudget(F, p.budget, BUDGET_PROJET, true);
    const sub = M.num(p.subvention);
    if (sub) {
      F.text(PROJECT_TEXT.subvention, String(Math.round(sub)));
      if (t.totalProduits > 0) {
        F.text(PROJECT_TEXT.pourcentage, (Math.round(sub / t.totalProduits * 1000) / 10).toFixed(1).replace('.', ','));
      }
    }
  }

  function fillAttestations(F, d) {
    F.text('Text47', d.identification.nom);
    if (d.demande.numeraire) {
      (d.attestations.demandes || []).filter(function (r) { return M.num(r.montant); }).slice(0, 4)
        .forEach(function (r, i) {
          F.amount(DEMANDE_ROWS[i][0], r.montant);
          F.text(DEMANDE_ROWS[i][1], r.annee);
        });
    }
    if (d.aidesEtat.concerne) {
      (d.aidesEtat.lignes || []).slice(0, 8).forEach(function (r, i) {
        const n = i + 1;
        F.text(AIDES_ETAT_COLS[0] + n, dateFR(r.date));
        F.text(AIDES_ETAT_COLS[1] + n, r.annees);
        F.text(AIDES_ETAT_COLS[2] + n, r.base);
        F.text(AIDES_ETAT_COLS[3] + n, r.autorite);
        F.amount(AIDES_ETAT_COLS[4] + n, r.montant);
      });
    }
  }

  function fillEquipement(F, d, page) {
    const e = d.equipement;
    F.text(EQUIPEMENT.projet, e.projet);
    F.text(EQUIPEMENT.dateDemande, dateFR(e.dateDemande));
    if (e.type === 'manifestation') {
      const m = e.manif;
      F.text(EQUIPEMENT.manif.date, dateFR(m.date));
      ['titre', 'descriptif', 'personnes', 'debutH', 'debutM', 'finH', 'finM'].forEach(function (k) {
        F.text(EQUIPEMENT.manif[k], m[k]);
      });
    } else if (e.type === 'permanent') {
      F.text(EQUIPEMENT.perm.debut, dateFR(e.perm.debut));
      F.text(EQUIPEMENT.perm.fin, dateFR(e.perm.fin));
      F.text(EQUIPEMENT.perm.besoin, e.perm.besoin);
      F.text(EQUIPEMENT.perm.beneficiaires, e.perm.beneficiaires);
    }
    Object.keys(EQUIPEMENT.sites).forEach(function (k) { F.text(EQUIPEMENT.sites[k], e.sites[k]); });
    Object.keys(EQUIPEMENT.materiel).forEach(function (k) { F.text(EQUIPEMENT.materiel[k], e.materiel[k]); });
    Object.keys(EQUIPEMENT.securite).forEach(function (k) { F.text(EQUIPEMENT.securite[k], e.securite[k]); });

    // « Check Box3 » : un seul champ pour deux cases. Le champ est retiré et les deux cases sont
    // dessinées sur la page, avec une croix dans la case choisie (sinon le widget masque la croix).
    const box = F.field('Check Box3');
    if (box) {
      const rects = box.acroField.getWidgets().map(function (w) { return w.getRectangle(); })
        .sort(function (a, b) { return a.x - b.x; });
      removeField(F.doc, box);
      const color = PDFLib.rgb(0, 0, 0);
      rects.forEach(function (r, i) {
        page.drawRectangle({ x: r.x, y: r.y, width: r.width, height: r.height, borderColor: color, borderWidth: 0.8 });
        const chosen = (e.type === 'manifestation' && i === 0) || (e.type === 'permanent' && i === rects.length - 1);
        if (!chosen) return;
        page.drawLine({ start: { x: r.x + 2, y: r.y + 2 }, end: { x: r.x + r.width - 2, y: r.y + r.height - 2 }, thickness: 1.2, color: color });
        page.drawLine({ start: { x: r.x + 2, y: r.y + r.height - 2 }, end: { x: r.x + r.width - 2, y: r.y + 2 }, thickness: 1.2, color: color });
      });
    }
    // « Text33 » : un seul champ pour les quantités « barrières » et « podium » → texte dessiné.
    const qty = F.field('Text33');
    if (qty) {
      const rects = qty.acroField.getWidgets().map(function (w) { return w.getRectangle(); })
        .sort(function (a, b) { return b.y - a.y; });
      [e.materiel.barrieres, e.materiel.podium].forEach(function (v, i) {
        if (!rects[i] || !String(v || '').trim()) return;
        const r = rects[i];
        const s = F.clean(String(v), false);
        const size = Math.min(9, (r.width - 3) / (F.font.widthOfTextAtSize(s, 1) || 1));
        page.drawText(s, { x: r.x + 2, y: r.y + (r.height - size) / 2 + 1, size: size, font: F.font, color: PDFLib.rgb(0, 0, 0) });
      });
    }
  }

  /* Suppression bas niveau d'un champ et de ses widgets.
   * form.removeField() de pdf-lib échoue sur les champs sans apparence (signature), et
   * acroForm.removeField() retire le premier élément de la liste quand la référence n'y est pas trouvée. */
  function removeField(doc, field) {
    const N = PDFLib.PDFName;
    const refs = field.acroField.getWidgets()
      .map(function (w) { return doc.context.getObjectRef(w.dict); }).filter(Boolean);
    doc.getPages().forEach(function (p) { refs.forEach(function (r) { p.node.removeAnnot(r); }); });
    const parent = field.acroField.getParent();
    const arr = parent ? parent.Kids() : doc.getForm().acroForm.dict.lookup(N.of('Fields'));
    if (arr) {
      for (let i = arr.size() - 1; i >= 0; i--) {
        const entry = arr.get(i);
        if (entry === field.ref || doc.context.lookup(entry) === field.acroField.dict) arr.remove(i);
      }
    }
    refs.forEach(function (r) { doc.context.delete(r); });
    if (field.ref && refs.indexOf(field.ref) < 0) doc.context.delete(field.ref);
  }

  /* Retire les références vers des objets supprimés (annotations de page, champs du formulaire). */
  function pruneDangling(doc) {
    const N = PDFLib.PDFName;
    function prune(arr) {
      if (!arr) return;
      for (let i = arr.size() - 1; i >= 0; i--) {
        const e = arr.get(i);
        if (e instanceof PDFLib.PDFRef && doc.context.lookup(e) === undefined) arr.remove(i);
      }
    }
    doc.getPages().forEach(function (p) { prune(p.node.Annots()); });
    prune(doc.getForm().acroForm.dict.lookup(N.of('Fields')));
    prune(doc.getForm().acroForm.dict.lookup(N.of('CO')));
  }

  function fieldsOnPage(doc, pageIndex) {
    const annots = doc.getPage(pageIndex).node.Annots();
    const refs = new Set((annots ? annots.asArray() : []).map(function (r) { return r.toString(); }));
    return doc.getForm().getFields().filter(function (f) {
      return f.acroField.getWidgets().some(function (w) {
        const ref = doc.context.getObjectRef(w.dict);
        return ref && refs.has(ref.toString());
      });
    });
  }

  async function loadTemplate() {
    return PDFLib.PDFDocument.load(b64ToBytes(AFM.CERFA_TEMPLATE_B64), { updateMetadata: false });
  }

  /* Génère le PDF complet. Renvoie { bytes, warnings, missing }. */
  async function generate(dossier) {
    const d = M.normalize(dossier);
    const doc = await loadTemplate();
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    const F = new Filler(doc, font);

    fillScalars(F, d);
    fillIdentification(F, d);
    fillBudget(F, d.budget, BUDGET_ASSO, false);
    fillProject(F, d.projets[0], 1);
    fillAttestations(F, d);
    if (d.demande.nature) fillEquipement(F, d, doc.getPage(PAGE_EQUIPEMENT));
    F.form.updateFieldAppearances(font);

    // Fiche équipements : uniquement pour une demande en nature (notice p. 13).
    if (!d.demande.nature) {
      fieldsOnPage(doc, PAGE_EQUIPEMENT).forEach(function (f) { removeField(doc, f); });
      doc.removePage(PAGE_EQUIPEMENT);
    }

    // Projets supplémentaires : pages 5 à 7 remplies sur une copie, aplaties, insérées après la page 7.
    let insertAt = PROJECT_PAGES[PROJECT_PAGES.length - 1] + 1;
    for (let i = 1; i < d.projets.length; i++) {
      const copy = await loadTemplate();
      const cfont = await copy.embedFont(PDFLib.StandardFonts.Helvetica);
      const CF = new Filler(copy, cfont);
      fillProject(CF, d.projets[i], i + 1);
      CF.warnings.forEach(function (w) { w.project = i + 1; F.warnings.push(w); });
      const keep = new Set();
      // getFields() renvoie de nouveaux objets à chaque appel : comparaison par nom.
      PROJECT_PAGES.forEach(function (pi) { fieldsOnPage(copy, pi).forEach(function (f) { keep.add(f.getName()); }); });
      CF.form.getFields().forEach(function (f) { if (!keep.has(f.getName())) removeField(copy, f); });
      CF.form.updateFieldAppearances(cfont);
      CF.form.flatten();
      pruneDangling(copy);
      // Sérialiser puis recharger : sinon le contenu dessiné par flatten() n'est pas repris par copyPages().
      const flat = await PDFLib.PDFDocument.load(await copy.save(), { updateMetadata: false });
      const pages = await doc.copyPages(flat, PROJECT_PAGES);
      pages.forEach(function (p) { doc.insertPage(insertAt++, p); });
    }

    // Le dossier voyage avec le PDF : il pourra être réimporté (renouvellement, autre poste).
    const json = JSON.stringify(Object.assign({}, d, { exportedAt: new Date().toISOString() }));
    await doc.attach(new TextEncoder().encode(json), ATTACHMENT_NAME, {
      mimeType: 'application/json',
      description: 'Données du dossier askForMoney (réimportables dans l\'application)',
      creationDate: new Date(), modificationDate: new Date(),
    });
    pruneDangling(doc);
    doc.setTitle('Demande de subvention – ' + (d.identification.nom || 'association'));
    doc.setSubject('Cerfa n°12156*06 rempli avec askForMoney');
    doc.setCreator('askForMoney');
    doc.setProducer('askForMoney (pdf-lib)');
    const bytes = await doc.save();
    return { bytes: bytes, warnings: F.warnings, missing: F.missing };
  }

  /* ---------- Réimportation d'un PDF ---------- */
  function lookupNameTree(dict, out) {
    const N = PDFLib.PDFName;
    const names = dict.lookup(N.of('Names'));
    if (names) {
      const arr = names.asArray();
      for (let i = 0; i + 1 < arr.length; i += 2) {
        out.push({ name: dict.context.lookup(arr[i]).decodeText(), spec: dict.context.lookup(arr[i + 1]) });
      }
    }
    const kids = dict.lookup(N.of('Kids'));
    if (kids) kids.asArray().forEach(function (k) { lookupNameTree(dict.context.lookup(k), out); });
  }

  async function readAttachedDossier(bytes) {
    const N = PDFLib.PDFName;
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const names = doc.catalog.lookup(N.of('Names'));
    const files = names && names.lookup(N.of('EmbeddedFiles'));
    if (files) {
      const list = [];
      lookupNameTree(files, list);
      const hit = list.find(function (e) { return e.name === ATTACHMENT_NAME; });
      if (hit) {
        const stream = hit.spec.lookup(N.of('EF')).lookup(N.of('F'));
        const data = PDFLib.decodePDFRawStream(stream).decode();
        return { dossier: M.normalize(JSON.parse(new TextDecoder().decode(data))), source: 'attachment' };
      }
    }
    return { dossier: readFields(doc), source: 'fields' };
  }

  /* Repli : lecture des champs du formulaire (PDF rempli ailleurs, sans pièce jointe). */
  function readFields(doc) {
    const d = M.newDossier();
    const form = doc.getForm();
    const byName = {};
    form.getFields().forEach(function (f) { byName[f.getName().normalize('NFC')] = f; });
    function val(name) {
      const f = byName[name.normalize('NFC')];
      if (!f) return undefined;
      if (f.constructor.name === 'PDFCheckBox' || typeof f.isChecked === 'function') return f.isChecked();
      try { return f.getText ? (f.getText() || '') : undefined; } catch (e) { return undefined; }
    }
    SCALARS.forEach(function (s) {
      const [field, path, kind] = s;
      const v = val(field);
      if (v === undefined || v === '' || v === false) return;
      if (kind === 'check') M.set(d, path, !!v);
      else if (kind.indexOf('radio:') === 0) { if (v === true) M.set(d, path, kind.slice(6)); }
      else if (kind === 'date') M.set(d, path, parseDateFR(v));
      else if (kind === 'siret') M.set(d, path, String(v).replace(/\D/g, ''));
      else M.set(d, path, String(v));
    });
    d.identification.nom = [val('11 Nom Dénomination 1'), val('11 Nom Dénomination 2')].filter(Boolean).join(' ');
    // Budget de l'association : lignes de détail.
    Object.keys(BUDGET_ASSO.lines).forEach(function (k) {
      const v = val(BUDGET_ASSO.lines[k]);
      if (v) d.budget.v[k] = String(M.num(v));
    });
    ['66', '67', '68', '69', '70', '73', '76', '77', '78', '79'].forEach(function (c) {
      const v = val(BUDGET_ASSO.groups[c]);
      if (v) d.budget.v[c] = String(M.num(v));
    });
    d.budget.annee = val(BUDGET_ASSO.annee) || '';
    const p = d.projets[0];
    ['intitule', 'objectifs', 'description', 'beneficiaires', 'territoire', 'moyens', 'evaluation'].forEach(function (k) {
      p[k] = val(PROJECT_TEXT[k]) || '';
    });
    return M.normalize(d);
  }

  AFM.pdf = {
    generate: generate, readAttachedDossier: readAttachedDossier, ATTACHMENT_NAME: ATTACHMENT_NAME,
    _internals: { SCALARS: SCALARS, BUDGET_ASSO: BUDGET_ASSO, BUDGET_PROJET: BUDGET_PROJET, PROJECT_TEXT: PROJECT_TEXT,
      EQUIPEMENT: EQUIPEMENT, dateFR: dateFR, Filler: Filler, fillProject: fillProject, fieldsOnPage: fieldsOnPage,
      removeField: removeField, loadTemplate: loadTemplate },
  };
})(window.AFM = window.AFM || {});
