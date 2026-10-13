"""Test de bout en bout de l'interface (Edge headless via Playwright).

Lancement : python tests/test_app.py   → captures d'écran dans tests/out/ui-*.png
"""
import os
import pathlib
import sys

import fitz
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "out"
URL = (ROOT / "index.html").as_uri()
CHANNEL = os.environ.get("BROWSER_CHANNEL", "msedge")
failures = []


def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def shot(page, name):
    page.screenshot(path=str(OUT / ("ui-%s.png" % name)), full_page=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=CHANNEL, headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True, locale="fr-FR")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("dialog", lambda d: d.accept())
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        # 1. Accueil
        page.goto(URL)
        check(page.locator("h1").inner_text() == "Accueil", "l'accueil s'affiche")
        shot(page, "01-accueil")

        # 2. Saisie manuelle de la première étape
        page.get_by_role("button", name="Commencer").click()
        check("Nature de la demande" in page.locator("h1").inner_text(), "étape 1 ouverte")
        page.get_by_role("checkbox", name="En numéraire (argent)").check()
        page.get_by_role("radio", name="Première demande").check()
        page.get_by_role("checkbox", name="Projet(s) / action(s)").check()
        page.get_by_role("radio", name="Annuelle ou ponctuelle").check()
        page.get_by_role("checkbox", name="Commune ou intercommunalité").check()
        page.locator("#f-demande-dest-commune-nom").fill("Ville fictive")
        shot(page, "02-demande-saisie")
        page.get_by_role("button", name="Suivant : Identification →").click()
        page.locator("#f-identification-siret").fill("12345")
        page.locator("#f-identification-siret").blur()
        check("14 chiffres" in page.locator("#f-identification-siret-err").inner_text(), "erreur de format SIRET affichée")
        page.locator("#f-identification-siret").fill("12345678900015")
        page.locator("#f-identification-nom").fill("Association de test (fictive)")
        page.wait_for_timeout(600)
        stored = page.evaluate("JSON.parse(localStorage.getItem('askformoney.dossier.v1')).identification.siret")
        check(stored == "12345678900015", "sauvegarde automatique dans le navigateur")
        shot(page, "03-identification")

        # 3. Exemple fictif et parcours de toutes les étapes
        page.get_by_role("button", name="Demande de subvention assistée").click()
        page.get_by_role("button", name="Charger l'exemple").click()
        check(page.locator("#f-demande-dest-region-nom").input_value() == "Région Exemple", "exemple chargé")
        names = ["04-demande", "05-identification", "06-relations", "07-moyens", "08-budget", "09-projets", "10-equipement", "11-attestations"]
        for i, n in enumerate(names):
            shot(page, n)
            page.locator(".step-nav .btn-primary").click()
        check("Vérifier" in page.locator("h1").inner_text(), "page de vérification atteinte")
        shot(page, "12-verification")

        # 4. Calculs du budget en direct
        page.locator(".step-link", has_text="Budget association").click()
        before = page.locator(".budget-summary").inner_text()
        page.locator("#f-budget-v-601").fill("4000")
        after = page.locator(".budget-summary").inner_text()
        check(before != after and "Excédent" in after or "Insuffisance" in after, "le résultat se recalcule à la saisie")
        page.locator("#f-budget-v-601").fill("3000")

        # 5. Projets : onglets
        page.locator(".step-link", has_text="Projet(s)").click()
        check(page.locator(".tab").count() == 3, "deux projets + bouton d'ajout")
        page.locator(".tab", has_text="Projet 2").click()
        check(page.locator("#f-projets-1-intitule").input_value().startswith("Semaine"), "onglet du projet 2")

        # 6. Génération du PDF
        page.locator(".step-link", has_text="Vérifier et générer").click()
        with page.expect_download() as dl:
            page.locator("#btn-generate").click()
        pdf_path = OUT / "ui-generated.pdf"
        dl.value.save_as(pdf_path)
        page.wait_for_selector("#generation-result .note")
        doc = fitz.open(pdf_path)
        check(doc.page_count == 13, "PDF généré depuis l'interface (13 pages : %d)" % doc.page_count)
        check(bool(doc.embfile_names()), "dossier joint au PDF")
        shot(page, "13-genere")

        # 7. Fichier de sauvegarde puis réouverture dans un « autre navigateur » (contexte vierge)
        with page.expect_download() as dl2:
            page.locator("#btn-export").click()
        json_path = OUT / "ui-dossier.json"
        dl2.value.save_as(json_path)
        ctx2 = browser.new_context(viewport={"width": 1280, "height": 860}, accept_downloads=True)
        p2 = ctx2.new_page()
        p2.on("pageerror", lambda e: errors.append(str(e)))
        p2.on("dialog", lambda d: d.accept())
        p2.goto(URL)
        p2.locator("input[type=file]").nth(1).set_input_files(str(json_path))
        p2.wait_for_selector("#f-demande-dest-region-nom")
        check(p2.locator("#f-demande-dest-region-nom").input_value() == "Région Exemple", "dossier rouvert depuis le fichier .json")

        # 8. Renouvellement à partir du PDF généré
        p2.get_by_role("button", name="Demande de subvention assistée").click()
        p2.locator("input[type=file]").nth(2).set_input_files(str(pdf_path))
        p2.wait_for_selector("#f-demande-dest-region-nom")
        rec = p2.evaluate("AFM.app.d.demande.recurrence + '|' + AFM.app.d.budget.annee")
        check(rec == "renouvellement|2028", "renouvellement préparé depuis le PDF (%s)" % rec)
        ctx2.close()

        # 9. Affichage mobile
        m = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        mp = m.new_page()
        mp.on("pageerror", lambda e: errors.append(str(e)))
        mp.goto(URL)
        mp.evaluate("localStorage.setItem('askformoney.dossier.v1', JSON.stringify(AFM.model.normalize(AFM.SAMPLE)))")
        mp.reload()
        mp.get_by_role("button", name="Continuer").click()
        shot(mp, "14-mobile-demande")
        mp.select_option("#step-select", "budget")
        shot(mp, "15-mobile-budget")
        width = mp.evaluate("document.documentElement.scrollWidth")
        check(width <= 390, "pas de défilement horizontal sur mobile (%d px)" % width)
        m.close()

        check(not errors, "aucune erreur JavaScript (%s)" % errors[:3])
        browser.close()
    print("\n%d échec(s)" % len(failures))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
