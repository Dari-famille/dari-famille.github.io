#!/usr/bin/env python3
"""Fabrique la vignette affichée quand le lien est collé quelque part.

Un lien partagé dans WhatsApp, dans un message ou sur Facebook s'affiche avec
une vignette. Sans balise `og:image`, il n'y en a aucune : le lien apparaît en
texte gris, et se fait beaucoup moins ouvrir. Or les statistiques montrent un
flux constant de visites sans référent depuis des ordinateurs — la signature
d'un lien transmis en conversation privée. C'est précisément là que cette
image travaille.

    python3 make-carte-partage.py

Le format 1200x630 est celui qu'attendent WhatsApp, Facebook et LinkedIn.
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

RACINE = pathlib.Path(__file__).parent
SORTIE = RACINE / "icons" / "partage.png"

L, H = 1200, 630

MAJORELLE = (51, 80, 158)
CREME = (248, 240, 221)
SAFRAN = (217, 154, 43)
BLANC = (255, 255, 255)

SERIF = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SANS = "/System/Library/Fonts/Supplemental/Avenir Next.ttc"


def police(chemin, taille):
    try:
        return ImageFont.truetype(chemin, taille)
    except OSError:
        # Sur une machine sans ces polices, mieux vaut une vignette moins jolie
        # que pas de vignette du tout.
        return ImageFont.load_default()


def centre(d, texte, y, f, couleur):
    l = d.textlength(texte, font=f)
    d.text(((L - l) / 2, y), texte, font=f, fill=couleur)


def main():
    img = Image.new("RGB", (L, H), MAJORELLE)
    d = ImageDraw.Draw(img)

    # Un filet safran en haut : la même signature que les vidéos, pour que
    # celui qui reçoit le lien après avoir vu un Reel reconnaisse la marque.
    d.rectangle([0, 0, L, 10], fill=SAFRAN)

    centre(d, "Dari", 132, police(SERIF, 150), SAFRAN)
    centre(d, "le darija en famille", 300, police(SERIF, 54), BLANC)

    centre(d, "Pour que vos enfants parlent", 392, police(SANS, 40), CREME)
    centre(d, "avec leurs grands-parents", 444, police(SANS, 40), CREME)

    # Ces trois mots lèvent les trois objections d'un lien reçu sans contexte :
    # est-ce que ça coûte, est-ce qu'il faut s'inscrire, est-ce que ça marche
    # au Maroc.
    centre(d, "GRATUIT   ·   SANS COMPTE   ·   HORS-LIGNE",
           540, police(SANS, 26), SAFRAN)

    SORTIE.parent.mkdir(exist_ok=True)
    img.save(SORTIE, "PNG", optimize=True)
    print(f"{SORTIE.relative_to(RACINE)} — {L}x{H}, "
          f"{SORTIE.stat().st_size / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
