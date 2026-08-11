#!/usr/bin/env python3
"""Régénère standalone.html à partir des fichiers sources.

standalone.html est la version « un seul fichier » : tout est inliné (CSS, JS,
icône), elle s'ouvre par double-clic sans serveur et se transmet par simple
envoi de fichier. Elle était jusqu'ici maintenue à la main, avec le risque
qu'elle diverge silencieusement de index.html — d'où ce script.

Usage :  python3 build.py
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "index.html"
OUT = ROOT / "standalone.html"


def read(name):
    path = ROOT / name
    if not path.exists():
        sys.exit(f"Fichier source manquant : {name}")
    return path.read_text(encoding="utf-8")


def main():
    html = read("index.html")

    # CSS : <link rel="stylesheet" href="style.css" />  ->  <style>…</style>
    css = read("style.css")
    html, n = re.subn(
        r'\s*<link rel="stylesheet" href="style\.css"\s*/?>',
        "\n  <style>\n" + css + "</style>",
        html,
    )
    if n != 1:
        sys.exit("Le lien vers style.css est introuvable dans index.html")

    # JS : chaque <script src="x.js"></script>  ->  <script>…</script>
    for js_name in ("data.js", "app.js"):
        js = read(js_name)
        pattern = r'\s*<script src="%s"></script>' % re.escape(js_name)
        html, n = re.subn(pattern, "\n  <script>\n" + js + "</script>", html, count=1)
        if n != 1:
            sys.exit(f"La balise script de {js_name} est introuvable dans index.html")

    # Le service worker et le manifeste exigent HTTPS : inutiles ici, et le
    # navigateur journaliserait une erreur à chaque ouverture en file://.
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
    html = re.sub(
        r'\s*<script>\s*// Le service worker.*?</script>', "", html, flags=re.DOTALL
    )

    # Icônes en data URI, pour que le fichier reste réellement autonome.
    for attr_pattern, icon in (
        (r'href="icons/favicon-32\.png"', "icons/favicon-32.png"),
        (r'href="icons/apple-touch-icon\.png"', "icons/apple-touch-icon.png"),
    ):
        icon_path = ROOT / icon
        if icon_path.exists():
            b64 = base64.b64encode(icon_path.read_bytes()).decode("ascii")
            html = re.sub(
                attr_pattern, 'href="data:image/png;base64,%s"' % b64, html, count=1
            )

    html = html.replace(
        "<title>Apprendre la Darija</title>",
        "<title>Apprendre la Darija</title>\n  <!-- Fichier généré par build.py "
        "— ne pas éditer à la main, éditer les sources puis relancer le script. -->",
        1,
    )

    OUT.write_text(html, encoding="utf-8")
    print(f"standalone.html régénéré ({len(html) / 1024:.0f} Ko)")


if __name__ == "__main__":
    main()
