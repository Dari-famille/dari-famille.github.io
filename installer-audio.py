#!/usr/bin/env python3
"""Installe les enregistrements reçus dans l'app, en une commande.

La relectrice renvoie une archive `dari-audio.zip` produite par la page
d'enregistrement. Ce script la décompresse au bon endroit, régénère l'index
que consulte l'app, et dit ce qui a été ajouté.

    python3 installer-audio.py ~/Downloads/dari-audio.zip

Sans argument, il prend l'archive la plus récente du dossier Téléchargements.
"""
import pathlib
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).parent
AUDIO = ROOT / "audio"
EXTENSIONS = {".m4a", ".mp3", ".webm", ".wav", ".ogg"}


def trouver_archive():
    if len(sys.argv) > 1:
        p = pathlib.Path(sys.argv[1]).expanduser()
        if not p.exists():
            sys.exit(f"Archive introuvable : {p}")
        return p
    # Repli : la plus récente des archives dari-audio dans Téléchargements.
    dl = pathlib.Path.home() / "Downloads"
    candidats = sorted(dl.glob("dari-audio*.zip"), key=lambda f: f.stat().st_mtime)
    if not candidats:
        sys.exit(
            "Aucune archive trouvée dans ~/Downloads.\n"
            "Usage : python3 installer-audio.py chemin/vers/dari-audio.zip"
        )
    return candidats[-1]


def main():
    archive = trouver_archive()
    AUDIO.mkdir(exist_ok=True)
    avant = {f.stem for f in AUDIO.iterdir() if f.suffix.lower() in EXTENSIONS}

    ajoutes, remplaces = [], []
    with zipfile.ZipFile(archive) as z:
        mauvais = z.testzip()
        if mauvais:
            sys.exit(f"Archive corrompue (fichier {mauvais})")
        for nom in z.namelist():
            chemin = pathlib.Path(nom)
            # On ignore l'index texte joint, et tout ce qui n'est pas un son.
            if chemin.suffix.lower() not in EXTENSIONS:
                continue
            # Un nom de fichier ne doit jamais faire sortir du dossier audio.
            cible = AUDIO / chemin.name
            cible.write_bytes(z.read(nom))
            (remplaces if chemin.stem in avant else ajoutes).append(chemin.name)

    if not ajoutes and not remplaces:
        sys.exit("Aucun enregistrement dans cette archive.")

    print(f"Archive : {archive.name}")
    if ajoutes:
        print(f"  {len(ajoutes)} nouvel(s) enregistrement(s)")
    if remplaces:
        print(f"  {len(remplaces)} remplacé(s)")

    print()
    subprocess.run([sys.executable, str(ROOT / "build.py")], check=True)
    print("\nIl ne reste qu'à pousser depuis GitHub Desktop.")


if __name__ == "__main__":
    main()
