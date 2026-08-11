# 🌙 Dari — le darija en famille

**Dari** est une application web pour apprendre le darija (arabe marocain) en famille, pensée
pour deux publics : un enfant qui ne sait pas encore lire, et un adulte qui veut
comprendre et se faire comprendre chez sa belle-famille.

Aucune dépendance, aucun serveur, aucun compte : ce sont des fichiers statiques
qui fonctionnent hors-ligne.

## Utilisation

**Le plus simple** — ouvrir `standalone.html` par double-clic. Tout est contenu
dans ce fichier unique (aucune connexion nécessaire), il peut se transmettre par
e-mail ou clé USB.

**En local avec service worker** — pour tester l'installation sur téléphone :

```bash
cd ~/Desktop/darija-app && python3 -m http.server 8000
```

puis ouvrir `http://localhost:8000`.

**Installée sur téléphone** — une fois le site en ligne en HTTPS, le navigateur
propose « Ajouter à l'écran d'accueil » : l'app s'installe comme une application
native, s'ouvre en plein écran et fonctionne ensuite sans réseau.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page principale (version multi-fichiers) |
| `style.css` | Styles, thèmes clair et sombre |
| `data.js` | **Tout le contenu pédagogique** — c'est ici qu'on ajoute du vocabulaire |
| `app.js` | Logique : navigation, quiz, jeu de mémoire, générateur de phrases |
| `manifest.json` | Métadonnées PWA (nom, icônes, couleurs) |
| `sw.js` | Service worker : mise en cache pour le hors-ligne |
| `icons/` | Icônes de l'app (générées, motif d'étoile à huit branches) |
| `build.py` | Régénère `standalone.html` depuis les sources |
| `standalone.html` | **Généré** — ne pas éditer à la main |

## Modifier le contenu

Tout le vocabulaire est dans `data.js`, regroupé par catégories :

```js
{
  id: "salutations",
  label: "Salutations",
  emoji: "👋",
  kidFriendly: true,   // visible aussi en mode Enfant
  items: [
    { fr: "Merci", latin: "Choukran", arabic: "شكرا", emoji: "🙏" },
  ],
}
```

Chaque entrée a besoin des quatre champs `fr`, `latin`, `arabic`, `emoji`.
L'emoji sert de support visuel au mode Enfant (qui ne lit pas encore) et au jeu
de mémoire : il doit être identifiable sans texte.

Après toute modification :

```bash
python3 build.py
```

et incrémenter `CACHE_VERSION` dans `sw.js`, sinon les visiteurs déjà venus
garderont l'ancienne version en cache.

## Points d'attention

- **La transcription latine n'est pas normalisée.** Le darija n'a pas
  d'orthographe latine officielle ; on suit l'usage courant du web marocain
  (`3` = ع, `7` = ح, `9`/`q` = ق).
- **La prononciation vocale est approximative.** La synthèse vocale du
  navigateur utilise une voix arabe standard, pas un accent marocain. C'est
  indiqué dans l'interface pour ne pas induire en erreur.
- **Le contenu doit être relu par un locuteur natif** avant toute diffusion
  large : une faute dans une app d'apprentissage se propage.
