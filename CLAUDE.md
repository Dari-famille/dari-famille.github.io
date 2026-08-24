# Dari — règles de travail

Ce fichier retient ce qui ne se lit pas dans le code : les décisions, ce que la
mesure a établi, et les erreurs déjà commises. Le `README.md` explique comment
le projet marche ; celui-ci explique pourquoi il est ainsi.

## Qui décide quoi

**La relectrice native fait foi sur tout le contenu darija.** Sa correction
s'applique littéralement, sans réinterprétation. Le 21 août, sa correction
« Dewwez liya mmi » a été relue comme signifiant *maman* alors que « mmi » est
la grand-mère — l'entrée a été renommée à tort. Si une réponse semble
incohérente, on lui pose la question ; on ne modifie pas le contenu.

Frontière : le **contenu** (darija, sens, usage) est à elle. La **présentation**
(typographie française, mise en page) relève du code, mais tout changement doit
être annoncé.

## Contenu

- **Transcription latine : `3` pour ع, mais `h` et `q`** — pas `7` ni `9`. Le
  public visé est francophone débutant et ne connaît pas l'écriture par
  chiffres. 333 entrées suivent cette règle ; les 5 qui ne la suivent pas sont
  marquées `check: true` en attente de sa décision.
- `check: true` = à faire valider. `faux: true` = déclarée fausse, retirée de
  l'affichage, de la recherche et des quiz, mais conservée dans le fichier.
  Mieux vaut ne rien montrer qu'une phrase fausse : on ouvre cette app
  précisément pour ne pas se tromper devant sa belle-famille.
- `fem:` porte la forme féminine en transcription latine, sans arabe séparé.
  Attention au sens : pour « je suis heureux », le féminin est celui de la
  personne qui parle ; pour « mange ! », celui de la personne à qui on parle.

## Code

- **`build.py` après toute modification de source.** `standalone.html`,
  `relecture.html` et `enregistrement.html` sont générés — ne jamais les éditer.
- **Incrémenter `CACHE_VERSION` dans `sw.js`** dès que `app.js`, `style.css`,
  `data.js` ou `situations.js` change. Sans cela, les visiteurs déjà venus et
  les installations gardent l'ancienne version indéfiniment. Oublié le 21 août :
  les corrections de la relectrice n'auraient atteint personne.
- **Les remplacements de `re.subn` dans `build.py` passent par une lambda.**
  Sous forme de chaîne, les antislashs du JavaScript (`\u`, `\n`, `\1`) sont
  lus comme des séquences d'échappement et la génération échoue.
- **`cleAudio(item)` = hash de `fr + "|" + latin`.** Cette clé nomme les
  fichiers audio et identifie les favoris et la progression. Changer `fr` ou
  `latin` d'une entrée déjà enregistrée casse le lien vers son enregistrement.
- **Aucune dépendance, aucun serveur.** C'est ce qui rend l'app installable,
  instantanée et utilisable sans réseau — au Maroc, la connexion n'est pas
  acquise. Toute proposition ajoutant une dépendance d'exécution est à refuser.
- L'app modifie brièvement l'adresse pour marquer les étapes franchies. Tout
  chemin relatif résolu à ce moment-là part un cran trop bas : figer les URL au
  chargement (voir `CHEMIN_SW` dans `index.html`).

## Mesure

Cloudflare Web Analytics, sans cookie, sans événement personnalisé. Les étapes
sont simulées par des changements d'adresse (`/etape/<nom>`).

- **« Visits » ne vaut plus rien : il est bloqué à zéro.** Chaque jalon produit
  une page vue dont le référent est le site lui-même ; le 24 août, les 27 pages
  vues de la journée étaient auto-référencées à 100 % et Cloudflare affichait
  0 visite. Une visite n'est comptée que si le référent est externe — il ne
  l'est jamais. Ni « Visits » ni « Page views » ne répondent donc à la question
  « combien de personnes ».
- **Compter les personnes par les chemins `/etape/…`, jamais par les totaux.**
  Un jalon ne part qu'une fois par session (`jalonsVus`), donc chaque chemin
  compte des sessions distinctes : `/etape/venu-de-story` = 4 signifie quatre
  arrivées par la story. C'est la seule mesure fiable qui reste, et c'est à cela
  que sert `?src=`. Le panneau « Navigation types » donne un second repère :
  « Navigate » = chargements réels, « Unknown » = les jalons.
- **Toujours étendre les listes avant de conclure.** Le panneau s'ouvre sur
  cinq lignes. Le 22 août, cette troncature m'a fait écrire trois jours durant
  que personne ne jouait au quiz et que le bascule Enfant/Adulte était mort :
  `5-reponses`, `mode-kid` et `mode-adult` étaient simplement sous la coupure.
- **Un jalon émis juste après un autre se perd.** `5-reponses` apparaît sans
  que `1-reponse` n'apparaisse jamais, ce qui est impossible. La file espace
  les étapes de 400 ms et cela ne suffit pas.
- **Ce que la mesure a établi :** écouter est le geste dominant (44 écoutes
  pour 76 visites) ; le quiz est joué mais rare. La valeur perçue est un
  dictionnaire de prononciation, pas un cours.
- **Un jalon nouvellement déployé met deux ouvertures à se manifester** chez
  qui revient : le service worker sert d'abord l'ancienne version. Ne rien
  conclure d'un zéro pendant les premiers jours.
- **Ne jamais ouvrir le site en ligne pour vérifier quelque chose** — chaque
  visite pollue une base de quelques dizaines. Utiliser `standalone.html` en
  local, ou une copie servie localement dont la balise a été retirée.
  `relecture.html` et `enregistrement.html` ne portent pas la balise.

## Auditer

Les audits par fonction ne trouvent pas les pannes qui comptent. Trois d'entre
elles ont été découvertes à l'usage, par les personnes concernées, après un
audit déclaré propre : la page d'enregistrement cassée trois fois de suite, et
l'invitation à installer jamais affichée au plus gros segment du trafic.

- **Tester le DEUXIÈME usage, pas le premier.** Le micro fonctionnait au premier
  enregistrement et ne produisait plus rien au suivant, Safari iOS tuant la
  piste audio après le premier MediaRecorder. Un test qui s'arrête au premier
  cas déclare l'outil bon.
- **Tester dans le contexte d'arrivée.** Personne n'ouvre l'app dans un
  navigateur nu : on arrive par Instagram, dans un navigateur intégré qui
  n'émet pas `beforeinstallprompt` et dont le menu Partager n'a pas
  « Sur l'écran d'accueil ». Simuler ces `userAgent` fait partie de l'audit.
- **Suivre le parcours entier**, pas les écrans un par un : voir la vidéo,
  cliquer, atterrir, écouter, installer. Les deux pannes les plus coûteuses
  étaient aux jointures — un chemin relatif résolu pendant un jalon, une
  consigne d'installation impossible à l'endroit où on la lisait.
- **Dire ce qui n'est pas testable ici** plutôt que de le passer sous silence :
  le rendu sonore réel, un vrai iPhone, et les règles des plateformes (YouTube
  refuse les liens cliquables aux chaînes non vérifiées — aucun audit du dépôt
  ne pouvait le révéler).

## Discrétion

Le projet est public sous le nom Dari ; les personnes derrière ne le sont pas.
Aucun nom réel, aucune adresse personnelle, aucun lien vers un compte privé,
dans le dépôt comme dans l'app.
