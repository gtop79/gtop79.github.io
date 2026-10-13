"""Embed the official Cerfa PDF into js/cerfa-template.js.

The application must work when index.html is opened directly from disk (file://),
where browsers forbid fetch() of local files. The PDF is therefore shipped as a
base64 string. Run this script again whenever assets/cerfa_12156-06.pdf changes:

    python tools/build_template.py
"""
import base64
import hashlib
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "assets" / "cerfa_12156-06.pdf"
OUT = ROOT / "js" / "cerfa-template.js"


def main():
    data = PDF.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    sha = hashlib.sha256(data).hexdigest()
    OUT.write_text(
        "/* Généré par tools/build_template.py — ne pas modifier à la main.\n"
        " * Source : assets/%s (sha256 %s) */\n"
        "window.AFM = window.AFM || {};\n"
        "window.AFM.CERFA_TEMPLATE_B64 = \"%s\";\n" % (PDF.name, sha, b64),
        encoding="utf-8",
    )
    print("written", OUT, len(b64), "chars")


if __name__ == "__main__":
    main()
