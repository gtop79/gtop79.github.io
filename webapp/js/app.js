/* Application : navigation entre les étapes, sauvegarde automatique, aide, vérification et génération. */
(function (AFM) {
  'use strict';
  const M = AFM.model;
  const S = AFM.storage;
  const V = AFM.validation;
  const h = AFM.ui.h;

  const WELCOME = { id: 'accueil', title: 'Accueil', short: 'Accueil' };
  const CHECK = { id: 'verification', title: 'Vérifier et générer le Cerfa', short: 'Vérifier et générer', help: 'pieces.intro' };

  const app = {
    d: M.newDossier(),
    ui: { step: 'accueil', project: 0, visited: {} },
    touched: new Set(),
    issues: [],
    ctx: null,
    dirtySinceExport: false,
    hasDraft: false,
  };

  function allSteps() { return [WELCOME].concat(AFM.steps.STEPS, [CHECK]); }
  function stepById(id) { return allSteps().find(function (s) { return s.id === id; }); }
  function enabled(step) { return !step.when || step.when(app.d); }
  function $(sel) { return document.querySelector(sel); }

  /* ---------- Sauvegarde automatique ---------- */
  let saveTimer = null;
  function scheduleSave() {
    app.dirtySinceExport = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      const ok = S.saveDraft(app.d);
      app.hasDraft = true;
      updateStatus(ok);
    }, 400);
  }
  function updateStatus(ok) {
    const el = $('#save-status');
    if (!el) return;
    if (ok === false) {
      el.textContent = 'Sauvegarde automatique impossible dans ce navigateur : enregistrez le fichier du dossier.';
      el.className = 'save-status warn';
      return;
    }
    const t = app.d.updatedAt ? new Date(app.d.updatedAt) : null;
    el.textContent = t ? 'Enregistré dans ce navigateur à ' + t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    el.className = 'save-status' + (app.dirtySinceExport ? ' pending' : '');
    const btn = $('#btn-export');
    if (btn) btn.classList.toggle('attention', app.dirtySinceExport);
    if (btn) btn.title = app.dirtySinceExport ? 'Modifications non enregistrées dans un fichier : pour les retrouver sur un autre navigateur ou poste, enregistrez le fichier.' : 'Fichier du dossier à jour';
  }

  /* ---------- Mises à jour ---------- */
  app.update = function (path, value, opts) {
    opts = opts || {};
    M.set(app.d, path, value);
    scheduleSave();
    if (opts.rerender) app.render({ keepFocus: true, focusLast: opts.focusLast });
    else {
      app.issues = V.validate(app.d);
      if (app.ctx) app.ctx.refresh();
      showFieldIssues();
      renderNav();
    }
  };
  app.touch = function (path) {
    app.touched.add(path);
    showFieldIssues();
  };

  /* ---------- Aide ---------- */
  let pinnedHelp = null;
  app.showHelp = function (key, explicit) {
    const entry = AFM.help.H[key];
    const panel = $('#help');
    if (!entry || !panel) return;
    if (!explicit && pinnedHelp && pinnedHelp !== key) pinnedHelp = null;
    if (explicit) pinnedHelp = key;
    panel.querySelector('.help-body').innerHTML = '';
    panel.querySelector('.help-body').appendChild(h('article', { class: 'help-entry' },
      h('h3', null, entry.title),
      h('div', { html: entry.text }),
      h('p', { class: 'help-source' }, h('a', { href: AFM.help.NOTICE_URL + '#page=' + entry.page, target: '_blank', rel: 'noopener' },
        'Notice officielle n°51781#04, page ' + entry.page + ' ↗'))));
    if (explicit && window.matchMedia('(max-width: 1100px)').matches) {
      panel.classList.add('open');
      panel.querySelector('.help-close').focus();
    }
  };

  app.toast = function (msg, kind) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(app._toastTimer);
    app._toastTimer = setTimeout(function () { t.className = 'toast'; }, 4500);
  };

  /* ---------- Affichage des contrôles ---------- */
  function issuesFor(step) { return app.issues.filter(function (i) { return i.step === step; }); }
  function showFieldIssues() {
    if (!app.ctx) return;
    const visited = app.ui.visited[app.ui.step];
    Object.keys(app.ctx.errorEls).forEach(function (path) {
      const el = app.ctx.errorEls[path];
      const issue = app.issues.find(function (i) { return i.path === path && i.level === 'error'; }) ||
        app.issues.find(function (i) { return i.path === path; });
      const show = issue && (visited || app.touched.has(path));
      el.textContent = show ? issue.msg : '';
      el.className = 'field-error' + (show && issue.level === 'warning' ? ' warning' : '');
      const input = document.getElementById(AFM.ui.idOf(path));
      if (input && input.tagName !== 'FIELDSET') input.setAttribute('aria-invalid', show && issue.level === 'error' ? 'true' : 'false');
    });
    const box = $('#step-issues');
    if (box) {
      box.innerHTML = '';
      const others = issuesFor(app.ui.step).filter(function (i) { return !app.ctx.errorEls[i.path]; });
      if (visited && others.length) {
        box.appendChild(h('div', { class: 'note warn' }, h('b', null, 'À vérifier dans cette étape'),
          h('ul', null, others.map(function (i) { return h('li', { class: i.level }, i.msg); }))));
      }
    }
  }

  /* ---------- Navigation ---------- */
  function renderNav() {
    const nav = $('#steps');
    nav.innerHTML = '';
    const steps = allSteps();
    const list = h('ol', { class: 'step-list' });
    steps.forEach(function (s, idx) {
      const on = enabled(s);
      const iss = issuesFor(s.id);
      const errors = iss.filter(function (i) { return i.level === 'error'; }).length;
      const visited = app.ui.visited[s.id];
      let badge = null;
      if (s.id !== 'accueil' && s.id !== 'verification' && on && visited) {
        badge = errors ? h('span', { class: 'badge err', title: errors + ' point(s) à corriger' }, String(errors))
          : h('span', { class: 'badge ok', title: 'Complet' }, '✓');
      }
      const btn = h('button', { type: 'button', class: 'step-link' + (app.ui.step === s.id ? ' current' : '') + (on ? '' : ' disabled'),
        'aria-current': app.ui.step === s.id ? 'step' : null, disabled: on ? null : true,
        title: on ? null : s.skipReason,
        onclick: function () { app.go(s.id); } },
      h('span', { class: 'step-num' }, s.id === 'accueil' ? '⌂' : s.id === 'verification' ? '✓' : String(idx)),
      h('span', { class: 'step-text' }, h('span', { class: 'step-title' }, s.short || s.title),
        s.cerfa ? h('span', { class: 'step-ref' }, on ? 'Cerfa ' + s.cerfa : s.skipReason) : null),
      badge);
      list.appendChild(h('li', null, btn));
    });
    nav.appendChild(list);
    const sel = $('#step-select');
    if (sel) {
      sel.innerHTML = '';
      steps.forEach(function (s, idx) {
        const o = h('option', { value: s.id, disabled: enabled(s) ? null : true },
          (s.id === 'accueil' || s.id === 'verification' ? '' : idx + '. ') + (s.short || s.title));
        if (s.id === app.ui.step) o.selected = true;
        sel.appendChild(o);
      });
    }
  }

  app.go = function (id, focusPath) {
    if (app.ui.step !== 'accueil') app.ui.visited[app.ui.step] = true;
    app.ui.step = id;
    app.render({ focusPath: focusPath, scrollTop: true });
  };

  function neighbours() {
    const steps = allSteps().filter(enabled);
    const i = steps.findIndex(function (s) { return s.id === app.ui.step; });
    return { prev: steps[i - 1], next: steps[i + 1] };
  }

  /* ---------- Rendu ---------- */
  app.render = function (opts) {
    opts = opts || {};
    const active = document.activeElement;
    const activeId = opts.keepFocus && active && active.id ? active.id : null;
    const scrollY = window.scrollY;
    app.issues = V.validate(app.d);
    const step = stepById(app.ui.step) || WELCOME;
    const main = $('#main');
    main.innerHTML = '';
    app.ctx = new AFM.ui.Ctx(app);
    let content;
    if (step.id === 'accueil') content = renderWelcome();
    else if (step.id === 'verification') content = renderCheck();
    else content = step.render(app.ctx);
    const nb = neighbours();
    main.appendChild(h('div', { class: 'step-header' },
      h('h1', { tabindex: '-1', id: 'step-title' }, step.title),
      step.cerfa ? h('p', { class: 'step-cerfa' }, 'Cerfa n°12156*06 — ' + step.cerfa) : null));
    main.appendChild(h('div', { id: 'step-issues' }));
    main.appendChild(h('div', { class: 'step-body' }, content));
    if (step.id !== 'accueil') {
      main.appendChild(h('div', { class: 'step-nav' },
        nb.prev ? h('button', { type: 'button', class: 'btn-secondary', onclick: function () { app.go(nb.prev.id); } }, '← ' + (nb.prev.short || nb.prev.title)) : h('span'),
        nb.next ? h('button', { type: 'button', class: 'btn-primary', onclick: function () { app.go(nb.next.id); } },
          (nb.next.id === 'verification' ? 'Vérifier et générer' : 'Suivant : ' + (nb.next.short || nb.next.title)) + ' →') : null));
    }
    renderNav();
    showFieldIssues();
    if (step.help) app.showHelp(step.help, false);
    else resetHelp();
    // Focus : champ précédent (re-rendu), dernier élément ajouté, champ ciblé, ou titre de l'étape.
    let target = null;
    if (opts.focusLast) {
      const list = M.get(app.d, opts.focusLast) || [];
      const prefix = AFM.ui.idOf(opts.focusLast + '.' + (list.length - 1));
      target = main.querySelector('[id^="' + prefix + '"]');
    } else if (activeId) target = document.getElementById(activeId);
    else if (opts.focusPath) target = document.getElementById(AFM.ui.idOf(opts.focusPath));
    if (target) {
      target.focus({ preventScroll: !!activeId });
      if (activeId) window.scrollTo(0, scrollY);
    } else if (opts.scrollTop) {
      window.scrollTo(0, 0);
      $('#step-title').focus({ preventScroll: true });
    }
  };

  function resetHelp() {
    const body = $('#help .help-body');
    body.innerHTML = '';
    body.appendChild(h('p', { class: 'muted' }, 'Les conseils de la notice officielle s\'affichent ici quand vous remplissez un champ. Cliquez sur « ? » pour en savoir plus.'));
  }

  /* ---------- Accueil ---------- */
  function filePicker(label, onFile, primary) {
    const input = h('input', { type: 'file', accept: '.json,.pdf,application/json,application/pdf', class: 'visually-hidden' });
    input.addEventListener('change', function () { if (input.files[0]) onFile(input.files[0]); input.value = ''; });
    const btn = h('button', { type: 'button', class: primary ? 'btn-primary' : 'btn-secondary', onclick: function () { input.click(); } }, label);
    return h('span', null, btn, input);
  }

  function confirmReplace() {
    if (!app.hasDraft || !hasContent(app.d)) return true;
    return window.confirm('Le dossier en cours dans ce navigateur sera remplacé. ' +
      (app.dirtySinceExport ? 'Ses dernières modifications ne sont pas enregistrées dans un fichier. ' : '') + 'Continuer ?');
  }
  function hasContent(d) { return !!(d.identification.nom || d.projets[0].intitule || M.computeBudget(d.budget, false).charges); }

  function loadDossier(d, message, startStep) {
    app.d = M.normalize(d);
    app.touched = new Set();
    app.ui = { step: startStep || 'demande', project: 0, visited: {} };
    S.saveDraft(app.d);
    app.hasDraft = true;
    app.dirtySinceExport = false;
    updateStatus();
    app.render({ scrollTop: true });
    if (message) app.toast(message);
  }

  async function openFile(file, renewal) {
    try {
      const res = await S.readFile(file);
      if (!confirmReplace()) return;
      let d = res.dossier;
      if (renewal) d = M.prepareRenewal(d);
      const src = res.source === 'attachment' ? 'Dossier retrouvé dans le Cerfa PDF.' :
        res.source === 'fields' ? 'Ce PDF ne contenait pas de dossier joint : les principaux champs ont été relus, vérifiez chaque étape.' :
          'Dossier ouvert.';
      loadDossier(d, renewal ? src + ' Renouvellement préparé : années décalées d\'un an, date de signature vidée.' : src);
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }
  app.openFile = openFile;

  function renderWelcome() {
    const meta = S.getMeta();
    const cur = app.d;
    const resume = app.hasDraft && hasContent(cur) ? h('section', { class: 'card resume' },
      h('h2', null, 'Reprendre le dossier en cours'),
      h('p', null, h('b', null, cur.identification.nom || 'Dossier sans nom'),
        cur.updatedAt ? ' — modifié le ' + new Date(cur.updatedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : ''),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn-primary', onclick: function () { app.go('demande'); } }, 'Continuer'),
        h('button', { type: 'button', class: 'btn-secondary', onclick: function () { S.exportFile(app.d); app.dirtySinceExport = false; updateStatus(); } },
          'Enregistrer le fichier du dossier'))) : null;

    return [
      h('p', { class: 'lead' }, 'Remplissez le formulaire unique de demande de subvention des associations étape par étape. ' +
        'À la fin, l\'application produit le Cerfa officiel n°12156*06 rempli, prêt à signer.'),
      resume,
      h('div', { class: 'grid cols-2 start-cards' },
        h('section', { class: 'card' }, h('h2', null, 'Nouveau dossier'),
          h('p', null, 'Commencez une demande à partir de zéro.'),
          h('button', { type: 'button', class: 'btn-primary', onclick: function () {
            if (!confirmReplace()) return;
            loadDossier(M.newDossier(), null);
          } }, 'Commencer')),
        h('section', { class: 'card' }, h('h2', null, 'Ouvrir un dossier'),
          h('p', null, 'Un fichier de dossier (.json) ou un Cerfa PDF généré par l\'application.'),
          filePicker('Choisir un fichier…', function (f) { openFile(f, false); })),
        h('section', { class: 'card' }, h('h2', null, 'Préparer un renouvellement'),
          h('p', null, 'Partez de la demande de l\'an dernier : tout est repris, les années sont décalées d\'un an.'),
          filePicker('Choisir le dossier précédent…', function (f) { openFile(f, true); })),
        h('section', { class: 'card' }, h('h2', null, 'Découvrir avec un exemple'),
          h('p', null, 'Un dossier entièrement fictif, avec deux projets et une demande de matériel.'),
          h('button', { type: 'button', class: 'btn-secondary', onclick: function () {
            if (!confirmReplace()) return;
            loadDossier(JSON.parse(JSON.stringify(AFM.SAMPLE)), 'Exemple fictif chargé.');
          } }, 'Charger l\'exemple'))),
      h('section', { class: 'card card-soft' }, h('h2', null, 'Où sont conservées vos données ?'),
        h('ul', { class: 'storage-list' },
          h('li', null, h('b', null, 'Dans ce navigateur, automatiquement. '), 'Vous reprenez où vous en étiez sur ce poste. Elles sont effacées si vous videz les données du navigateur ou en navigation privée.'),
          h('li', null, h('b', null, 'Dans un fichier de sauvegarde (.json). '), 'Bouton « Enregistrer le fichier » : à ranger sur une clé USB, un drive, ou à envoyer à un autre bénévole. Il s\'ouvre dans n\'importe quel navigateur.'),
          h('li', null, h('b', null, 'Dans le Cerfa PDF généré. '), 'Le dossier y est joint : rouvrez ce PDF l\'an prochain pour préparer le renouvellement.')),
        h('p', { class: 'muted' }, 'Aucune donnée n\'est envoyée sur internet : tout se passe dans votre navigateur.' +
          (meta.lastExport ? ' Dernier fichier enregistré le ' + new Date(meta.lastExport).toLocaleDateString('fr-FR') + '.' : ''))),
      h('section', { class: 'card' }, h('h2', null, 'À préparer avant de commencer'),
        h('ul', null,
          h('li', null, 'les numéros SIRET et RNA de l\'association ;'),
          h('li', null, 'le budget prévisionnel de l\'association et celui de chaque projet ;'),
          h('li', null, 'le nombre de bénévoles, de salariés et d\'adhérents au 31 décembre ;'),
          h('li', null, 'les autorités à solliciter (État, région, département, commune…) ;'),
          h('li', null, 'le RIB et les comptes approuvés du dernier exercice, à joindre.'))),
    ];
  }

  /* ---------- Vérification et génération ---------- */
  function renderCheck() {
    const d = app.d;
    Object.keys(stepsIndex()).forEach(function (id) { app.ui.visited[id] = true; });
    const issues = app.issues;
    const errors = issues.filter(function (i) { return i.level === 'error'; });
    const warnings = issues.filter(function (i) { return i.level === 'warning'; });
    const byStep = {};
    issues.forEach(function (i) { (byStep[i.step] = byStep[i.step] || []).push(i); });

    const summary = h('section', { class: 'card' }, h('h2', null, errors.length ? 'Points à corriger' : 'Votre dossier est complet'),
      errors.length || warnings.length ? h('p', null, errors.length + ' point(s) à corriger, ' + warnings.length + ' point(s) à vérifier. ' +
        'Vous pouvez générer le PDF à tout moment et le compléter à la main.') : h('p', null, 'Aucun point bloquant.'),
      Object.keys(byStep).map(function (sid) {
        const st = stepById(sid);
        return h('div', { class: 'check-group' }, h('h3', null, st ? st.short || st.title : sid),
          h('ul', null, byStep[sid].map(function (i) {
            return h('li', { class: i.level }, h('span', { class: 'sr-only' }, i.level === 'error' ? 'À corriger : ' : 'À vérifier : '), i.msg, ' ',
              h('button', { type: 'button', class: 'btn-link', onclick: function () {
                const m = /^projets\.(\d+)/.exec(i.path);
                if (m) app.ui.project = +m[1];
                app.go(sid, i.path);
              } }, 'Aller au champ'));
          })));
      }));

    const tA = M.computeBudget(d.budget, false);
    const budgets = h('section', { class: 'card' }, h('h2', null, 'Synthèse financière'),
      h('table', { class: 'summary-table' },
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Budget'), h('th', { scope: 'col' }, 'Charges'), h('th', { scope: 'col' }, 'Produits'),
          h('th', { scope: 'col' }, 'Subventions (74)'), h('th', { scope: 'col' }, 'Résultat'))),
        h('tbody', null,
          h('tr', null, h('th', { scope: 'row' }, 'Association'), h('td', null, M.fmtEuro(tA.charges)), h('td', null, M.fmtEuro(tA.produits)),
            h('td', null, M.fmtEuro(tA.subventions)), h('td', null, M.fmtEuro(tA.resultat))),
          d.projets.map(function (p, i) {
            const t = M.computeBudget(p.budget, true);
            return h('tr', null, h('th', { scope: 'row' }, 'Projet ' + (i + 1) + (p.intitule ? ' – ' + p.intitule : '')),
              h('td', null, M.fmtEuro(t.charges)), h('td', null, M.fmtEuro(t.produits)), h('td', null, M.fmtEuro(t.subventions)),
              h('td', null, M.fmtEuro(t.resultat)));
          }))));

    const sigDiff = (function () {
      const r = d.identification.representant;
      const s = String(d.attestations.signataire || '').toLowerCase().replace(/\s+/g, ' ').trim();
      return s && s !== (r.nom + ' ' + r.prenom).toLowerCase().trim() && s !== (r.prenom + ' ' + r.nom).toLowerCase().trim();
    })();
    const pieces = [
      ['rib', 'Relevé d\'identité bancaire (RIB), sauf s\'il est déjà en possession de l\'autorité', true],
      ['comptes', 'Comptes annuels ou états financiers approuvés du dernier exercice clos (si non publiés au Journal officiel)', true],
      ['mandat', 'Pouvoir ou mandat signé par le représentant légal et le signataire', sigDiff],
      ['crf', 'Compte rendu financier de la subvention précédente (à déposer dans les 6 mois suivant la fin de l\'exercice)', d.demande.recurrence === 'renouvellement'],
    ].filter(function (p) { return p[2]; });
    const piecesCard = h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Pièces à joindre'), app.ctx.helpButton('pieces.intro')),
      h('p', { class: 'intro' }, 'Les statuts et la liste des dirigeants n\'ont pas à être joints : l\'administration les consulte dans le RNA.'),
      pieces.map(function (p) { return app.ctx.checkbox('pieces.' + p[0], p[1]); }));

    const result = h('div', { id: 'generation-result', 'aria-live': 'polite' });
    const actions = h('section', { class: 'card generate' },
      h('h2', null, 'Générer le Cerfa'),
      h('p', null, 'Le PDF officiel est rempli dans votre navigateur. Il contient aussi votre dossier, pour le réimporter plus tard.'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn-primary big', id: 'btn-generate', onclick: function () { generate(result); } }, 'Générer le Cerfa (PDF)'),
        h('button', { type: 'button', class: 'btn-secondary', onclick: function () { exportNow(); } }, 'Enregistrer le fichier du dossier (.json)')),
      result);
    return [summary, budgets, piecesCard, actions];
  }

  function stepsIndex() {
    const o = {};
    AFM.steps.STEPS.forEach(function (s) { if (enabled(s)) o[s.id] = true; });
    return o;
  }

  function exportNow() {
    const name = S.exportFile(app.d);
    app.dirtySinceExport = false;
    updateStatus();
    app.toast('Fichier « ' + name + ' » enregistré dans vos téléchargements.');
  }
  app.exportNow = exportNow;

  async function generate(result) {
    const errors = app.issues.filter(function (i) { return i.level === 'error'; }).length;
    if (errors && !window.confirm('Il reste ' + errors + ' point(s) à corriger. Générer quand même ? Vous pourrez compléter le PDF à la main.')) return;
    const btn = $('#btn-generate');
    btn.disabled = true;
    btn.textContent = 'Génération en cours…';
    result.innerHTML = '';
    try {
      const res = await AFM.pdf.generate(app.d);
      const name = S.pdfName(app.d);
      S.download(res.bytes, name, 'application/pdf');
      const items = [h('p', { class: 'note ok' }, h('b', null, 'Cerfa généré : '), name + ' (dans vos téléchargements).')];
      if (res.warnings.length) {
        items.push(h('div', { class: 'note warn' }, h('b', null, 'Textes trop longs pour leur cadre : '),
          'ils ont été écrits en petits caractères. Pensez à les resserrer.',
          h('ul', null, res.warnings.slice(0, 8).map(function (w) { return h('li', null, (w.project ? 'Projet ' + w.project + ' : ' : '') + '« ' + w.text + '… »'); }))));
      }
      items.push(h('p', { class: 'note info' }, 'Prochaines étapes : relisez le PDF, signez-le (signature électronique ou impression), joignez les pièces, ' +
        'puis envoyez-le à chaque autorité sollicitée. Enregistrez aussi le fichier du dossier pour le retrouver sur un autre poste.'));
      items.forEach(function (i) { result.appendChild(i); });
      if (res.missing.length && window.console) console.warn('Champs introuvables :', res.missing);
    } catch (e) {
      result.appendChild(h('p', { class: 'note error' }, 'La génération a échoué : ' + e.message));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Générer le Cerfa (PDF)';
    }
  }

  /* ---------- Démarrage ---------- */
  function init() {
    const draft = S.loadDraft();
    if (draft) { app.d = draft; app.hasDraft = true; }
    if (!S.available()) {
      $('#storage-warning').hidden = false;
    }
    $('#btn-export').addEventListener('click', exportNow);
    const openInput = $('#open-input');
    $('#btn-open').addEventListener('click', function () { openInput.click(); });
    openInput.addEventListener('change', function () { if (openInput.files[0]) openFile(openInput.files[0], false); openInput.value = ''; });
    $('#btn-home').addEventListener('click', function () { app.go('accueil'); });
    $('#step-select').addEventListener('change', function (e) { app.go(e.target.value); });
    $('#help .help-close').addEventListener('click', function () { $('#help').classList.remove('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#help').classList.remove('open'); });
    updateStatus();
    app.render();
  }

  AFM.app = app;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window.AFM = window.AFM || {});
