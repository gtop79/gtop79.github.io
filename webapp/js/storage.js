/* Conservation du dossier : sauvegarde automatique dans le navigateur, fichier de sauvegarde,
 * réimportation d'un Cerfa généré par l'application (données jointes au PDF). */
(function (AFM) {
  'use strict';
  const M = AFM.model;
  const KEY = 'askformoney.dossier.v1';
  const META = 'askformoney.meta.v1';

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  function saveDraft(d) {
    d.updatedAt = new Date().toISOString();
    return safeSet(KEY, JSON.stringify(d));
  }
  function loadDraft() {
    const raw = safeGet(KEY);
    if (!raw) return null;
    try { return M.normalize(JSON.parse(raw)); } catch (e) { return null; }
  }
  function clearDraft() {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ }
  }
  function getMeta() {
    try { return JSON.parse(safeGet(META) || '{}'); } catch (e) { return {}; }
  }
  function setMeta(patch) { safeSet(META, JSON.stringify(Object.assign(getMeta(), patch))); }

  function slug(s) {
    return String(s || 'association').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'association';
  }
  function stamp() {
    const d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function download(bytesOrText, filename, mime) {
    const blob = new Blob([bytesOrText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function exportFile(d) {
    const name = 'dossier-subvention-' + slug(d.identification.sigle || d.identification.nom) + '-' + stamp() + '.json';
    download(JSON.stringify(Object.assign({}, d, { exportedAt: new Date().toISOString() }), null, 2), name, 'application/json');
    setMeta({ lastExport: new Date().toISOString() });
    return name;
  }

  function pdfName(d) {
    return 'cerfa-12156-' + slug(d.identification.sigle || d.identification.nom) + '-' + stamp() + '.pdf';
  }

  /* Lit un fichier choisi par l'utilisateur : dossier (.json) ou Cerfa (.pdf). */
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      reader.onerror = function () { reject(new Error('Lecture du fichier impossible.')); };
      reader.onload = async function () {
        try {
          if (isPdf) {
            const res = await AFM.pdf.readAttachedDossier(new Uint8Array(reader.result));
            resolve({ dossier: res.dossier, source: res.source });
          } else {
            const data = JSON.parse(reader.result);
            if (data.schema && data.schema !== M.SCHEMA) throw new Error('Ce fichier n\'est pas un dossier askForMoney.');
            resolve({ dossier: M.normalize(data), source: 'json' });
          }
        } catch (e) {
          reject(new Error(isPdf ? 'Ce PDF ne peut pas être lu (' + e.message + ').' : 'Ce fichier n\'est pas un dossier valide (' + e.message + ').'));
        }
      };
      if (isPdf) reader.readAsArrayBuffer(file); else reader.readAsText(file, 'utf-8');
    });
  }

  AFM.storage = {
    saveDraft: saveDraft, loadDraft: loadDraft, clearDraft: clearDraft, getMeta: getMeta, setMeta: setMeta,
    exportFile: exportFile, readFile: readFile, download: download, pdfName: pdfName,
    available: function () { return safeSet('askformoney.probe', '1'); },
  };
})(window.AFM = window.AFM || {});
