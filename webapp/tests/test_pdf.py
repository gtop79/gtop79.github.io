"""Test du remplissage du Cerfa (sans l'interface).

Prérequis : pip install playwright pymupdf ; Microsoft Edge installé (ou Chrome : BROWSER_CHANNEL=chrome).
Lancement : python tests/test_pdf.py   → écrit tests/out/exemple.pdf et des aperçus PNG.
"""
import base64
import json
import os
import pathlib
import sys

import fitz  # PyMuPDF
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "out"
CHANNEL = os.environ.get("BROWSER_CHANNEL", "msedge")


def generate(page, expr):
    b64 = page.evaluate(
        """async (expr) => {
            const d = eval(expr);
            const res = await AFM.pdf.generate(d);
            let bin = ''; const b = res.bytes;
            for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
            return JSON.stringify({ b64: btoa(bin), warnings: res.warnings, missing: res.missing });
        }""", expr)
    res = json.loads(b64)
    return base64.b64decode(res["b64"]), res["warnings"], res["missing"]


def field_values(pdf_path):
    doc = fitz.open(pdf_path)
    vals = {}
    for p in doc:
        for w in p.widgets():
            vals[w.field_name] = w.field_value
    return doc, vals


def check(cond, msg, failures):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=CHANNEL, headless=True)
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto((ROOT / "tests" / "harness.html").as_uri())
        pdf, warnings, missing = generate(page, "AFM.SAMPLE")
        (OUT / "exemple.pdf").write_bytes(pdf)
        print("warnings:", warnings)
        check(not missing, "tous les champs référencés existent (%s)" % missing, failures)
        check(not errors, "aucune erreur JavaScript (%s)" % errors, failures)

        # Variante : demande uniquement en numéraire, un seul projet → pas de fiche équipements.
        pdf2, _, missing2 = generate(page, "(() => { const d = JSON.parse(JSON.stringify(AFM.SAMPLE));"
                                           " d.demande.nature = false; d.projets = [d.projets[0]]; return d; })()")
        (OUT / "exemple-numeraire.pdf").write_bytes(pdf2)

        # Réimportation : la pièce jointe redonne le dossier.
        back = page.evaluate(
            """async (b64) => {
                const bin = atob(b64); const u = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
                const r = await AFM.pdf.readAttachedDossier(u);
                return { source: r.source, nom: r.dossier.identification.nom, projets: r.dossier.projets.length };
            }""", base64.b64encode(pdf).decode())
        check(back["source"] == "attachment" and back["projets"] == 2, "réimportation depuis la pièce jointe (%s)" % back, failures)
        browser.close()

    doc, v = field_values(OUT / "exemple.pdf")
    check(doc.page_count == 13, "13 pages (10 + 3 pour le projet 2) : %d" % doc.page_count, failures)
    check(v.get("Check Box4") in ("Oui", True, "On"), "case « en numéraire » cochée (%r)" % v.get("Check Box4"), failures)
    check(v.get("Check Box6") in ("Oui", True, "On"), "case « première demande » cochée", failures)
    check(v.get("Check Box7") in ("Off", False, ""), "case « renouvellement » non cochée (%r)" % v.get("Check Box7"), failures)
    check(v.get("Text39") == "123 456 789 00015", "SIRET formaté (%r)" % v.get("Text39"), failures)
    check(v.get("Total 60") == "4200", "total 60 association = 4200 (%r)" % v.get("Total 60"), failures)
    check(v.get("Total 74") == "75000", "total 74 association = 75000 (%r)" % v.get("Total 74"), failures)
    check(v.get("74-1") in ("", None), "ligne d'en-tête 74-1 laissée vide", failures)
    check(v.get("Total des charges") == "91050" and v.get("Total des produits") == "91050", "budget association équilibré", failures)
    check(v.get("Text76") == "109050", "total charges + CVN = 109050 (%r)" % v.get("Text76"), failures)
    check(v.get("2/74-4") == "1500", "4 financeurs État fusionnés sur 3 lignes : dernière ligne = 1000 + 500 (%r)" % v.get("2/74-4"), failures)
    check(v.get("0Row1_2") == "2400", "insuffisance du projet 1 = 2400 (%r)" % v.get("0Row1_2"), failures)
    check(v.get("Text60") == "20,6", "part de la subvention = 8000 / 38850 = 20,6 %% (%r)" % v.get("Text60"), failures)
    check(v.get("Text36") == "10500" and v.get("Text57") == "2027", "montant demandé en attestation", failures)
    check(bool(doc.embfile_names()), "pièce jointe présente (%s)" % doc.embfile_names(), failures)
    # Projet 2 aplati : son intitulé apparaît dans le texte de la page 8.
    check("Semaine fictive du compost" in doc[7].get_text(), "projet 2 inséré en page 8", failures)

    doc2, v2 = field_values(OUT / "exemple-numeraire.pdf")
    check(doc2.page_count == 9, "sans demande en nature : fiche équipements retirée (9 pages : %d)" % doc2.page_count, failures)

    for i, pg in enumerate(doc):
        pg.get_pixmap(dpi=80).save(str(OUT / ("exemple-p%02d.png" % (i + 1))))
    print("\n%d échec(s)" % len(failures))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
