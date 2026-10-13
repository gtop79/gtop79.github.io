/* Petit moteur de formulaires : chaque champ est relié à un chemin du dossier ("identification.siege.cp"). */
(function (AFM) {
  'use strict';
  const M = AFM.model;

  /* h('div', {class: 'x', onclick: fn}, enfant, 'texte', [enfants]) */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    const a = attrs || {};
    Object.keys(a).forEach(function (k) {
      const v = a[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (dk) { el.dataset[dk] = v[dk]; });
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }

  function idOf(path) { return 'f-' + path.replace(/[^a-zA-Z0-9]+/g, '-'); }

  function Ctx(app) {
    this.app = app;
    this.updaters = [];
    this.errorEls = {};
  }

  Ctx.prototype.d = function () { return this.app.d; };
  Ctx.prototype.val = function (path) { return M.get(this.app.d, path); };
  Ctx.prototype.onRefresh = function (fn) { this.updaters.push(fn); fn(); };
  Ctx.prototype.refresh = function () { this.updaters.forEach(function (fn) { fn(); }); };

  Ctx.prototype.helpButton = function (key) {
    if (!key || !AFM.help.H[key]) return null;
    const app = this.app;
    return h('button', { type: 'button', class: 'help-btn', title: 'Aide de la notice officielle',
      'aria-label': 'Aide : ' + AFM.help.H[key].title, onclick: function () { app.showHelp(key, true); } }, '?');
  };

  /* Enveloppe commune : libellé, champ, indication, message d'erreur. */
  Ctx.prototype.wrap = function (path, label, control, o) {
    o = o || {};
    const err = h('p', { class: 'field-error', id: idOf(path) + '-err', 'aria-live': 'polite' });
    this.errorEls[path] = err;
    const lab = label ? h('label', { for: idOf(path) }, label, o.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null) : null;
    return h('div', { class: 'field' + (o.width ? ' w-' + o.width : '') },
      h('div', { class: 'field-head' }, lab, this.helpButton(o.help)),
      control,
      o.hint ? h('p', { class: 'hint', id: idOf(path) + '-hint', html: o.hint }) : null,
      err);
  };

  Ctx.prototype.bindInput = function (input, path, o) {
    const app = this.app;
    o = o || {};
    input.id = idOf(path);
    input.name = path;
    if (o.required) input.setAttribute('aria-required', 'true');
    if (o.hint) input.setAttribute('aria-describedby', idOf(path) + '-hint ' + idOf(path) + '-err');
    else input.setAttribute('aria-describedby', idOf(path) + '-err');
    input.addEventListener('focus', function () { if (o.help) app.showHelp(o.help, false); });
    const ev = (input.type === 'checkbox' || input.type === 'radio' || input.tagName === 'SELECT' || input.type === 'date')
      ? 'change' : 'input';
    input.addEventListener(ev, function () {
      let v = input.type === 'checkbox' ? input.checked : input.value;
      if (o.transform) v = o.transform(v);
      app.update(path, v, { rerender: !!o.rerender });
    });
    input.addEventListener('blur', function () { app.touch(path); });
    return input;
  };

  Ctx.prototype.text = function (path, label, o) {
    o = o || {};
    const v = this.val(path);
    const input = h('input', { type: o.type || 'text', value: v == null ? '' : v, placeholder: o.placeholder,
      inputmode: o.inputmode, autocomplete: o.autocomplete || 'off', maxlength: o.maxlength, list: o.list,
      spellcheck: o.spellcheck === false ? 'false' : null });
    this.bindInput(input, path, o);
    return this.wrap(path, label, o.suffix ? h('div', { class: 'with-suffix' }, input, h('span', { class: 'suffix' }, o.suffix)) : input, o);
  };

  Ctx.prototype.number = function (path, label, o) {
    o = Object.assign({ inputmode: o && o.decimal ? 'decimal' : 'numeric', width: 's' }, o || {});
    return this.text(path, label, o);
  };

  Ctx.prototype.amount = function (path, label, o) {
    o = Object.assign({ inputmode: 'numeric', suffix: '€', width: 's', placeholder: '0' }, o || {});
    return this.text(path, label, o);
  };

  Ctx.prototype.date = function (path, label, o) {
    o = Object.assign({ width: 's' }, o || {});
    const input = h('input', { type: 'date', value: this.val(path) || '' });
    this.bindInput(input, path, o);
    return this.wrap(path, label, input, o);
  };

  Ctx.prototype.textarea = function (path, label, o) {
    o = o || {};
    const v = this.val(path) || '';
    const ta = h('textarea', { rows: o.rows || 4, placeholder: o.placeholder }, v);
    ta.value = v;
    this.bindInput(ta, path, o);
    let counter = null;
    if (o.capacity) {
      counter = h('p', { class: 'counter', 'aria-live': 'polite' });
      const update = function () {
        const n = ta.value.length;
        counter.textContent = n + ' / ' + o.capacity + ' caractères conseillés pour tenir dans le cadre du Cerfa';
        counter.classList.toggle('over', n > o.capacity);
        if (n > o.capacity) counter.textContent += ' — le texte sera réduit, pensez à le resserrer';
      };
      ta.addEventListener('input', update);
      update();
    }
    const box = this.wrap(path, label, ta, o);
    if (counter) box.insertBefore(counter, box.querySelector('.field-error'));
    return box;
  };

  Ctx.prototype.checkbox = function (path, label, o) {
    o = o || {};
    const input = h('input', { type: 'checkbox' });
    input.checked = !!this.val(path);
    this.bindInput(input, path, o);
    const err = h('p', { class: 'field-error', id: idOf(path) + '-err' });
    this.errorEls[path] = err;
    return h('div', { class: 'field check' },
      h('label', { class: 'check-label', for: idOf(path) }, input, h('span', null, label)),
      this.helpButton(o.help),
      o.hint ? h('p', { class: 'hint', html: o.hint }) : null, err);
  };

  Ctx.prototype.radios = function (path, label, options, o) {
    o = o || {};
    const self = this;
    const cur = this.val(path);
    const name = idOf(path);
    const err = h('p', { class: 'field-error', id: name + '-err' });
    this.errorEls[path] = err;
    const items = options.map(function (opt, i) {
      const input = h('input', { type: 'radio', name: name, value: opt[0], id: name + '-' + i });
      input.checked = cur === opt[0];
      input.addEventListener('focus', function () { if (o.help) self.app.showHelp(o.help, false); });
      input.addEventListener('change', function () {
        if (input.checked) self.app.update(path, opt[0], { rerender: !!o.rerender });
      });
      return h('label', { class: 'radio-label', for: name + '-' + i }, input,
        h('span', null, opt[1], opt[2] ? h('small', null, opt[2]) : null));
    });
    return h('fieldset', { class: 'field radios' + (o.inline ? ' inline' : ''), id: name },
      h('legend', null, label, o.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null, this.helpButton(o.help)),
      h('div', { class: 'radio-group' }, items),
      o.hint ? h('p', { class: 'hint', html: o.hint }) : null, err);
  };

  Ctx.prototype.yesno = function (path, label, o) {
    return this.radios(path, label, [['oui', 'Oui'], ['non', 'Non']], Object.assign({ inline: true }, o || {}));
  };

  Ctx.prototype.select = function (path, label, options, o) {
    o = o || {};
    const cur = this.val(path) || '';
    const sel = h('select', null, options.map(function (opt) {
      const op = h('option', { value: opt[0] }, opt[1]);
      if (opt[0] === cur) op.selected = true;
      return op;
    }));
    this.bindInput(sel, path, o);
    return this.wrap(path, label, sel, o);
  };

  Ctx.prototype.datalist = function (id, values) {
    return h('datalist', { id: id }, values.map(function (v) { return h('option', { value: v }); }));
  };

  Ctx.prototype.section = function (title, children, o) {
    o = o || {};
    return h('section', { class: 'card' + (o.class ? ' ' + o.class : '') },
      title ? h('div', { class: 'card-head' }, h('h2', null, title), this.helpButton(o.help)) : null,
      o.intro ? h('p', { class: 'intro', html: o.intro }) : null,
      children);
  };

  Ctx.prototype.grid = function (children, cols) {
    return h('div', { class: 'grid cols-' + (cols || 2) }, children);
  };

  Ctx.prototype.note = function (html, kind) {
    return h('div', { class: 'note ' + (kind || 'info'), role: kind === 'warn' ? 'alert' : null, html: html });
  };

  /* Liste répétable : items = tableau au chemin `path`. */
  Ctx.prototype.repeat = function (path, factory, renderItem, o) {
    o = o || {};
    const self = this;
    const app = this.app;
    const list = this.val(path) || [];
    const wrap = h('div', { class: 'repeat' });
    list.forEach(function (item, i) {
      const removeBtn = (list.length > (o.min || 0)) ? h('button', { type: 'button', class: 'btn-link danger',
        'aria-label': (o.itemLabel || 'Ligne') + ' ' + (i + 1) + ' : supprimer',
        onclick: function () { const arr = self.val(path).slice(); arr.splice(i, 1); app.update(path, arr, { rerender: true }); } },
        'Supprimer') : null;
      wrap.appendChild(h('div', { class: 'repeat-item' }, renderItem(path + '.' + i, i), removeBtn));
    });
    if (!o.max || list.length < o.max) {
      wrap.appendChild(h('button', { type: 'button', class: 'btn-secondary small', onclick: function () {
        const arr = (self.val(path) || []).slice();
        arr.push(factory());
        app.update(path, arr, { rerender: true, focusLast: path });
      } }, '+ ' + (o.addLabel || 'Ajouter')));
    } else if (o.maxNote) {
      wrap.appendChild(h('p', { class: 'hint' }, o.maxNote));
    }
    return wrap;
  };

  AFM.ui = { h: h, Ctx: Ctx, idOf: idOf };
})(window.AFM = window.AFM || {});
