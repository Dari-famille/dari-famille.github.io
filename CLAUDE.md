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

- **Les totaux ne sont pas fiables, l'ordre l'est.** Le tableau a compté plus
  d'écoutes que d'arrivées, ce qui est impossible. On lit des classements, pas
  des valeurs absolues.
- **Ce que la mesure a établi :** les visiteurs écoutent puis repartent ;
  personne ne joue au quiz ; il n'y a pas de deuxièmes visites. La valeur perçue
  est un dictionnaire de prononciation, pas un cours.
- **Ne jamais ouvrir le site en ligne pour vérifier quelque chose** — chaque
  visite pollue une base de quelques dizaines. Utiliser `standalone.html` en
  local, ou une copie servie localement dont la balise a été retirée.
  `relecture.html` et `enregistrement.html` ne portent pas la balise.

## Discrétion

Le projet est public sous le nom Dari ; les personnes derrière ne le sont pas.
Aucun nom réel, aucune adresse personnelle, aucun lien vers un compte privé,
dans le dépôt comme dans l'app.
