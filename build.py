#!/usr/bin/env python3
"""Régénère standalone.html à partir des fichiers sources.

standalone.html est la version « un seul fichier » : tout est inliné (CSS, JS,
icône), elle s'ouvre par double-clic sans serveur et se transmet par simple
envoi de fichier. Elle était jusqu'ici maintenue à la main, avec le risque
qu'elle diverge silencieusement de index.html — d'où ce script.

Usage :  python3 build.py
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "index.html"
OUT = ROOT / "standalone.html"
RELECTURE_SRC = ROOT / "relecture-template.html"
RELECTURE_OUT = ROOT / "relecture.html"
AUDIO_SRC = ROOT / "enregistrement-template.html"
AUDIO_OUT = ROOT / "enregistrement.html"


def read(name):
    path = ROOT / name
    if not path.exists():
        sys.exit(f"Fichier source manquant : {name}")
    return path.read_text(encoding="utf-8")


def main():
    html = read("index.html")

    # CSS : <link rel="stylesheet" href="style.css" />  ->  <style>…</style>
    css = read("style.css")
    styles = "\n  <style>\n" + css + "</style>"
    html, n = re.subn(
        r'\s*<link rel="stylesheet" href="style\.css"\s*/?>',
        lambda _m: styles,
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
        # Le remplacement passe par une fonction : sous forme de chaîne, les
        # antislashs du JavaScript (\u, \n, \1…) seraient lus comme des
        # séquences d'échappement et feraient échouer la génération.
        remplacement = "\n  <script>\n" + js + "</script>"
        html, n = re.subn(pattern, lambda _m: remplacement, html, count=1)
        if n != 1:
            sys.exit(f"La balise script de {js_name} est introuvable dans index.html")
    print("  scripts inlinés :", ", ".join(scripts))

    # Le service worker et le manifeste exigent HTTPS : inutiles ici, et le
    # navigateur journaliserait une erreur à chaque ouverture en file://.
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
    html = re.sub(
        r'\s*<script>\s*// Le service worker.*?</script>', "", html, flags=re.DOTALL
    )

    # La mesure d'audience n'a rien à faire ici : standalone.html se transmet
    # de main en main et s'ouvre en file://, où elle ne compterait rien
    # d'exploitable tout en émettant une requête vers l'extérieur. Un fichier
    # « autonome » qui appelle un serveur au chargement ne l'est pas.
    html = re.sub(
        r"\s*<!-- Mesure d'audience Cloudflare.*?</script>", "", html, flags=re.DOTALL
    )
    if "cloudflareinsights" in html:
        sys.exit(
            "La balise de mesure d'audience n'a pas pu être retirée de "
            "standalone.html : le commentaire qui la précède a dû changer. "
            "Corriger le motif dans build.py avant de publier."
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
    build_enregistrement()
    build_audio_index()


def build_audio_index():
    """Recense les enregistrements natifs présents dans audio/.

    L'app interroge cet index avant de prononcer un mot : ce qui y figure est
    dit par une vraie voix marocaine, le reste retombe sur la synthèse du
    navigateur, qui ne parle que l'arabe standard. Il suffit donc de déposer
    les fichiers de l'archive dans audio/ et de relancer ce script.
    """
    dossier = ROOT / "audio"
    dossier.mkdir(exist_ok=True)

    clips = {}
    for f in sorted(dossier.iterdir()):
        if f.suffix.lower() in (".m4a", ".mp3", ".webm", ".wav", ".ogg"):
            clips[f.stem] = f.suffix.lstrip(".").lower()

    index = {
        "_lisezmoi": (
            "Index des enregistrements natifs disponibles. La clé est dérivée du "
            "texte de l'entrée (fr|latin), la valeur est l'extension du fichier. "
            "Un mot absent de cet index est prononcé par la synthèse du "
            "navigateur, en arabe standard. Fichier généré par build.py."
        ),
        "clips": clips,
    }
    (dossier / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    total = 338
    print(f"audio/index.json : {len(clips)} enregistrement(s) sur ~{total} phrases")
    if clips:
        pct = round(len(clips) / total * 100)
        print(f"  soit {pct}% du contenu avec une vraie voix")


def build_enregistrement():
    """Page d'enregistrement autonome, pour la locutrice native.

    Elle doit tenir en un fichier : ouverte depuis un lien sur téléphone, elle
    enregistre dans le navigateur et n'a besoin d'aucun serveur.
    """
    if not AUDIO_SRC.exists():
        print("  (pas de enregistrement-template.html, page ignorée)")
        return

    html = AUDIO_SRC.read_text(encoding="utf-8")
    for name in ("situations.js", "data.js"):
        js = read(name)
        pattern = r'\s*<script src="%s"></script>' % re.escape(name)
        remplacement = "\n<script>\n" + js + "</script>"
        html, n = re.subn(pattern, lambda _m: remplacement, html, count=1)
        if n != 1:
            sys.exit(f"La balise script de {name} est introuvable dans le modèle d'enregistrement")

    AUDIO_OUT.write_text(html, encoding="utf-8")
    print(f"enregistrement.html régénéré ({len(html) / 1024:.0f} Ko)")


def build_relecture():
    """Page de relecture autonome, à envoyer à la relectrice native.

    Elle doit tenir dans un seul fichier : il est transmis par message et
    ouvert sur un téléphone, sans serveur ni connexion.
    """
    if not RELECTURE_SRC.exists():
        print("  (pas de relecture-template.html, page de relecture ignorée)")
        return

    html = RELECTURE_SRC.read_text(encoding="utf-8")
    # data.js avant situations.js : la page réunit les deux listes, et
    # `motsARelire()` est défini dans data.js. Ce fichier manquait — la
    # relecture ne portait que sur les phrases, jamais sur le vocabulaire.
    sources = []
    for nom in ("data.js", "situations.js"):
        js = read(nom)
        sources.append(js)
        remplacement = "\n<script>\n" + js + "</script>"
        html, n = re.subn(
            r'\s*<script src="%s"></script>' % re.escape(nom),
            lambda _m: remplacement,
            html,
            count=1,
        )
        if n != 1:
            sys.exit(f"La balise script de {nom} est introuvable dans le modèle de relecture")

    RELECTURE_OUT.write_text(html, encoding="utf-8")

    # Compte les lignes à relire, pour savoir tout de suite ce qu'on demande.
    # Les lignes de commentaire sont écartées : l'en-tête du fichier documente
    # `check: true` et serait comptée comme une entrée.
    pending = sum(
        1
        for js in sources
        for line in js.splitlines()
        if not line.lstrip().startswith("//") and re.search(r"check:\s*true", line)
    )
    print(f"relecture.html régénéré ({len(html) / 1024:.0f} Ko, {pending} expressions à relire)")


if __name__ == "__main__":
    main()
