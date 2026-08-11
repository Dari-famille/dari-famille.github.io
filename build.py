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
RELECTURE_SRC = ROOT / "relecture-template.html"
RELECTURE_OUT = ROOT / "relecture.html"


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
    # On les découvre dans index.html plutôt que de les lister ici, pour qu'un
    # nouveau fichier soit inliné sans qu'on ait à penser à modifier ce script.
    scripts = re.findall(r'<script src="([^"]+\.js)"></script>', html)
    if not scripts:
        sys.exit("Aucune balise <script src=…> trouvée dans index.html")
    for js_name in scripts:
        js = read(js_name)
        pattern = r'\s*<script src="%s"></script>' % re.escape(js_name)
        html, n = re.subn(pattern, "\n  <script>\n" + js + "</script>", html, count=1)
        if n != 1:
            sys.exit(f"La balise script de {js_name} est introuvable dans index.html")
    print("  scripts inlinés :", ", ".join(scripts))

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

    build_relecture()


def build_relecture():
    """Page de relecture autonome, à envoyer à la relectrice native.

    Elle doit tenir dans un seul fichier : il est transmis par message et
    ouvert sur un téléphone, sans serveur ni connexion.
    """
    if not RELECTURE_SRC.exists():
        print("  (pas de relecture-template.html, page de relecture ignorée)")
        return

    html = RELECTURE_SRC.read_text(encoding="utf-8")
    js = read("situations.js")
    html, n = re.subn(
        r'\s*<script src="situations\.js"></script>',
        "\n<script>\n" + js + "</script>",
        html,
        count=1,
    )
    if n != 1:
        sys.exit("La balise script de situations.js est introuvable dans le modèle de relecture")

    RELECTURE_OUT.write_text(html, encoding="utf-8")

    # Compte les lignes à relire, pour savoir tout de suite ce qu'on demande.
    # Les lignes de commentaire sont écartées : l'en-tête du fichier documente
    # `check: true` et serait comptée comme une entrée.
    pending = sum(
        1
        for line in js.splitlines()
        if not line.lstrip().startswith("//") and re.search(r"check:\s*true", line)
    )
    print(f"relecture.html régénéré ({len(html) / 1024:.0f} Ko, {pending} expressions à relire)")


if __name__ == "__main__":
    main()
