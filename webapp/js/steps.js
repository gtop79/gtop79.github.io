/* Contenu des étapes du parcours. Chaque étape correspond à une ou plusieurs rubriques du Cerfa. */
(function (AFM) {
  'use strict';
  const M = AFM.model;
  const h = AFM.ui.h;

  /* ---------- Éditeur de budget (association : page 4, projet : page 7) ---------- */
  function budgetEditor(ctx, path, isProject) {
    const app = ctx.app;
    const b = function () { return ctx.val(path); };
    const totalCell = function (fn) {
      const el = h('span', { class: 'amount-total' });
      ctx.onRefresh(function () { el.textContent = M.fmtEuro(fn(M.computeBudget(b(), isProject))); });
      return el;
    };

    function lineRow(line) {
      const amountPath = path + '.v.' + line.key;
      if (line.custom) {
        return h('div', { class: 'budget-line custom' },
          ctx.text(path + '.labels.' + line.key, 'Libellé', { placeholder: line.placeholder, width: 'l' }),
          ctx.amount(amountPath, 'Montant'));
      }
      return h('div', { class: 'budget-line' }, ctx.amount(amountPath, line.label, { width: 'row' }));
    }

    function group(g) {
      const lines = M.groupLines(g, isProject);
      const head = h('div', { class: 'budget-group-head' }, h('span', { class: 'code' }, g.code), h('span', { class: 'glabel' }, g.label),
        lines ? totalCell(function (t) { return t.groups[g.code]; }) : null);
      if (g.funders) return fundersEditor(g, head);
      if (!lines) return h('div', { class: 'budget-group single' }, ctx.amount(path + '.v.' + g.code, g.code + ' – ' + g.label, { width: 'row' }));
      return h('div', { class: 'budget-group' }, head, lines.map(lineRow));
    }

    function fundersEditor(g, head) {
      const blocks = M.FUNDERS.map(function (f) {
        if (f.single) return h('div', { class: 'budget-line' }, ctx.amount(path + '.funders.' + f.key, f.label, { width: 'row' }));
        const listPath = path + '.funders.' + f.key;
        const count = (ctx.val(listPath) || []).length;
        return h('div', { class: 'funder-block' },
          h('p', { class: 'funder-title' }, f.label, h('small', null, ' — ' + f.rows + ' ligne' + (f.rows > 1 ? 's' : '') + ' dans le Cerfa')),
          ctx.repeat(listPath, function () { return { nom: '', montant: '' }; }, function (p) {
            return h('div', { class: 'grid cols-funder' },
              ctx.text(p + '.nom', 'Financeur', { placeholder: f.placeholder }),
              ctx.amount(p + '.montant', 'Montant demandé'));
          }, { addLabel: 'Ajouter un financeur', itemLabel: f.label }),
          count > f.rows ? ctx.note('Au-delà de ' + f.rows + ' financeurs, les derniers seront regroupés sur la dernière ligne du Cerfa.', 'warn') : null);
      });
      const fromDest = h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
        const dest = app.d.demande.dest;
        const bud = ctx.val(path);
        const pairs = [['etat', 'etat'], ['region', 'region'], ['departement', 'departement'], ['commune', 'communes']];
        let added = 0;
        pairs.forEach(function (p) {
          const ds = dest[p[0]];
          if (!ds.on || !ds.nom.trim()) return;
          const label = ds.nom.trim() + (ds.service && ds.service.trim() ? ' – ' + ds.service.trim() : '');
          const list = bud.funders[p[1]] || [];
          if (!list.some(function (r) { return (r.nom || '').trim().toLowerCase() === label.toLowerCase(); })) {
            list.push({ nom: label, montant: '' });
            added++;
          }
          bud.funders[p[1]] = list;
        });
        app.update(path + '.funders', bud.funders, { rerender: true });
        app.toast(added ? added + ' autorité(s) destinataire(s) ajoutée(s) : indiquez les montants demandés.' : 'Les autorités destinataires sont déjà listées.');
      } }, 'Reprendre les autorités destinataires (étape 1)');
      return h('div', { class: 'budget-group funders' }, head,
        h('div', { class: 'funders-intro' }, h('p', { class: 'hint', html: 'Listez <b>toutes</b> les autorités sollicitées : ces indications valent déclaration sur l\'honneur.' }), fromDest),
        blocks);
    }

    const charges = ctx.section('Charges', [
      M.CHARGES.map(group),
      isProject ? h('div', { class: 'budget-group' },
        h('div', { class: 'budget-group-head' }, h('span', { class: 'code' }, '—'), h('span', { class: 'glabel' }, 'Charges indirectes réparties affectées au projet')),
        h('p', { class: 'hint' }, 'Frais de siège ventilés entre les activités selon une règle objective (notice p. 18).'),
        ctx.amount(path + '.indirect.cff', 'Charges fixes de fonctionnement', { width: 'row' }),
        ctx.amount(path + '.indirect.ff', 'Frais financiers', { width: 'row' }),
        ctx.amount(path + '.indirect.autres', 'Autres', { width: 'row' })) : null,
      h('div', { class: 'budget-total' }, h('span', null, 'Total des charges (hors CVN)'), totalCell(function (t) { return t.charges; })),
    ], { help: 'budget.lines', class: 'budget' });

    const produits = ctx.section('Produits', [
      M.PRODUITS.map(group),
      isProject ? h('div', { class: 'budget-group' },
        h('div', { class: 'budget-group-head' }, h('span', { class: 'code' }, '—'), h('span', { class: 'glabel' }, 'Ressources propres affectées au projet')),
        h('p', { class: 'hint' }, 'Par exemple un prélèvement sur les réserves de l\'association.'),
        [0, 1, 2].map(function (i) {
          return h('div', { class: 'budget-line custom' },
            ctx.text(path + '.propres.' + i + '.label', 'Libellé', { placeholder: 'Ressource propre (préciser)', width: 'l' }),
            ctx.amount(path + '.propres.' + i + '.montant', 'Montant'));
        })) : null,
      h('div', { class: 'budget-total' }, h('span', null, 'Total des produits (hors CVN)'), totalCell(function (t) { return t.produits; })),
    ], { help: 'budget.74', class: 'budget' });

    const calcPath = path + '.benevolatCalc';
    const cvn = ctx.section('Contributions volontaires en nature', [
      h('div', { class: 'cvn-cols' },
        h('div', null, h('p', { class: 'col-title' }, '86 – Emplois'), M.CVN_CHARGES.map(lineRow),
          h('div', { class: 'budget-total' }, h('span', null, 'Total 86'), totalCell(function (t) { return t.cvnCharges; }))),
        h('div', null, h('p', { class: 'col-title' }, '87 – Contributions'), M.CVN_PRODUITS.map(lineRow),
          h('div', { class: 'budget-total' }, h('span', null, 'Total 87'), totalCell(function (t) { return t.cvnProduits; })))),
      h('div', { class: 'calc' },
        h('p', { class: 'calc-title' }, 'Valoriser le bénévolat', ctx.helpButton('budget.benevolat')),
        h('div', { class: 'grid cols-3' },
          ctx.number(calcPath + '.heures', 'Heures de bénévolat sur l\'exercice', { decimal: true }),
          ctx.amount(calcPath + '.taux', 'Valeur d\'une heure', { suffix: '€/h' }),
          h('div', { class: 'calc-action' }, (function () {
            const btn = h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
              const c = ctx.val(calcPath) || {};
              const v = Math.round(M.num(c.heures) * M.num(c.taux));
              if (!v) { app.toast('Indiquez le nombre d\'heures et la valeur horaire.'); return; }
              app.update(path + '.v.864', String(v), {});
              app.update(path + '.v.875', String(v), { rerender: true });
              app.toast(M.fmtEuro(v) + ' reportés en 864 (personnel bénévole) et 875 (bénévolat).');
            } });
            ctx.onRefresh(function () {
              const c = ctx.val(calcPath) || {};
              const v = Math.round(M.num(c.heures) * M.num(c.taux));
              btn.textContent = v ? 'Reporter ' + M.fmtEuro(v) + ' en 864 et 875' : 'Reporter en 864 et 875';
            });
            return btn;
          })()))),
    ], { help: 'budget.cvn', class: 'budget' });

    const resultat = h('div', { class: 'budget-summary', 'aria-live': 'polite' });
    ctx.onRefresh(function () {
      const t = M.computeBudget(b(), isProject);
      resultat.innerHTML = '';
      const r = Math.round(t.resultat);
      const label = r > 0 ? 'Excédent prévisionnel' : r < 0 ? 'Insuffisance prévisionnelle' : 'Budget à l\'équilibre';
      resultat.appendChild(h('div', { class: 'sum-item' }, h('span', null, 'Charges'), h('b', null, M.fmtEuro(t.charges))));
      resultat.appendChild(h('div', { class: 'sum-item' }, h('span', null, 'Produits'), h('b', null, M.fmtEuro(t.produits))));
      resultat.appendChild(h('div', { class: 'sum-item ' + (r === 0 ? 'ok' : 'warn') }, h('span', null, label),
        h('b', null, r === 0 ? '✓' : M.fmtEuro(Math.abs(r)))));
      const cvnOk = Math.round(t.cvnCharges) === Math.round(t.cvnProduits);
      resultat.appendChild(h('div', { class: 'sum-item ' + (cvnOk ? 'ok' : 'err') }, h('span', null, 'CVN 86 = 87'),
        h('b', null, cvnOk ? '✓' : M.fmtEuro(t.cvnCharges) + ' ≠ ' + M.fmtEuro(t.cvnProduits))));
      if (r !== 0 && t.charges > 0 && t.produits > 0) {
        resultat.appendChild(h('p', { class: 'hint full', html: 'Un budget en ' + (r > 0 ? 'excédent' : 'insuffisance') +
          ' est possible : expliquez-le (affectation de l\'excédent ou retour à l\'équilibre). <button type="button" class="btn-link" data-help="budget.equilibre">En savoir plus</button>' }));
      }
    });
    resultat.addEventListener('click', function (e) {
      const k = e.target && e.target.getAttribute('data-help');
      if (k) app.showHelp(k, true);
    });

    return h('div', { class: 'budget-editor' },
      h('div', { class: 'grid cols-3' },
        ctx.text(path + '.annee', 'Année', { width: 's', inputmode: 'numeric', placeholder: 'AAAA', help: 'budget.intro' }),
        ctx.date(path + '.du', 'ou exercice du'), ctx.date(path + '.au', 'au')),
      charges, produits, cvn, h('div', { class: 'sticky-summary' }, resultat));
  }

  /* ---------- Étapes ---------- */
  const STEPS = [];

  STEPS.push({ id: 'demande', title: 'Nature de la demande', short: 'Demande', cerfa: 'p. 1', help: 'demande.intro',
    render: function (ctx) {
      const d = ctx.d().demande;
      const destBlock = function (key, label, nomLabel, serviceLabel) {
        const on = d.dest[key].on;
        return h('div', { class: 'dest' + (on ? ' on' : '') },
          ctx.checkbox('demande.dest.' + key + '.on', label, { rerender: true }),
          on ? h('div', { class: 'grid cols-2 indent' },
            ctx.text('demande.dest.' + key + '.nom', nomLabel, { required: true }),
            serviceLabel ? ctx.text('demande.dest.' + key + '.service', serviceLabel) : null) : null);
      };
      return [
        ctx.section('Votre demande', [
          ctx.grid([
            h('fieldset', { class: 'field' }, h('legend', null, 'Forme', h('span', { class: 'req' }, ' *'), ctx.helpButton('demande.forme')),
              ctx.checkbox('demande.numeraire', 'En numéraire (argent)'),
              ctx.checkbox('demande.nature', 'En nature (local, matériel…)', { rerender: true })),
            ctx.radios('demande.recurrence', 'Fréquence', [['premiere', 'Première demande'], ['renouvellement', 'Renouvellement (ou poursuite)']], { help: 'demande.recurrence', required: true }),
            h('fieldset', { class: 'field' }, h('legend', null, 'Objet', h('span', { class: 'req' }, ' *'), ctx.helpButton('demande.objet')),
              ctx.checkbox('demande.fonctionnement', 'Fonctionnement global', { rerender: true }),
              ctx.checkbox('demande.projets', 'Projet(s) / action(s)', { rerender: true })),
            ctx.radios('demande.periode', 'Période', [['annuelle', 'Annuelle ou ponctuelle'], ['pluriannuelle', 'Pluriannuelle']], { help: 'demande.periode', required: true }),
          ]),
          ctx.checkbox('demande.investissement', 'Il s\'agit d\'une subvention d\'investissement (construction, gros équipement…)', { rerender: true, help: 'demande.investissement' }),
          d.investissement ? ctx.note('<b>Ce formulaire n\'est pas adapté aux subventions d\'investissement</b> (décret n° 2018-514). Rapprochez-vous du financeur pour connaître le dossier à utiliser.', 'warn') : null,
          d.periode === 'pluriannuelle' ? ctx.note('Demande pluriannuelle : la notice demande un budget par année et par projet. Vous pourrez créer un « projet » par année si les budgets diffèrent.', 'info') : null,
        ], { help: 'demande.intro' }),
        ctx.section('Autorités destinataires', [
          h('p', { class: 'intro', html: 'Cochez toutes les autorités sollicitées. Elles seront reprises dans le budget (compte 74).' }),
          destBlock('etat', 'État – ministère', 'Ministère', 'Direction (départementale, régionale…)'),
          destBlock('region', 'Conseil régional', 'Région', 'Direction / service'),
          destBlock('departement', 'Conseil départemental', 'Département', 'Direction / service'),
          destBlock('commune', 'Commune ou intercommunalité', 'Commune ou intercommunalité', 'Direction / service'),
          destBlock('etablissement', 'Établissement public', 'Établissement', null),
          destBlock('autre', 'Autre', 'Préciser', null),
        ], { help: 'demande.dest' }),
      ];
    } });

  STEPS.push({ id: 'identification', title: 'Identification de l\'association', short: 'Identification', cerfa: '§ 1',
    help: 'identification.siret',
    render: function (ctx) {
      const id = ctx.d().identification;
      const person = function (base) {
        return ctx.grid([
          ctx.text(base + '.nom', 'Nom', { required: base.indexOf('representant') > 0, autocomplete: 'family-name' }),
          ctx.text(base + '.prenom', 'Prénom', { required: base.indexOf('representant') > 0, autocomplete: 'given-name' }),
          ctx.text(base + '.fonction', 'Fonction', { required: base.indexOf('representant') > 0, placeholder: 'Présidente, trésorier…' }),
          ctx.text(base + '.telephone', 'Téléphone', { type: 'tel', autocomplete: 'tel' }),
          ctx.text(base + '.courriel', 'Courriel', { type: 'email', autocomplete: 'email' }),
        ]);
      };
      const address = function (base) {
        return [ctx.text(base + '.adresse', 'Adresse', { required: base.indexOf('siege') > 0, autocomplete: 'street-address' }),
          ctx.grid([ctx.text(base + '.cp', 'Code postal', { width: 's', inputmode: 'numeric', required: base.indexOf('siege') > 0, maxlength: 5 }),
            ctx.text(base + '.commune', 'Commune', { required: base.indexOf('siege') > 0 }),
            ctx.text(base + '.deleguee', 'Commune déléguée (le cas échéant)')], 3)];
      };
      return [
        ctx.section('L\'association', [
          ctx.text('identification.nom', 'Nom – dénomination', { required: true, hint: 'Tel qu\'il figure dans les statuts.' }),
          ctx.grid([ctx.text('identification.sigle', 'Sigle'), ctx.text('identification.siteWeb', 'Site web', { type: 'url', placeholder: 'www.exemple.org' })]),
          ctx.grid([
            ctx.text('identification.siret', 'Numéro SIRET', { inputmode: 'numeric', help: 'identification.siret', hint: '14 chiffres, indispensable au versement.', maxlength: 17 }),
            id.alsaceMoselle ? null : ctx.text('identification.rna', 'Numéro RNA (ou récépissé de préfecture)', { help: 'identification.rna', placeholder: 'W123456789',
              transform: function (v) { return v.toUpperCase(); } }),
          ]),
          ctx.checkbox('identification.alsaceMoselle', 'Association inscrite au registre (Bas-Rhin, Haut-Rhin, Moselle)', { rerender: true, help: 'identification.registre' }),
          id.alsaceMoselle ? ctx.grid([
            ctx.date('identification.registre.date', 'Date d\'inscription'), ctx.text('identification.registre.volume', 'Volume', { width: 's' }),
            ctx.text('identification.registre.folio', 'Folio', { width: 's' }), ctx.text('identification.registre.tribunal', 'Tribunal'),
          ], 4) : null,
        ]),
        ctx.section('Adresse du siège social', address('identification.siege')),
        ctx.section('Adresse de gestion ou de correspondance', [
          ctx.checkbox('identification.gestionDifferente', 'Différente de l\'adresse du siège', { rerender: true }),
          id.gestionDifferente ? address('identification.gestion') : null]),
        ctx.section('Représentant(e) légal(e)', [h('p', { class: 'intro' }, 'Personne désignée par les statuts.'), person('identification.representant')],
          { help: 'identification.representant' }),
        ctx.section('Personne chargée de la demande', [
          ctx.checkbox('identification.chargeDifferente', 'Différente du représentant légal', { rerender: true }),
          id.chargeDifferente ? person('identification.charge') : null]),
      ];
    } });

  STEPS.push({ id: 'relations', title: 'Relations avec l\'administration et les autres associations', short: 'Relations', cerfa: '§ 2 et 3',
    help: 'relations.agrements',
    render: function (ctx) {
      const r = ctx.d().relations;
      return [
        ctx.section('Relations avec l\'administration', [
          ctx.yesno('relations.agrements', 'L\'association bénéficie-t-elle d\'agrément(s) administratif(s) ?', { rerender: true, help: 'relations.agrements' }),
          r.agrements === 'oui' ? [ctx.datalist('agrements-list', AFM.help.AGREMENTS),
            ctx.repeat('relations.agrementsListe', function () { return { type: '', par: '', date: '' }; }, function (p) {
              return ctx.grid([ctx.text(p + '.type', 'Type d\'agrément', { list: 'agrements-list' }), ctx.text(p + '.par', 'Attribué par'),
                ctx.date(p + '.date', 'En date du')], 3);
            }, { max: 4, min: 1, addLabel: 'Ajouter un agrément', maxNote: 'Le Cerfa prévoit 4 agréments au maximum.' })] : null,
          ctx.yesno('relations.rup', 'L\'association est-elle reconnue d\'utilité publique ?', { rerender: true, help: 'relations.rup' }),
          r.rup === 'oui' ? ctx.date('relations.rupDate', 'Date de publication au Journal officiel') : null,
          ctx.yesno('relations.impotsCommerciaux', 'L\'association est-elle assujettie aux impôts commerciaux (TVA, IS) ?', { help: 'relations.impots' }),
        ]),
        ctx.section('Relations avec d\'autres associations', [
          ctx.textarea('relations.reseau', 'À quel réseau, union ou fédération l\'association est-elle affiliée ?', { rows: 2, capacity: 300,
            hint: 'Nom complet, sans sigle.', help: 'relations.reseau' }),
          ctx.yesno('relations.adherentsPM', 'L\'association a-t-elle des adhérents personnes morales ?', { rerender: true }),
          r.adherentsPM === 'oui' ? ctx.textarea('relations.adherentsPMListe', 'Lesquels ?', { rows: 3, capacity: 450 }) : null,
          ctx.checkbox('relations.sportive', 'Association sportive agréée ou affiliée à une fédération agréée'),
        ]),
      ];
    } });

  STEPS.push({ id: 'moyens', title: 'Moyens humains', short: 'Moyens humains', cerfa: '§ 4', help: 'moyens.intro',
    render: function (ctx) {
      const app = ctx.app;
      const calc = h('div', { class: 'calc' });
      const rowsPath = 'moyens.etptCalc';
      if (!Array.isArray(ctx.val(rowsPath))) M.set(app.d, rowsPath, [{ quotite: '100', mois: '12' }]);
      calc.appendChild(h('p', { class: 'calc-title' }, 'Calculateur d\'ETPT', ctx.helpButton('moyens.etpt')));
      calc.appendChild(ctx.repeat(rowsPath, function () { return { quotite: '100', mois: '12' }; }, function (p, i) {
        return ctx.grid([ctx.number(p + '.quotite', 'Salarié ' + (i + 1) + ' : quotité', { suffix: '%' }),
          ctx.number(p + '.mois', 'Mois de présence', { suffix: 'mois' })], 2);
      }, { addLabel: 'Ajouter un salarié', min: 1, itemLabel: 'Salarié' }));
      const res = h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
        const v = total();
        app.update('moyens.etpt', String(v), { rerender: true });
        app.toast(String(v).replace('.', ',') + ' ETPT reporté(s).');
      } });
      function total() {
        return Math.round((ctx.val(rowsPath) || []).reduce(function (s, r) {
          return s + M.num(r.quotite) / 100 * Math.min(12, M.num(r.mois)) / 12;
        }, 0) * 100) / 100;
      }
      ctx.onRefresh(function () { res.textContent = 'Reporter ' + String(total()).replace('.', ',') + ' ETPT'; });
      calc.appendChild(res);
      return [
        ctx.section('Au 31 décembre de l\'année écoulée', [
          ctx.grid([
            ctx.number('moyens.benevoles', 'Nombre de bénévoles', { hint: 'Personnes contribuant régulièrement, sans rémunération.' }),
            ctx.number('moyens.volontaires', 'Nombre de volontaires', { hint: 'Mission d\'intérêt général sous contrat (service civique…).' }),
            ctx.number('moyens.salaries', 'Nombre total de salariés'),
            ctx.number('moyens.emploisAides', 'dont emplois aidés'),
            ctx.number('moyens.etpt', 'Salariés en équivalent temps plein travaillé (ETPT)', { decimal: true, help: 'moyens.etpt' }),
            ctx.number('moyens.misADisposition', 'Personnels mis à disposition ou détachés par une autorité publique'),
            ctx.number('moyens.adherents', 'Adhérents', { hint: 'Personnes ayant formellement adhéré aux statuts.' }),
          ]),
        ], { help: 'moyens.intro' }),
        ctx.section(null, calc, { class: 'card-soft' }),
      ];
    } });

  STEPS.push({ id: 'budget', title: 'Budget prévisionnel de l\'association', short: 'Budget association', cerfa: '§ 5', help: 'budget.intro',
    render: function (ctx) {
      return [ctx.note('Montants en euros, sans centimes. Les totaux se calculent automatiquement. ' +
        'Pensez à valoriser le bénévolat : il peut relever le plafond de subvention.', 'info'),
      budgetEditor(ctx, 'budget', false)];
    } });

  STEPS.push({ id: 'projets', title: 'Projet(s) – objet de la demande', short: 'Projet(s)', cerfa: '§ 6', help: 'projet.intro',
    render: function (ctx) {
      const app = ctx.app;
      const d = ctx.d();
      const n = d.projets.length;
      let i = Math.min(app.ui.project || 0, n - 1);
      app.ui.project = i;
      const p = d.projets[i];
      const base = 'projets.' + i;
      const onlyGlobal = d.demande.fonctionnement && !d.demande.projets;
      const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Projets' },
        d.projets.map(function (pp, k) {
          return h('button', { type: 'button', role: 'tab', class: 'tab' + (k === i ? ' active' : ''), 'aria-selected': k === i ? 'true' : 'false',
            onclick: function () { app.ui.project = k; app.render(); } },
          'Projet ' + (k + 1) + (pp.intitule ? ' · ' + pp.intitule.slice(0, 28) + (pp.intitule.length > 28 ? '…' : '') : ''));
        }),
        h('button', { type: 'button', class: 'tab add', onclick: function () {
          const arr = d.projets.slice();
          arr.push(M.emptyProject());
          app.ui.project = arr.length - 1;
          app.update('projets', arr, { rerender: true });
        } }, '+ Ajouter un projet'));
      const t = M.computeBudget(p.budget, true);
      const pct = h('p', { class: 'hint' });
      ctx.onRefresh(function () {
        const tt = M.computeBudget(ctx.val(base + '.budget'), true);
        const s = M.num(ctx.val(base + '.subvention'));
        pct.innerHTML = 'Subventions (74) inscrites au budget du projet : <b>' + M.fmtEuro(tt.subventions) + '</b>' +
          (s && tt.totalProduits ? ' · la subvention sollicitée représente <b>' + (Math.round(s / tt.totalProduits * 1000) / 10).toString().replace('.', ',') +
            ' %</b> du total des produits, CVN comprises.' : '');
      });
      return [
        onlyGlobal ? ctx.note('Demande de <b>fonctionnement global</b> : présentez ici le projet associatif. Son budget est celui de l\'association.', 'info') : null,
        tabs,
        ctx.section('Présentation', [
          ctx.text(base + '.intitule', 'Intitulé', { required: true, help: 'projet.intitule' }),
          ctx.checkbox(base + '.politiqueVille', 'Demande adressée à la politique de la ville', { rerender: true }),
          p.politiqueVille ? ctx.text(base + '.contratVille', 'Contrat de ville concerné', { hint: 'Repris en tête des objectifs dans le Cerfa.' }) : null,
          ctx.textarea(base + '.objectifs', 'Objectifs', { rows: 6, capacity: 1100, required: true, help: 'projet.objectifs',
            placeholder: 'Objectif général…\nObjectifs spécifiques…\nObjectifs opérationnels…' }),
          ctx.textarea(base + '.description', 'Description', { rows: 10, capacity: 2800, help: 'projet.description',
            placeholder: 'Actions, activités et calendrier de mise en œuvre…' }),
          ctx.textarea(base + '.beneficiaires', 'Bénéficiaires', { rows: 4, capacity: 900, help: 'projet.beneficiaires',
            placeholder: 'Nombre, âge, sexe, résidence, caractéristiques sociales, participation financière éventuelle…' }),
        ], { help: 'projet.intro' }),
        ctx.section('Mise en œuvre', [
          ctx.textarea(base + '.territoire', 'Territoire', { rows: 3, capacity: 750 }),
          ctx.textarea(base + '.moyens', 'Moyens matériels et humains', { rows: 4, capacity: 1100, help: 'projet.moyens' }),
          h('div', { class: 'rh-table', role: 'group', 'aria-label': 'Ressources humaines du projet' },
            h('div', { class: 'rh-row head' }, h('span', null, ''), h('span', null, 'Nombre de personnes'), h('span', null, 'Nombre en ETPT')),
            [['benevoles', 'Bénévoles participant activement'], ['salaries', 'Salariés'], ['cdi', 'dont en CDI'], ['cdd', 'dont en CDD'],
              ['aides', 'dont emplois aidés'], ['volontaires', 'Volontaires (service civique…)']].map(function (r) {
              return h('div', { class: 'rh-row' }, h('span', { class: 'rh-label' }, r[1]),
                ctx.number(base + '.rh.' + r[0] + '.n', r[1] + ' – nombre', { width: 'full' }),
                ctx.number(base + '.rh.' + r[0] + '.etpt', r[1] + ' – ETPT', { decimal: true, width: 'full' }));
            })),
          ctx.yesno(base + '.recrutement', 'Un ou des recrutements sont-ils envisagés pour le projet ?', { rerender: true }),
          p.recrutement === 'oui' ? ctx.number(base + '.recrutementEtpt', 'Combien (en ETPT) ?', { decimal: true }) : null,
          ctx.grid([ctx.date(base + '.dateDebut', 'Date ou début de réalisation'), ctx.date(base + '.dateFin', 'Fin de réalisation')]),
          ctx.textarea(base + '.evaluation', 'Évaluation : indicateurs proposés', { rows: 6, capacity: 1600, help: 'projet.evaluation',
            placeholder: 'Indicateurs de réalisation…\nIndicateurs de résultat…\nIndicateurs d\'impact…' }),
        ]),
        h('div', { class: 'card-head standalone' }, h('h2', null, 'Budget du projet ' + (i + 1)), ctx.helpButton('projet.budget')),
        onlyGlobal || d.demande.fonctionnement ? h('p', null, h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
          if (M.computeBudget(p.budget, true).charges > 0 && !window.confirm('Remplacer le budget de ce projet par celui de l\'association ?')) return;
          const copy = JSON.parse(JSON.stringify(d.budget));
          copy.v['65'] = String((M.num(copy.v['65a']) + M.num(copy.v['65b'])) || '');
          app.update(base + '.budget', Object.assign(M.emptyBudget(), copy), { rerender: true });
          app.toast('Budget de l\'association repris.');
        } }, 'Reprendre le budget de l\'association')) : null,
        budgetEditor(ctx, base + '.budget', true),
        ctx.section('Subvention sollicitée', [
          ctx.amount(base + '.subvention', 'Montant sollicité dans la présente demande', { help: 'projet.subvention', width: 'm' }),
          pct,
          t.subventions && !M.num(p.subvention) ? h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
            app.update(base + '.subvention', String(Math.round(M.computeBudget(ctx.val(base + '.budget'), true).subventions)), { rerender: true });
          } }, 'Reprendre le total des subventions du projet') : null,
        ]),
        n > 1 ? h('p', { class: 'danger-zone' }, h('button', { type: 'button', class: 'btn-link danger', onclick: function () {
          if (!window.confirm('Supprimer le projet ' + (i + 1) + (p.intitule ? ' « ' + p.intitule + ' »' : '') + ' ?')) return;
          const arr = d.projets.slice();
          arr.splice(i, 1);
          app.ui.project = Math.max(0, i - 1);
          app.update('projets', arr, { rerender: true });
        } }, 'Supprimer ce projet')) : null,
      ];
    } });

  STEPS.push({ id: 'equipement', title: 'Demande d\'équipements', short: 'Équipements', cerfa: 'p. 8', help: 'equipement.intro',
    when: function (d) { return d.demande.nature; }, skipReason: 'Uniquement pour une demande en nature',
    render: function (ctx) {
      const e = ctx.d().equipement;
      const mat = [['sono', 'Sonorisation, micro, pied'], ['video', 'Vidéoprojecteur, écran'], ['projecteurs', 'Projecteurs, éclairage'],
        ['barnum', 'Stand-barnum 3 × 3 m'], ['barnumElec', 'Stand-barnum 3 × 3 m avec électricité'], ['barnumEclairage', 'Stand-barnum 3 × 3 m avec éclairage'],
        ['chaises', 'Chaises'], ['tables', 'Tables, tréteaux'], ['bancs', 'Bancs'], ['grilles', 'Grilles, panneaux et supports d\'exposition'],
        ['barrieres', 'Barrières de chantier, de police (« Vauban »)'], ['podium', 'Podium ou scène (préciser la dimension)']];
      return [
        ctx.section('La demande', [
          ctx.grid([ctx.date('equipement.dateDemande', 'Date de la demande'),
            ctx.text('equipement.projet', 'Projet concerné (n°)', { width: 's', inputmode: 'numeric' })]),
          ctx.radios('equipement.type', 'Type de demande', [['manifestation', 'Pour une manifestation', 'à déposer au moins un mois avant'],
            ['permanent', 'À titre permanent ou de longue durée']], { rerender: true, required: true }),
          e.type === 'manifestation' ? [
            ctx.grid([ctx.date('equipement.manif.date', 'Date de la manifestation', { required: true }),
              ctx.text('equipement.manif.titre', 'Titre – nom de la manifestation', { required: true })]),
            ctx.textarea('equipement.manif.descriptif', 'Descriptif sommaire', { rows: 2, capacity: 180 }),
            ctx.grid([ctx.number('equipement.manif.personnes', 'Nombre de personnes attendues'),
              ctx.number('equipement.manif.debutH', 'Début (heure)', { suffix: 'h' }), ctx.number('equipement.manif.debutM', 'minutes', { suffix: 'min' }),
              ctx.number('equipement.manif.finH', 'Fin (heure)', { suffix: 'h' }), ctx.number('equipement.manif.finM', 'minutes', { suffix: 'min' })], 5)] : null,
          e.type === 'permanent' ? [
            ctx.grid([ctx.date('equipement.perm.debut', 'Date de début'), ctx.date('equipement.perm.fin', 'Date de fin')]),
            ctx.textarea('equipement.perm.besoin', 'Qualification du besoin / projet concerné', { rows: 2, capacity: 180 }),
            ctx.number('equipement.perm.beneficiaires', 'Nombre de bénéficiaires')] : null,
        ], { help: 'equipement.intro' }),
        ctx.section('Site, lieu ou équipement souhaité', ctx.grid([
          ctx.text('equipement.sites.parc', 'Parc, jardin'), ctx.text('equipement.sites.voie', 'Voie publique (allée, place, square…)'),
          ctx.text('equipement.sites.stade', 'Stade (préciser)'), ctx.text('equipement.sites.salle', 'Salle, gymnase'),
          ctx.text('equipement.sites.specifique', 'Équipement spécifique (piscine, bibliothèque, musée…)'),
          ctx.textarea('equipement.sites.autre', 'Autre (urnes, restauration, wifi, pupitre… préciser)', { rows: 2, capacity: 400 })])),
        ctx.section('Matériel (quantités)', h('div', { class: 'grid cols-3' }, mat.map(function (m) {
          return m[0] === 'podium' ? ctx.text('equipement.materiel.podium', m[1], { placeholder: 'ex. 1 (4 × 3 m)' })
            : ctx.number('equipement.materiel.' + m[0], m[1]);
        }))),
        ctx.section('Sécurité', [
          ctx.grid([ctx.number('equipement.securite.deH', 'Présence / ronde de police de', { suffix: 'h' }),
            ctx.number('equipement.securite.deM', 'minutes', { suffix: 'min' }),
            ctx.number('equipement.securite.aH', 'à', { suffix: 'h' }), ctx.number('equipement.securite.aM', 'minutes', { suffix: 'min' })], 4),
          ctx.text('equipement.securite.gardiennage', 'Gardiennage')]),
        ctx.note('Les rubriques « livraison », « état des lieux » et la partie réservée à la collectivité sont remplies plus tard, si l\'aide est accordée.', 'info'),
      ];
    } });

  STEPS.push({ id: 'attestations', title: 'Attestations', short: 'Attestations', cerfa: '§ 7 et 7 bis', help: 'attestations.intro',
    render: function (ctx) {
      const app = ctx.app;
      const d = ctx.d();
      const rep = d.identification.representant;
      return [
        ctx.section('Signataire', [
          ctx.text('attestations.signataire', 'Je soussigné(e) (nom et prénom)', { required: true, help: 'attestations.signataire' }),
          (rep.nom || rep.prenom) ? h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
            app.update('attestations.signataire', (rep.nom + ' ' + rep.prenom).trim(), { rerender: true });
          } }, 'Utiliser le représentant légal : ' + (rep.nom + ' ' + rep.prenom).trim()) : null,
          ctx.radios('attestations.aidesPubliques', 'Montant total et cumulé d\'aides publiques perçues sur les trois derniers exercices (dont l\'exercice en cours)',
            [['inf', 'Inférieur ou égal à 500 000 €'], ['sup', 'Supérieur à 500 000 €']], { required: true, help: 'attestations.aides' }),
        ], { help: 'attestations.intro' }),
        d.demande.numeraire ? ctx.section('Subvention demandée', [
          h('p', { class: 'intro' }, 'Pour plusieurs projets, indiquez la somme des subventions demandées pour chaque année (4 lignes au maximum).'),
          h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
            const rows = M.demandesParAnnee(app.d);
            if (!rows.length) { app.toast('Indiquez d\'abord la subvention sollicitée dans chaque projet.'); return; }
            app.update('attestations.demandes', rows.slice(0, 4), { rerender: true });
            app.toast('Montants calculés à partir des projets.');
          } }, 'Calculer à partir des projets'),
          ctx.repeat('attestations.demandes', function () { return { montant: '', annee: '' }; }, function (p) {
            return ctx.grid([ctx.amount(p + '.montant', 'Montant'), ctx.text(p + '.annee', 'Au titre de l\'année ou de l\'exercice', { width: 's', inputmode: 'numeric' })]);
          }, { max: 4, min: 1, addLabel: 'Ajouter une année' }),
        ], { help: 'attestations.demandes' }) : null,
        ctx.section('Fait le… à…', ctx.grid([ctx.date('attestations.faitLe', 'Date'), ctx.text('attestations.faitA', 'Lieu')]),
          { intro: 'La signature se fait sur le PDF généré : signature électronique dans votre lecteur PDF, ou impression puis signature manuscrite.' }),
        ctx.section('Rubrique 7 bis – aides d\'État', [
          ctx.checkbox('aidesEtat.concerne', 'L\'association a perçu, sur les 3 derniers exercices, des subventions attribuées sur la base d\'un texte européen (aides d\'État)',
            { rerender: true, help: 'aidesEtat.intro' }),
          d.aidesEtat.concerne ? ctx.repeat('aidesEtat.lignes', function () { return { date: '', annees: '', base: '', autorite: '', montant: '' }; }, function (p) {
            return ctx.grid([ctx.date(p + '.date', 'Date de l\'acte d\'attribution'), ctx.text(p + '.annees', 'Année(s) concernée(s)'),
              ctx.text(p + '.base', 'Décision, règlement ou régime d\'aide européen'), ctx.text(p + '.autorite', 'Autorité publique'),
              ctx.amount(p + '.montant', 'Montant')], 3);
          }, { max: 8, min: 1, addLabel: 'Ajouter une aide', maxNote: 'Le Cerfa prévoit 8 lignes au maximum.' }) : null,
        ]),
      ];
    } });

  AFM.steps = { STEPS: STEPS, budgetEditor: budgetEditor };
})(window.AFM = window.AFM || {});
