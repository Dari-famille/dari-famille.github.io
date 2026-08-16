const MODE_KEY = "dari-mode-v1";

// Le mode choisi est un réglage durable, pas une préférence de session : un
// adulte qui revient le lendemain ne doit pas retomber sur l'interface enfant.
function savedMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === "adult" || m === "kid" ? m : "kid";
  } catch (e) {
    return "kid";
  }
}

function saveMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch (e) {
    /* sans stockage, le mode retombe sur enfant au rechargement */
  }
}

// État de l'application
const state = {
  mode: savedMode(), // "kid" | "adult"
  categoryId: CATEGORIES.find((c) => c.kidFriendly).id,
  // La section par défaut suit le mode. Le quiz est ce qui retient un
  // enfant — un enfant de huit ans testé sans consigne y est resté, là où
  // les cartes le laissaient indifférent — il ouvre donc le mode Enfant.
  section: savedMode() === "adult" ? "list" : "quiz",
  quiz: {
    question: null,
    options: [],
    answered: false,
    direction: "fr2ma", // "fr2ma" | "ma2fr" (adulte uniquement)
    // Bonnes réponses d'affilée. Un enfant ne lit pas un score cumulé en pied
    // de page ; une série qui monte, si.
    streak: 0,
    bestStreak: 0,
    autoNext: null, // minuterie d'enchaînement en mode Enfant
    mode: null, // mode dans lequel la question a été tirée
  },
  builder: {
    verbId: null,
    object: null,
  },
  situationId: null, // situation ouverte, null = liste des situations
  query: "", // recherche en cours
  memory: {
    cards: [],
    flipped: [],
    matched: [],
    busy: false,
  },
};

const scoreKey = "darija-app-score";

// Partout ailleurs le stockage est protégé, sauf ici — or l'accès à
// localStorage ne se contente pas de renvoyer null quand il est refusé
// (blocage total des cookies, navigation privée sur certains Safari, page
// servie dans un cadre cloisonné) : il LÈVE une exception. Sans ce filet,
// l'app ne démarrait pas du tout dans ces conditions — l'en-tête et le pied
// de page s'affichaient, étant du HTML statique, mais la barre de catégories
// et le contenu restaient vides. Symptôme trompeur : la page a l'air chargée.
const score = (() => {
  try {
    return JSON.parse(localStorage.getItem(scoreKey) || '{"correct":0,"total":0}');
  } catch (e) {
    return { correct: 0, total: 0 };
  }
})();

function saveScore() {
  try {
    localStorage.setItem(scoreKey, JSON.stringify(score));
  } catch (e) {
    /* sans stockage, le score ne survit pas à la session */
  }
  document.getElementById("score").textContent = score.correct;
  document.getElementById("score-total").textContent = score.total;
}

// ---- Mesure de l'usage ----
// La mesure d'audience ne compte que des pages vues et n'offre aucun événement
// personnalisé. Or l'app tient en une seule page : quelqu'un qui joue dix
// minutes et quelqu'un qui repart aussitôt y laissent exactement la même
// trace. On savait donc qui arrivait, jamais si l'app servait à quelque chose.
//
// Le mouchard suit en revanche les changements de route d'une application
// monopage, et il envoie la route PRÉCÉDENTE à chaque changement. On marque
// donc une étape en changeant l'adresse puis en la remettant aussitôt : le
// premier changement transmet « / », le second transmet l'étape.
//
// replaceState et non pushState : aucune entrée n'est ajoutée à l'historique,
// le bouton Retour reste donc intact — sur un téléphone, six retours morts
// pour quitter l'app seraient un prix bien trop élevé pour une statistique.
// La page 404.html couvre le cas où quelqu'un rechargerait pendant les
// quelques centaines de millisecondes où l'adresse porte le nom de l'étape.
//
// Aucune donnée personnelle n'est transmise : ce sont des adresses, comptées
// comme n'importe quelle page vue, sans identifiant ni cookie.
const URL_APP = location.pathname + location.search + location.hash;
const BASE_APP = location.pathname.replace(/[^/]*$/, "");
const jalonsVus = new Set();
const jalonsEnAttente = [];
let jalonEnCours = false;

function jalon(nom) {
  // Une étape ne vaut qu'une fois par session : ce qu'on veut compter, c'est
  // le nombre de visiteurs arrivés jusque-là, pas leur nombre de clics.
  if (jalonsVus.has(nom)) return;
  jalonsVus.add(nom);
  if (!window.history || !history.replaceState) return;
  jalonsEnAttente.push(nom);
  viderJalons();
}

function viderJalons() {
  // Rien ne doit bouger avant la fin du chargement. Le service worker et le
  // manifeste sont référencés par des chemins relatifs : les enregistrer alors
  // que l'adresse porte « etape/… » les ferait chercher un cran trop bas, en
  // 404. L'app perdrait le hors-ligne et l'installation — et d'abord chez ceux
  // qui la lancent depuis leur écran d'accueil, puisque ce jalon-là partirait
  // avant même l'événement load.
  if (document.readyState !== "complete") {
    window.addEventListener("load", viderJalons, { once: true });
    return;
  }
  // Deux étapes franchies coup sur coup se marcheraient dessus : on les passe
  // l'une après l'autre.
  if (jalonEnCours) return;
  const nom = jalonsEnAttente.shift();
  if (!nom) return;
  jalonEnCours = true;
  try {
    history.replaceState(null, "", BASE_APP + "etape/" + nom);
  } catch (e) {
    // L'API History est refusée dans certains cadres cloisonnés. La mesure
    // est optionnelle : on abandonne sans bruit.
    jalonEnCours = false;
    return;
  }
  setTimeout(() => {
    try {
      history.replaceState(null, "", URL_APP);
    } catch (e) {
      /* l'adresse reste sur l'étape : 404.html couvre le rechargement */
    }
    jalonEnCours = false;
    viderJalons();
  }, 400);
}

// Une app lancée depuis l'écran d'accueil a été installée : c'est le signal
// d'usage le plus fort qu'on puisse recevoir sans compte utilisateur.
if (isInstalled()) jalon("app-installee");

let reponsesSession = 0;
let ecoutesSession = 0;

function compterReponse() {
  reponsesSession++;
  if (reponsesSession === 1) jalon("1-reponse");
  if (reponsesSession === 5) jalon("5-reponses");
  if (reponsesSession === 20) jalon("20-reponses");
}

// ---- Prononciation ----
// La synthèse du navigateur ne parle que l'arabe standard : aucune voix
// marocaine n'existe, et une locutrice native confirme que le rendu n'est pas
// du darija. Un enfant apprend par imitation — lui faire entendre le mauvais
// accent est pire que rien. On sert donc en priorité les enregistrements
// réels, la synthèse ne servant plus que de dépannage là où il en manque.
const AUDIO_DIR = "audio/";
let audioIndex = null; // clés disponibles, chargées une fois

function cleAudio(item) {
  const raw = item.fr + "|" + item.latin;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
  return "k" + (h >>> 0).toString(36);
}

// L'index évite d'aller chercher un fichier inexistant à chaque mot, ce qui
// produirait une erreur réseau par clic et retarderait le repli.
fetch(AUDIO_DIR + "index.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => {
    audioIndex = d && d.clips ? d.clips : {};
  })
  .catch(() => {
    audioIndex = {};
  });

let lecteur = null;

function speak(cible) {
  // Accepte aussi bien une entrée complète qu'une chaîne arabe, pour les
  // phrases composées à la volée par le générateur.
  const item = typeof cible === "string" ? null : cible;
  const arabe = item ? item.arabic : cible;

  jalon("ecoute");
  ecoutesSession++;
  verifierDemandeApresEcoute();

  // On coupe systématiquement ce qui est en cours, dans les deux canaux : un
  // enregistrement et une synthèse pouvaient se chevaucher, chacun n'annulant
  // que le sien.
  if (lecteur) {
    lecteur.pause();
    lecteur = null;
  }
  if ("speechSynthesis" in window) speechSynthesis.cancel();

  if (item && audioIndex) {
    const cle = cleAudio(item);
    const ext = audioIndex[cle];
    if (ext) {
      lecteur = new Audio(AUDIO_DIR + cle + "." + ext);
      // Un fichier absent ou illisible ne doit pas laisser l'utilisateur sans
      // son : on repasse par la synthèse.
      lecteur.onerror = () => parler(arabe);
      lecteur.play().catch(() => parler(arabe));
      return;
    }
  }
  parler(arabe);
}

function parler(arabicText) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(arabicText);
  const voices = speechSynthesis.getVoices();
  const arabicVoice =
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("ar-ma")) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("ar"));
  if (arabicVoice) utter.voice = arabicVoice;
  utter.lang = arabicVoice ? arabicVoice.lang : "ar-SA";
  utter.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
  signalerVoixDeSynthese();
}

// La synthèse du téléphone lit en arabe standard, jamais en darija. Sans
// explication, l'utilisateur en conclut que l'app se trompe de langue — c'est
// la toute première remarque qu'on nous ait faite. On le dit donc au moment
// où il l'entend, et non dans un pied de page que personne ne déroule.
//
// Une seule fois, et seulement quand aucune voix marocaine n'a encore été
// enregistrée pour ce mot : à mesure que les enregistrements arrivent, speak()
// cesse de passer par ici et le message s'efface de lui-même.
const NOTE_VOIX_KEY = "dari-note-voix-v1";

function noteVoixDejaVue() {
  try {
    return localStorage.getItem(NOTE_VOIX_KEY) === "1";
  } catch (e) {
    // Navigation privée : la note réapparaîtra, ce qui vaut mieux que planter.
    return false;
  }
}

function signalerVoixDeSynthese() {
  // Sans voix arabe installée, rien n'est prononcé : annoncer un accent serait
  // absurde, un repli lisible est déjà affiché à la place.
  if (!voixArabeDisponible) return;
  if (noteVoixDejaVue() || document.querySelector(".voice-note")) return;
  // Deux bandeaux occupent déjà le bas de l'écran. Plutôt que de les
  // chevaucher, on attend la prochaine écoute — la note n'est pas urgente.
  if (document.querySelector(".install-bar, .update-bar")) return;

  try {
    localStorage.setItem(NOTE_VOIX_KEY, "1");
  } catch (e) {
    /* sans stockage, la note réapparaîtra : sans conséquence */
  }

  const note = document.createElement("div");
  note.className = "voice-note";
  note.setAttribute("role", "status");

  const texte = document.createElement("p");
  texte.innerHTML =
    "🎙️ Cette voix est celle de votre téléphone : elle lit en <strong>arabe " +
    "classique</strong>, pas en darija. Nous enregistrons en ce moment les " +
    "vraies voix marocaines, mot par mot — elles remplaceront celle-ci au fur " +
    "et à mesure.";
  note.appendChild(texte);

  const fermer = document.createElement("button");
  fermer.type = "button";
  fermer.textContent = "J'ai compris";
  fermer.addEventListener("click", () => note.remove());
  note.appendChild(fermer);

  document.body.appendChild(note);
  // Elle ne doit pas rester en travers de l'écran si personne n'y touche.
  setTimeout(() => {
    if (note.isConnected) note.remove();
  }, 14000);
}
// Sans voix arabe installée — courant sur Android et sur beaucoup de postes —
// « Écouter » ne produit rien et le quiz enfant, entièrement fondé sur
// l'écoute, devient insoluble. On le détecte pour basculer sur un repli lisible
// plutôt que de laisser l'enfant deviner sans explication.
let voixArabeDisponible = true;

function verifierVoix() {
  if (!("speechSynthesis" in window)) {
    voixArabeDisponible = false;
    return;
  }
  const voix = speechSynthesis.getVoices();
  // Tant que la liste est vide, le navigateur ne l'a pas encore chargée : on
  // ne conclut pas à l'absence, sous peine d'un faux négatif au démarrage.
  if (voix.length === 0) return;
  voixArabeDisponible = voix.some((v) => (v.lang || "").toLowerCase().startsWith("ar"));
}

verifierVoix();
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {
    const avant = voixArabeDisponible;
    verifierVoix();
    // Le rendu doit refléter la découverte tardive d'une voix, ou son absence.
    if (avant !== voixArabeDisponible) renderContent();
  };
}

function currentCategories() {
  return state.mode === "kid"
    ? CATEGORIES.filter((c) => c.kidFriendly)
    : CATEGORIES;
}

function getCategory() {
  return CATEGORIES.find((c) => c.id === state.categoryId);
}

// ---- Navigation ----
// Toute action qui change ce qui est affiché doit ramener la vue en haut.
// Sans cela, changer de catégorie après avoir fait défiler laissait
// l'utilisateur au milieu du vide : le nouveau contenu s'affichait bien, mais
// plus haut que son point de vue — l'action semblait sans effet. Le défilement
// est instantané et non animé : une transition douce donnerait l'impression
// que la page bouge toute seule.
function naviguerVers(action) {
  // Naviguer annule aussi l'enchaînement automatique du quiz : quitter l'écran
  // rend caduque la question suivante, et c'est le seul passage obligé de
  // toutes les navigations — donc le bon endroit pour ne rien oublier.
  if (state.quiz.autoNext) {
    clearTimeout(state.quiz.autoNext);
    state.quiz.autoNext = null;
  }
  action();
  window.scrollTo({ top: 0, behavior: "auto" });
}

// ---- Navigation par mode ----
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.mode;
    saveMode(state.mode);
    jalon("mode-" + state.mode);
    document
      .querySelectorAll(".mode-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    const cats = currentCategories();
    // On reste dans les situations en changeant de mode : elles existent dans
    // les deux, avec un contenu différent. Sortir de force serait déroutant.
    if (state.categoryId === SITUATIONS_ID) {
      state.situationId = null;
      if (currentSituations().length === 0) state.categoryId = cats[0].id;
    } else if (!cats.find((c) => c.id === state.categoryId)) {
      state.categoryId = cats[0].id;
    }
    state.section = state.mode === "kid" ? "quiz" : "list";
    naviguerVers(() => {
      renderCategoryNav();
      renderContent();
    });
  });
});

// Les situations ne sont pas une catégorie de vocabulaire : elles occupent
// un identifiant réservé dans la même barre de navigation, parce que c'est
// bien le même choix pour l'utilisateur — « qu'est-ce que je travaille ? ».
const SITUATIONS_ID = "__situations__";
const FAVORIS_ID = "__favoris__";

function currentSituations() {
  if (typeof SITUATIONS === "undefined") return [];
  return SITUATIONS.filter((s) =>
    state.mode === "kid"
      ? s.audience === "kid" || s.audience === "both"
      : s.audience === "adult" || s.audience === "both"
  );
}

function renderCategoryNav() {
  const nav = document.getElementById("category-nav");
  nav.innerHTML = "";

  // Les favoris n'apparaissent que s'il y en a : un onglet vide n'apprend
  // rien et occupe la place d'une catégorie utile.
  if (favoris.size > 0) {
    const favBtn = document.createElement("button");
    favBtn.className =
      "category-btn favoris-btn" + (state.categoryId === FAVORIS_ID ? " active" : "");
    favBtn.textContent = `★ Favoris (${favoris.size})`;
    favBtn.addEventListener("click", () => {
      state.categoryId = FAVORIS_ID;
      state.query = "";
      naviguerVers(() => {
        renderCategoryNav();
        renderContent();
      });
    });
    nav.appendChild(favBtn);
  }

  if (currentSituations().length > 0) {
    const sitBtn = document.createElement("button");
    sitBtn.className =
      "category-btn situations-btn" +
      (state.categoryId === SITUATIONS_ID ? " active" : "");
    sitBtn.textContent = "💬 Situations";
    sitBtn.addEventListener("click", () => {
      state.categoryId = SITUATIONS_ID;
      state.situationId = null;
      naviguerVers(() => {
        renderCategoryNav();
        renderContent();
      });
    });
    nav.appendChild(sitBtn);
  }

  currentCategories().forEach((cat) => {
    const btn = document.createElement("button");
    btn.className =
      "category-btn" + (cat.id === state.categoryId ? " active" : "");
    btn.textContent = `${cat.emoji} ${cat.label}`;
    btn.addEventListener("click", () => {
      state.categoryId = cat.id;
      state.section = state.mode === "kid" ? "quiz" : "list";
      naviguerVers(() => {
        renderCategoryNav();
        renderContent();
      });
    });
    nav.appendChild(btn);
  });
}

// ---- Rendu du contenu principal ----
function renderContent() {
  const content = document.getElementById("content");
  content.innerHTML = "";

  document.getElementById("category-nav").style.display =
    state.section === "builder" ? "none" : "";

  renderSearchBar(content);

  // Tout ce qui n'est pas la recherche vit dans ce conteneur, que la frappe
  // peut masquer d'un coup. Sans lui, les résultats s'ajoutaient sous la liste
  // existante et se retrouvaient hors écran : la recherche paraissait morte.
  const body = document.createElement("div");
  body.id = "main-body";
  content.appendChild(body);

  // Une recherche en cours l'emporte sur la catégorie choisie : c'est ce que
  // l'utilisateur vient de demander.
  if (state.query.trim().length >= 2) {
    body.style.display = "none";
    renderResults(content);
    return;
  }

  if (state.categoryId === FAVORIS_ID) {
    renderFavoris(body);
    return;
  }

  // Les situations ont leur propre mise en page : ni cartes, ni quiz, ni
  // barre de progression — on sort avant de construire tout ça.
  if (state.categoryId === SITUATIONS_ID) {
    renderSituations(body);
    return;
  }

  const toggle = document.createElement("div");
  toggle.className = "section-toggle";
  const listLabel = state.mode === "kid" ? "🖼️ Cartes" : "📋 Liste";
  const listSection = state.mode === "kid" ? "cards" : "list";
  const listBtn = makeToggleBtn(listLabel, state.section === listSection, () => {
    state.section = listSection;
    naviguerVers(renderContent);
  });
  const quizBtn = makeToggleBtn("🎯 Quiz", state.section === "quiz", () => {
    clearTimeout(state.quiz.autoNext);
    state.section = "quiz";
    state.quiz.answered = false;
    naviguerVers(renderContent);
  });
  const memoryBtn = makeToggleBtn("🧠 Mémoire", state.section === "memory", () => {
    clearTimeout(state.quiz.autoNext);
    state.section = "memory";
    buildMemoryDeck();
    naviguerVers(renderContent);
  });
  const builderBtn = makeToggleBtn("🧩 Phrase", state.section === "builder", () => {
    state.section = "builder";
    naviguerVers(renderContent);
  });
  if (state.mode === "kid") {
    // Le quiz est ce qui retient un enfant : il passe devant les cartes.
    toggle.appendChild(quizBtn);
    toggle.appendChild(listBtn);
  } else {
    toggle.appendChild(listBtn);
    toggle.appendChild(quizBtn);
  }
  toggle.appendChild(memoryBtn);
  // Le générateur de phrases demande de lire des mots et de composer : hors
  // de portée à quatre ans, et un onglet qu'on ouvre sans rien y comprendre
  // décourage plus qu'il n'apprend.
  if (state.mode !== "kid") toggle.appendChild(builderBtn);
  body.appendChild(toggle);

  renderProgress(body);
  renderFeedbackPrompt(body);

  if (state.section === "quiz") {
    renderQuiz(body);
  } else if (state.section === "memory") {
    renderMemory(body);
  } else if (state.section === "builder") {
    renderBuilder(body);
  } else if (state.mode === "kid") {
    renderKidCards(body);
  } else {
    renderAdultList(body);
  }
}

// Barre de progression de la catégorie courante. Elle répond à la question
// « où j'en suis ? », que le score cumulé ne disait pas : un score de 40/60 ne
// dit pas quels mots sont acquis ni ce qu'il reste à revoir aujourd'hui.
function renderProgress(content) {
  if (typeof SRS === "undefined") return;
  const cat = getCategory();
  const s = SRS.stats(cat.items);
  const streak = SRS.streak();
  const pctAcquired = s.total ? (s.acquired / s.total) * 100 : 0;
  // Les deux segments partent du bord gauche et se superposent : l'en-cours
  // est tracé jusqu'au cumul des deux, l'acquis vient le recouvrir à gauche.
  // Seule la portion entre les deux largeurs reste visible en safran.
  const pctLearning = pctAcquired + (s.total ? (s.learning / s.total) * 100 : 0);

  const box = document.createElement("div");
  box.className = "progress-box";

  const bar = document.createElement("div");
  bar.className = "progress-bar";
  bar.innerHTML = `
    <span class="progress-fill learning" style="width:${pctLearning}%"></span>
    <span class="progress-fill acquired" style="width:${pctAcquired}%"></span>
  `;
  box.appendChild(bar);

  const line = document.createElement("p");
  line.className = "progress-label";
  const kid = state.mode === "kid";
  const parts = [];
  if (kid) {
    parts.push(`⭐ ${s.acquired} mot${s.acquired > 1 ? "s" : ""} appris`);
    if (s.due > 0) parts.push(`${s.due} à revoir`);
  } else {
    parts.push(`${s.acquired} / ${s.total} acquis`);
    if (s.learning > 0) parts.push(`${s.learning} en cours`);
    parts.push(s.due > 0 ? `${s.due} à réviser` : "rien à réviser");
  }
  if (streak > 0) parts.push(`🔥 ${streak} jour${streak > 1 ? "s" : ""}`);
  line.textContent = parts.join(" · ");
  box.appendChild(line);

  content.appendChild(box);
}

function makeToggleBtn(label, active, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = active ? "active" : "";
  btn.addEventListener("click", onClick);
  return btn;
}

// ---- Mode enfant : grandes cartes ----
function renderKidCards(content) {
  const cat = getCategory();

  // La consigne était placée après la grille : sur un téléphone, il fallait
  // faire défiler toutes les cartes pour la découvrir — donc l'avoir déjà
  // comprise. Elle vient maintenant avant, là où on la lit.
  const note = document.createElement("p");
  note.className = "note kid-hint";
  note.textContent = "👉 Touche une carte pour entendre le mot !";
  content.appendChild(note);

  const grid = document.createElement("div");
  grid.className = "kid-grid";
  cat.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "kid-card";
    card.innerHTML = `
      <div class="kid-emoji">${item.emoji}</div>
      <div class="kid-latin">${item.latin}</div>
      <div class="kid-fr">${item.fr}</div>
    `;
    card.addEventListener("click", () => speak(item));
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

// ---- Mode adulte : liste complète ----
function renderAdultList(content) {
  const cat = getCategory();
  const grid = document.createElement("div");
  grid.className = "card-grid";
  // Même carte que la recherche et les favoris : une seule mise en forme à
  // maintenir, et le bouton favori disponible partout.
  cat.items.forEach((item) => grid.appendChild(carteEntree(item)));
  content.appendChild(grid);
}

// ---- Quiz ----
function pickNewQuestion() {
  // Une nouvelle question rend caduc tout enchaînement automatique en attente.
  // Sans cette annulation, toucher « Suivant » avant la fin du délai faisait
  // tirer deux questions coup sur coup : deux mots prononcés à la suite et
  // l'écran qui saute. On l'annule ici plutôt qu'à chaque appel, pour ne plus
  // avoir à y penser — il y en avait cinq, dont quatre non protégés.
  if (state.quiz.autoNext) {
    clearTimeout(state.quiz.autoNext);
    state.quiz.autoNext = null;
  }

  const cat = getCategory();
  const items = cat.items;
  // La révision espacée choisit le mot : ce qui est dû d'abord, puis ce qui
  // n'a jamais été vu. Repli sur un tirage au hasard si le module manque.
  const correct =
    (typeof SRS !== "undefined" && SRS.pick(items)) ||
    items[Math.floor(Math.random() * items.length)];

  // options fausses : d'abord depuis la même catégorie, sinon toutes catégories du mode courant
  let pool = items.filter((i) => i !== correct);
  if (pool.length < 2) {
    const allItems = currentCategories().flatMap((c) => c.items);
    pool = allItems.filter((i) => i.latin !== correct.latin);
  }

  let wrongs;
  if (state.mode === "kid") {
    // Le quiz enfant se joue uniquement sur l'image : deux propositions
    // partageant le même emoji rendent la question insoluble, l'enfant voyant
    // deux fois la même chose. On impose donc des emojis tous distincts, en
    // élargissant à toutes les catégories si la catégorie courante n'offre pas
    // assez de variété — c'était le cas des nombres, tous marqués 🔢.
    const vus = new Set([correct.emoji]);
    const distincts = (liste) =>
      shuffle(liste).filter((i) => {
        if (vus.has(i.emoji)) return false;
        vus.add(i.emoji);
        return true;
      });
    wrongs = distincts(pool).slice(0, 2);
    if (wrongs.length < 2) {
      const ailleurs = currentCategories()
        .flatMap((c) => c.items)
        .filter((i) => i !== correct && !items.includes(i));
      wrongs = wrongs.concat(distincts(ailleurs).slice(0, 2 - wrongs.length));
    }
  } else {
    wrongs = shuffle(pool).slice(0, 2);
  }
  const options = shuffle([correct, ...wrongs]);

  state.quiz.question = correct;
  state.quiz.options = options;
  state.quiz.answered = false;
  state.quiz.mode = state.mode;

  if (state.mode === "kid" || (state.mode === "adult" && state.quiz.direction === "ma2fr")) {
    speak(correct);
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuiz(content) {
  // On retire une nouvelle question dès que la question affichée n'est plus
  // valable : catégorie changée, mode changé (les deux modes ne posent pas la
  // même question), ou question déjà répondue. Sans ce dernier cas, revenir au
  // quiz après un aller-retour entre modes laissait l'écran figé sur une
  // question résolue, dont les tuiles ne réagissaient plus — un enfant tape et
  // rien ne se passe, sans aucun moyen de s'en sortir.
  if (
    !state.quiz.question ||
    state.categoryId !== state.quiz.catId ||
    state.mode !== state.quiz.mode ||
    state.quiz.answered
  ) {
    state.quiz.catId = state.categoryId;
    state.quiz.mode = state.mode;
    pickNewQuestion();
  }

  const box = document.createElement("div");
  box.className = "quiz-box";

  if (state.mode === "kid") {
    renderKidQuizBody(box);
  } else {
    renderAdultQuizBody(box);
  }

  content.appendChild(box);
}

// Enfant ne sachant pas encore lire : on fait écouter le mot, puis il
// pointe la bonne image parmi trois — aucun texte à déchiffrer.
function renderKidQuizBody(box) {
  const q = state.quiz.question;

  // La série se voit au-dessus de la question : c'est ce qui donne envie
  // d'enchaîner, et un enfant ne va pas la chercher en pied de page.
  if (state.quiz.streak > 0) {
    const streakEl = document.createElement("div");
    streakEl.className = "kid-streak";
    streakEl.textContent =
      state.quiz.streak >= 5
        ? `🔥 ${state.quiz.streak} d'affilée ! Bravo !`
        : `${"⭐".repeat(state.quiz.streak)} ${state.quiz.streak} d'affilée`;
    box.appendChild(streakEl);
  }

  const prompt = document.createElement("div");
  prompt.className = "quiz-prompt";
  if (voixArabeDisponible) {
    prompt.innerHTML = `<span class="quiz-emoji">🔊</span>Écoute et trouve l'image !`;
  } else {
    // Sans son, la question devient un tirage au sort. On montre le mot :
    // l'adulte présent le lit à voix haute, et l'exercice garde son sens.
    prompt.innerHTML =
      `<span class="quiz-emoji">👀</span>` +
      `<span class="quiz-mot">${q.latin}</span>` +
      `<span class="quiz-aide">Lisez le mot à voix haute, ` +
      `puis laissez l'enfant trouver l'image.</span>`;
  }
  box.appendChild(prompt);

  if (voixArabeDisponible) {
    const replayBtn = document.createElement("button");
    replayBtn.className = "quiz-next";
    replayBtn.style.marginBottom = "18px";
    replayBtn.textContent = "🔊 Réécouter";
    replayBtn.addEventListener("click", () => speak(q));
    box.appendChild(replayBtn);
  }

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "kid-quiz-grid";
  state.quiz.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "kid-quiz-tile";
    // L'image seule ne suffit pas : beaucoup de mots n'ont pas de
    // représentation visuelle — 👋 vaut aussi bien « bonjour » que « au revoir »
    // — et le mode s'adresse à des enfants de quatre à dix ans, dont la
    // plupart lisent. L'emoji porte le sens pour les petits, le mot pour les
    // autres, et les deux ensemble lèvent l'ambiguïté qui rendait certaines
    // catégories injouables.
    btn.innerHTML =
      `<span class="kid-quiz-emoji">${opt.emoji}</span>` +
      `<span class="kid-quiz-mot">${opt.fr}</span>`;
    btn.setAttribute("aria-label", opt.fr);
    btn.addEventListener("click", () => {
      if (state.quiz.answered) return;
      state.quiz.answered = true;
      score.total++;
      const isCorrect = opt === q;
      if (isCorrect) score.correct++;
      // Une erreur remet la série à zéro : sans cela le compteur ne veut plus
      // rien dire, et l'enfant s'en aperçoit tout de suite.
      state.quiz.streak = isCorrect ? state.quiz.streak + 1 : 0;
      state.quiz.bestStreak = Math.max(state.quiz.bestStreak, state.quiz.streak);
      saveScore();
      compterReponse();
      if (typeof SRS !== "undefined") SRS.review(q, isCorrect);
      document.querySelectorAll(".kid-quiz-tile").forEach((b2, i) => {
        const optData = state.quiz.options[i];
        if (optData === q) {
          b2.classList.add("correct");
          b2.insertAdjacentHTML("beforeend", '<span class="kid-quiz-mark">✅</span>');
        } else if (b2 === btn) {
          b2.classList.add("wrong");
          b2.insertAdjacentHTML("beforeend", '<span class="kid-quiz-mark">❌</span>');
        }
      });
      speak(q);

      // L'app ne s'utilise jamais seul à quatre ans : il y a un adulte à côté,
      // qui jusqu'ici n'avait aucun moyen de savoir ce qui venait d'être
      // demandé — donc ni d'aider, ni de répéter. Le mot s'affiche après la
      // réponse : trop tôt, un enfant qui lit contournerait l'écoute.
      const reveal = document.createElement("div");
      reveal.className = "quiz-reveal";
      reveal.innerHTML = `
        <span class="reveal-emoji">${q.emoji}</span>
        <span class="reveal-latin">${q.latin}</span>
        <span class="reveal-fr">${q.fr}</span>
      `;
      const replay = document.createElement("button");
      replay.className = "reveal-replay";
      replay.textContent = "🔊";
      replay.setAttribute("aria-label", "Réécouter le mot");
      replay.addEventListener("click", (ev) => {
        ev.stopPropagation();
        clearTimeout(state.quiz.autoNext); // on laisse le temps de répéter
        speak(q);
      });
      reveal.appendChild(replay);
      // La révélation prend la place de la consigne plutôt que de s'ajouter
      // sous les propositions, où elle tombait hors écran sur un téléphone.
      // Une fois la réponse donnée, « écoute et trouve l'image » n'a plus
      // d'objet : la question laisse place à la réponse, sans rien déplacer.
      prompt.replaceChildren(reveal);

      nextBtn.style.display = "inline-block";
      // Le bouton « Suivant » tombait sous la ligne de flottaison : un enfant
      // de quatre ans ne fait pas défiler pour trouver un bouton, il s'arrête.
      // On enchaîne donc tout seul, après le temps de voir la coche et
      // d'entendre le mot. L'erreur laisse un instant de plus pour regarder
      // la bonne réponse. Le bouton reste là pour qui veut aller plus vite.
      clearTimeout(state.quiz.autoNext);
      state.quiz.autoNext = setTimeout(() => {
        if (state.section !== "quiz" || state.mode !== "kid") return;
        pickNewQuestion();
        renderContent();
      }, isCorrect ? 2600 : 3600);
    });
    optionsDiv.appendChild(btn);
  });
  box.appendChild(optionsDiv);

  const nextBtn = document.createElement("button");
  nextBtn.className = "quiz-next";
  nextBtn.textContent = "Suivant ➡️";
  nextBtn.style.display = "none";
  nextBtn.addEventListener("click", () => {
    pickNewQuestion();
    renderContent();
  });
  box.appendChild(nextBtn);
}

// Adulte : deux sens possibles — traduire vers le darija, ou comprendre le
// darija à l'oral (utile pour suivre une conversation sur place).
function renderAdultQuizBody(box) {
  const q = state.quiz.question;
  const dir = state.quiz.direction;

  const dirToggle = document.createElement("div");
  dirToggle.className = "section-toggle";
  dirToggle.style.marginBottom = "16px";
  const fr2maBtn = makeToggleBtn("🇫🇷 → 🇲🇦", dir === "fr2ma", () => {
    state.quiz.direction = "fr2ma";
    pickNewQuestion();
    renderContent();
  });
  const ma2frBtn = makeToggleBtn("🇲🇦 → 🇫🇷 (écoute)", dir === "ma2fr", () => {
    state.quiz.direction = "ma2fr";
    pickNewQuestion();
    renderContent();
  });
  dirToggle.appendChild(fr2maBtn);
  dirToggle.appendChild(ma2frBtn);
  box.appendChild(dirToggle);

  const prompt = document.createElement("div");
  prompt.className = "quiz-prompt";
  if (dir === "fr2ma") {
    prompt.innerHTML = `Comment dit-on "<strong>${q.fr}</strong>" en Darija ?`;
  } else {
    prompt.innerHTML = `<div class="arabic" style="font-size:2rem; margin-bottom:6px;">${q.arabic}</div><div style="font-size:1.1rem; color:var(--muted);">${q.latin}</div>`;
  }
  box.appendChild(prompt);

  if (dir === "ma2fr") {
    const replayBtn = document.createElement("button");
    replayBtn.className = "quiz-next";
    replayBtn.style.marginBottom = "18px";
    replayBtn.textContent = "🔊 Réécouter";
    replayBtn.addEventListener("click", () => speak(q));
    box.appendChild(replayBtn);
  }

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "quiz-options";
  state.quiz.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = dir === "fr2ma" ? opt.latin : opt.fr;
    btn.addEventListener("click", () => {
      if (state.quiz.answered) return;
      state.quiz.answered = true;
      score.total++;
      const isCorrect = opt === q;
      if (isCorrect) score.correct++;
      saveScore();
      compterReponse();
      if (typeof SRS !== "undefined") SRS.review(q, isCorrect);
      if (dir === "fr2ma") speak(q);
      document.querySelectorAll(".quiz-option").forEach((b2, i) => {
        const optData = state.quiz.options[i];
        if (optData === q) b2.classList.add("correct");
        else if (b2 === btn) b2.classList.add("wrong");
      });
      nextBtn.style.display = "inline-block";
      nextBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    optionsDiv.appendChild(btn);
  });
  box.appendChild(optionsDiv);

  const nextBtn = document.createElement("button");
  nextBtn.className = "quiz-next";
  nextBtn.textContent = "Suivant ➡️";
  nextBtn.style.display = "none";
  nextBtn.addEventListener("click", () => {
    pickNewQuestion();
    renderContent();
  });
  box.appendChild(nextBtn);
}

// ---- Situations ----
// Deux écrans : la liste des scènes, puis le détail d'une scène. Le détail se
// lit comme une antisèche qu'on ouvre juste avant d'entrer dans la pièce.
// Les libellés de base s'adressent au parent (« mon enfant a besoin de… ») :
// affichés tels quels en mode Enfant, ils parlent de l'enfant au lieu de lui
// parler. Les scènes destinées aux deux publics portent donc leur propre
// formulation côté enfant.
function situationLabel(sit) {
  return state.mode === "kid" && sit.kidLabel ? sit.kidLabel : sit.label;
}

function situationIntro(sit) {
  return state.mode === "kid" && sit.kidIntro ? sit.kidIntro : sit.intro;
}

function renderSituations(content) {
  const sits = currentSituations();
  const current = sits.find((s) => s.id === state.situationId);

  if (!current) {
    const intro = document.createElement("p");
    intro.className = "note";
    intro.style.marginTop = "0";
    intro.textContent =
      state.mode === "kid"
        ? "Choisis un moment : les phrases pour t'en sortir tout seul."
        : "Les phrases et les usages qui comptent dans un moment précis.";
    content.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "situation-grid";
    sits.forEach((sit) => {
      const card = document.createElement("button");
      card.className = "situation-card";
      card.innerHTML = `
        <span class="situation-emoji">${sit.emoji}</span>
        <span class="situation-label">${situationLabel(sit)}</span>
        <span class="situation-count">${sit.lines.length} phrases</span>
      `;
      card.addEventListener("click", () => {
        state.situationId = sit.id;
        jalon("situation-ouverte");
        naviguerVers(renderContent);
      });
      grid.appendChild(card);
    });
    content.appendChild(grid);
    return;
  }

  const back = document.createElement("button");
  back.className = "situation-back";
  back.textContent = "← Toutes les situations";
  back.addEventListener("click", () => {
    state.situationId = null;
    naviguerVers(renderContent);
  });
  content.appendChild(back);

  const head = document.createElement("div");
  head.className = "situation-head";
  head.innerHTML = `
    <h2>${current.emoji} ${situationLabel(current)}</h2>
    ${situationIntro(current) ? `<p>${situationIntro(current)}</p>` : ""}
  `;
  content.appendChild(head);

  const list = document.createElement("div");
  list.className = "situation-lines";
  current.lines.forEach((line) => {
    // En mode enfant on ne montre que les phrases qu'un enfant peut dire.
    if (state.mode === "kid" && !line.kid) return;

    const card = document.createElement("div");
    card.className = "line-card";
    card.innerHTML = `
      <div class="line-fr">${line.fr}</div>
      <div class="line-latin">${line.latin}</div>
      <div class="line-arabic arabic">${line.arabic}</div>
      ${line.from ? `<div class="line-from">↪ ${line.from}</div>` : ""}
      ${line.note ? `<p class="line-note">${line.note}</p>` : ""}
    `;
    const btn = document.createElement("button");
    btn.className = "speak-btn";
    btn.textContent = "🔊 Écouter";
    btn.addEventListener("click", () => speak(line));
    card.insertBefore(btn, card.querySelector(".line-note"));
    list.appendChild(card);
  });
  content.appendChild(list);
}

// ---- Jeu de mémoire (paires) ----
// Enfant : associer l'emoji d'un mot à sa carte "son" (🔊, joue l'audio au
// retournement) — aucune lecture nécessaire. Adulte : associer la
// transcription latine à l'écriture arabe, pour muscler la lecture.
function buildMemoryDeck() {
  const cat = getCategory();
  const kid = state.mode === "kid";
  // Six paires font douze cartes : bien au-delà de ce qu'un enfant de quatre
  // ans peut garder en tête. Il ne perd pas, il abandonne. Quatre paires se
  // terminent, et une partie qui se termine donne envie d'en refaire une.
  const pool = shuffle(cat.items).slice(0, kid ? 4 : 6);
  const cards = [];
  pool.forEach((item, i) => {
    // Adulte : on associe le sens français à la prononciation. La version
    // précédente demandait d'apparier la transcription à l'écriture arabe —
    // un exercice de lecture de l'alphabet arabe, que personne dans le public
    // visé n'a jamais appris, et qui n'a aucun rapport avec parler à sa
    // belle-famille.
    cards.push({ item, kind: kid ? "emoji" : "fr", pairId: i });
    cards.push({ item, kind: kid ? "audio" : "latin", pairId: i });
  });
  state.memory.cards = shuffle(cards);
  state.memory.flipped = [];
  state.memory.matched = [];
  state.memory.busy = false;
}

function renderMemory(content) {
  if (state.memory.cards.length === 0 || state.memory.catId !== state.categoryId) {
    state.memory.catId = state.categoryId;
    buildMemoryDeck();
  }

  const box = document.createElement("div");
  box.className = "quiz-box";
  box.style.maxWidth = "560px";

  const intro = document.createElement("p");
  intro.className = "note";
  intro.style.marginTop = "0";
  intro.textContent =
    state.mode === "kid"
      ? "Retourne deux cartes : trouve l'image qui va avec le son !"
      : "Retournez deux cartes : associez le sens français à sa prononciation.";
  box.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "memory-grid";
  state.memory.cards.forEach((card, idx) => {
    const tile = document.createElement("button");
    const isFlipped = state.memory.flipped.includes(idx);
    const isMatched = state.memory.matched.includes(idx);
    tile.className = "memory-tile" + (isMatched ? " matched" : "");
    if (isFlipped || isMatched) {
      if (card.kind === "emoji") tile.innerHTML = `<span class="memory-emoji">${card.item.emoji}</span>`;
      else if (card.kind === "audio") tile.innerHTML = `<span class="memory-emoji">🔊</span>`;
      else if (card.kind === "latin") tile.innerHTML = `<span class="memory-text memory-latin">${card.item.latin}</span>`;
      else tile.innerHTML = `<span class="memory-text memory-fr">${card.item.fr}</span>`;
    } else {
      tile.innerHTML = `<span class="memory-back">❓</span>`;
    }
    tile.disabled = isMatched;
    tile.addEventListener("click", () => onMemoryFlip(idx));
    grid.appendChild(tile);
  });
  box.appendChild(grid);

  if (state.memory.matched.length === state.memory.cards.length && state.memory.cards.length > 0) {
    const win = document.createElement("p");
    win.className = "note";
    win.textContent = "🎉 Bravo, toutes les paires sont trouvées !";
    box.appendChild(win);
  }

  const newGameBtn = document.createElement("button");
  newGameBtn.className = "quiz-next";
  newGameBtn.textContent = "🔄 Nouvelle partie";
  newGameBtn.addEventListener("click", () => {
    buildMemoryDeck();
    renderContent();
  });
  box.appendChild(newGameBtn);

  content.appendChild(box);
}

function onMemoryFlip(idx) {
  const m = state.memory;
  if (m.busy || m.flipped.includes(idx) || m.matched.includes(idx)) return;
  const card = m.cards[idx];
  // On fait entendre le mot dès qu'une carte le porte : c'est la
  // prononciation qu'on cherche à ancrer, pas l'orthographe latine.
  if (card.kind === "audio" || card.kind === "latin") speak(card.item);
  m.flipped.push(idx);
  renderContent();

  if (m.flipped.length === 2) {
    const [i1, i2] = m.flipped;
    const c1 = m.cards[i1];
    const c2 = m.cards[i2];
    const isMatch = c1.pairId === c2.pairId && c1.kind !== c2.kind;
    m.busy = true;
    setTimeout(() => {
      if (isMatch) {
        m.matched.push(i1, i2);
      }
      m.flipped = [];
      m.busy = false;
      renderContent();
    }, isMatch ? 500 : 900);
  }
}

// ---- Générateur de phrases (Je + verbe + complément) ----
function renderBuilder(content) {
  const box = document.createElement("div");
  box.className = "quiz-box";

  const intro = document.createElement("p");
  intro.className = "note";
  intro.style.marginTop = "0";
  intro.textContent = "Choisis un verbe, puis un mot, pour construire une petite phrase.";
  box.appendChild(intro);

  const verb = SENTENCE_BUILDER.verbs.find((v) => v.id === state.builder.verbId);

  const verbTitle = document.createElement("p");
  verbTitle.innerHTML = "<strong>1. Un verbe</strong>";
  box.appendChild(verbTitle);

  const verbRow = document.createElement("div");
  verbRow.className = "quiz-options";
  SENTENCE_BUILDER.verbs.forEach((v) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option" + (verb && verb.id === v.id ? " correct" : "");
    btn.textContent = `${v.emoji} ${v.fr}`;
    btn.addEventListener("click", () => {
      state.builder.verbId = v.id;
      state.builder.object = null;
      renderContent();
    });
    verbRow.appendChild(btn);
  });
  box.appendChild(verbRow);

  if (verb) {
    const objTitle = document.createElement("p");
    objTitle.innerHTML = "<strong>2. Un mot</strong>";
    box.appendChild(objTitle);

    const objects = getSentenceObjects(verb.tag);
    const objGrid = document.createElement("div");
    objGrid.className = "quiz-options";
    objects.forEach((obj) => {
      const btn = document.createElement("button");
      btn.className =
        "quiz-option" +
        (state.builder.object && state.builder.object.fr === obj.fr ? " correct" : "");
      btn.textContent = `${obj.emoji} ${obj.fr}`;
      btn.addEventListener("click", () => {
        state.builder.object = obj;
        speak(`${SENTENCE_BUILDER.subject.arabic} ${verb.arabic} ${obj.arabic}`);
        renderContent();
      });
      objGrid.appendChild(btn);
    });
    box.appendChild(objGrid);
  }

  if (verb && state.builder.object) {
    const obj = state.builder.object;
    const result = document.createElement("div");
    result.className = "vocab-card";
    result.style.marginTop = "20px";
    result.innerHTML = `
      <div class="fr">${SENTENCE_BUILDER.subject.fr} ${verb.fr} ${obj.fr}</div>
      <div class="latin">${SENTENCE_BUILDER.subject.latin} ${verb.latin} ${obj.latin}</div>
      <div class="arabic">${SENTENCE_BUILDER.subject.arabic} ${verb.arabic} ${obj.arabic}</div>
      <button class="speak-btn">🔊 Écouter</button>
    `;
    result
      .querySelector(".speak-btn")
      .addEventListener("click", () =>
        speak(`${SENTENCE_BUILDER.subject.arabic} ${verb.arabic} ${obj.arabic}`)
      );
    box.appendChild(result);
  }

  content.appendChild(box);
}

// ---- Premier accueil ----
// Sans cet écran, quelqu'un qui arrive d'un lien tombe sur une grille de
// cartes sans savoir ce qu'est l'app ni par où commencer, et repart. On lui
// pose la seule question qui change l'affichage — pour qui ? — puis on le
// dépose directement sur le contenu le plus utile.
const ONBOARD_KEY = "dari-onboard-v1";

function alreadyWelcomed() {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch (e) {
    // Navigation privée : on montre l'accueil à chaque fois plutôt que de
    // planter. Mieux vaut redemander que bloquer.
    return false;
  }
}

function markWelcomed() {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch (e) {
    /* sans stockage, l'accueil réapparaîtra : sans conséquence */
  }
}

function renderWelcome() {
  const overlay = document.createElement("div");
  overlay.className = "welcome";
  overlay.innerHTML = `
    <div class="welcome-box">
      <div class="welcome-star">🌙</div>
      <h2>Bienvenue dans Dari</h2>
      <p class="welcome-lead">
        Le darija (arabe marocain) pour que vos enfants puissent parler
        avec leurs grands-parents.
      </p>
      <p class="welcome-q">Vous l'utilisez pour qui&nbsp;?</p>
      <div class="welcome-choices">
        <button class="welcome-btn" data-mode="kid">
          <span class="welcome-emoji">🧒</span>
          <strong>Mon enfant</strong>
          <span class="welcome-sub">Images et sons, sans lecture</span>
        </button>
        <button class="welcome-btn" data-mode="adult">
          <span class="welcome-emoji">🧑</span>
          <strong>Moi</strong>
          <span class="welcome-sub">Situations réelles et usages</span>
        </button>
      </div>
      <button class="welcome-skip">Explorer par moi-même</button>
    </div>
  `;

  function close(mode) {
    markWelcomed();
    overlay.remove();
    if (!mode) return;
    state.mode = mode;
    saveMode(mode);
    jalon("accueil-" + mode);
    document.querySelectorAll(".mode-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    // On dépose l'utilisateur sur les situations : c'est là qu'est la valeur,
    // pas dans une liste de vocabulaire qu'il trouverait n'importe où.
    state.categoryId = SITUATIONS_ID;
    state.situationId = null;
    renderCategoryNav();
    renderContent();
  }

  overlay.querySelectorAll(".welcome-btn").forEach((btn) => {
    btn.addEventListener("click", () => close(btn.dataset.mode));
  });
  overlay.querySelector(".welcome-skip").addEventListener("click", () => close(null));

  document.body.appendChild(overlay);
}

// ---- Demande de retour, au bon moment ----
// Le lien du pied de page est passif : on n'écrit pas spontanément à un pied
// de page. La question se pose après un usage réel, une seule fois, et porte
// sur ce qui manque — pas sur « aimez-vous l'app ? », à quoi tout le monde
// répond oui sans rien apprendre à personne.
const FEEDBACK_KEY = "dari-feedback-v1";

// Le seuil était de 12 réponses de quiz. La mesure d'usage a montré que
// personne ne répond à une seule question : la demande de retour n'a donc
// jamais été affichée à qui que ce soit. Elle est désormais branchée sur le
// seul geste que les visiteurs font réellement, l'écoute.
const FEEDBACK_SEUIL = 3; // écoutes avant de se manifester

// Deux canaux, et pas un seul. Le courriel demande d'ouvrir une application
// de mail et de livrer son adresse — la plupart des gens abandonnent là. Or
// ces visiteurs arrivent d'Instagram, où ils sont déjà connectés : un message
// privé leur coûte un geste au lieu de six. Instagram est donc proposé en
// premier, le mail reste pour ceux qui préfèrent.
const INSTAGRAM_DM = "https://ig.me/m/darifamille";

function lienMail(sujet, corps) {
  // Sujet pré-rempli pour retrouver ces messages d'un coup d'œil, corps amorcé
  // parce qu'une page blanche fait renoncer.
  return (
    "mailto:dari.famille@proton.me?subject=" +
    encodeURIComponent(sujet) +
    "&body=" +
    encodeURIComponent(corps)
  );
}

function feedbackDejaVu() {
  try {
    return localStorage.getItem(FEEDBACK_KEY) === "1";
  } catch (e) {
    return true; // sans stockage, on ne redemande pas à chaque écran
  }
}

function classerFeedback() {
  try {
    localStorage.setItem(FEEDBACK_KEY, "1");
  } catch (e) {
    /* sans stockage, la question pourrait revenir : sans gravité */
  }
}

let feedbackReporte = false;

function peutDemanderFeedback() {
  if (state.mode === "kid") return false;
  return !feedbackDejaVu() && !feedbackReporte && ecoutesSession >= FEEDBACK_SEUIL;
}

// Fabrique le bloc de demande. `mot` est renseigné quand on sait déjà ce que
// la personne cherchait : la question devient alors précise, et une question
// précise obtient une réponse là où « des retours ? » n'en obtient aucune.
function construireDemande(mot) {
  const box = document.createElement("div");
  box.className = "feedback-box";

  const q = document.createElement("p");
  q.className = "feedback-q";
  const sub = document.createElement("p");
  sub.className = "feedback-sub";

  if (mot) {
    q.textContent = "« " + mot + " » n'y est pas encore.";
    sub.textContent =
      "Dites-le-nous et on l'ajoute. C'est exactement comme ça que Dari s'est " +
      "construite jusqu'ici — mot par mot, sur demande.";
  } else {
    q.textContent = "Un mot vous manque ?";
    sub.textContent =
      "On est deux à faire cette app, et on lit tout. Dites-nous ce qui " +
      "manque, on l'ajoute.";
  }
  box.append(q, sub);

  const sujet = mot ? "Dari — il manque « " + mot + " »" : "Dari — il me manque un mot";
  const corps = mot
    ? "Le mot que je cherchais : " + mot + "\n\nLa situation où j'en aurais besoin :\n\n"
    : "Le mot ou la phrase qui me manque :\n\n\nLa situation où j'en aurais besoin :\n\n";

  const actions = document.createElement("div");
  actions.className = "feedback-actions";

  const insta = document.createElement("a");
  insta.className = "feedback-write";
  insta.href = INSTAGRAM_DM;
  insta.target = "_blank";
  insta.rel = "noopener";
  insta.textContent = "💬 Nous écrire sur Instagram";

  const mail = document.createElement("a");
  mail.className = "feedback-later";
  mail.href = lienMail(sujet, corps);
  mail.textContent = "✉️ Par mail";

  const later = document.createElement("button");
  later.className = "feedback-later";
  later.textContent = "Plus tard";

  [insta, mail].forEach((el) =>
    el.addEventListener("click", () => {
      classerFeedback();
      box.remove();
    })
  );

  later.addEventListener("click", () => {
    // Reporté, pas classé : on ne retient rien sur l'appareil, la demande
    // reviendra à la prochaine ouverture. Trois écoutes plus tard, et une
    // seule fois par session — ce n'est pas du harcèlement.
    feedbackReporte = true;
    box.remove();
  });

  actions.append(insta, mail, later);
  box.appendChild(actions);
  return box;
}

function renderFeedbackPrompt(content) {
  if (!peutDemanderFeedback()) return;
  content.appendChild(construireDemande(null));
}

// L'écoute ne redessine rien : sans ce déclenchement direct, la demande
// n'apparaîtrait qu'au prochain changement d'écran, c'est-à-dire souvent
// jamais.
function verifierDemandeApresEcoute() {
  if (!peutDemanderFeedback()) return;
  const zone = document.getElementById("content");
  if (!zone || zone.querySelector(".feedback-box")) return;
  zone.appendChild(construireDemande(null));
}

// ---- Rendu de la recherche et des favoris ----
function renderSearchBar(content) {
  // Le mode Enfant n'a pas de recherche : à quatre ans on ne tape pas, et le
  // champ ne ferait qu'encombrer un écran déjà chargé.
  if (state.mode === "kid") return;

  const wrap = document.createElement("div");
  wrap.className = "search-wrap";

  const input = document.createElement("input");
  input.type = "search";
  input.className = "search-input";
  input.placeholder = "Chercher un mot… (fièvre, merci, aji)";
  input.setAttribute("aria-label", "Chercher un mot ou une expression");
  input.value = state.query;

  // On ne redessine que la zone de résultats : recréer la barre à chaque
  // frappe ferait perdre le curseur au bout d'une lettre.
  input.addEventListener("input", () => {
    state.query = input.value;
    const zone = document.getElementById("search-results");
    if (zone) zone.remove();
    const reste = document.getElementById("main-body");
    if (reste) reste.style.display = state.query.trim().length >= 2 ? "none" : "";
    if (state.query.trim().length >= 2) {
      renderResults(content, true);
      // On remonte : après avoir fait défiler la liste, les résultats
      // s'afficheraient au-dessus du point de vue courant.
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });

  wrap.appendChild(input);
  content.appendChild(wrap);
}

function carteEntree(item, source) {
  const card = document.createElement("div");
  card.className = "vocab-card";
  card.innerHTML = `
    <div class="fr">${item.fr}</div>
    <div class="latin">${item.latin}</div>
    <div class="arabic">${item.arabic}</div>
    ${source ? `<div class="entry-source">${source}</div>` : ""}
  `;
  const actions = document.createElement("div");
  actions.className = "entry-actions";

  const speakBtn = document.createElement("button");
  speakBtn.className = "speak-btn";
  speakBtn.textContent = "🔊 Écouter";
  speakBtn.addEventListener("click", () => speak(item));

  actions.append(speakBtn, boutonFavori(item, () => {
    renderCategoryNav();
    if (state.categoryId === FAVORIS_ID) renderContent();
  }));
  card.appendChild(actions);
  return card;
}

function renderResults(content, seulementResultats) {
  const zone = document.createElement("div");
  zone.id = "search-results";

  const res = rechercher(state.query);
  const titre = document.createElement("p");
  titre.className = "note";
  titre.style.marginTop = "0";
  titre.textContent = res.length
    ? `${res.length} résultat${res.length > 1 ? "s" : ""} pour « ${state.query.trim()} »`
    : `Aucun résultat pour « ${state.query.trim()} ».`;
  zone.appendChild(titre);

  if (!res.length && !feedbackDejaVu()) {
    zone.appendChild(construireDemande(state.query.trim()));
  }

  const grid = document.createElement("div");
  grid.className = "card-grid";
  res.slice(0, 60).forEach(({ item, source }) => grid.appendChild(carteEntree(item, source)));
  zone.appendChild(grid);

  if (res.length > 60) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "Affinez votre recherche pour voir le reste.";
    zone.appendChild(p);
  }

  content.appendChild(zone);
  if (seulementResultats) return;
}

function renderFavoris(content) {
  const tous = toutesLesEntrees().filter(({ item }) => estFavori(item));

  if (tous.length === 0) {
    const vide = document.createElement("p");
    vide.className = "note";
    vide.textContent = "Aucun favori pour l'instant. Touchez ☆ sur un mot pour le garder ici.";
    content.appendChild(vide);
    return;
  }

  const titre = document.createElement("p");
  titre.className = "note";
  titre.style.marginTop = "0";
  titre.textContent = "Vos mots gardés sous la main.";
  content.appendChild(titre);

  const grid = document.createElement("div");
  grid.className = "card-grid";
  tous.forEach(({ item, source }) => grid.appendChild(carteEntree(item, source)));
  content.appendChild(grid);
}

// ---- Favoris ----
// Trois cent trente-huit entrées, et aucun moyen de retrouver les cinq qu'on
// utilise vraiment. Le favori règle ça sans rien demander à personne : il vit
// sur l'appareil, comme le reste de la progression.
const FAV_KEY = "dari-favoris-v1";

function chargerFavoris() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []);
  } catch (e) {
    return new Set();
  }
}

let favoris = chargerFavoris();

function estFavori(item) {
  return favoris.has(cleAudio(item));
}

function basculerFavori(item) {
  const cle = cleAudio(item);
  if (favoris.has(cle)) favoris.delete(cle);
  else favoris.add(cle);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favoris]));
  } catch (e) {
    /* sans stockage, les favoris ne survivent pas à la session */
  }
}

function boutonFavori(item, onChange) {
  const btn = document.createElement("button");
  btn.className = "fav-btn" + (estFavori(item) ? " on" : "");
  btn.textContent = estFavori(item) ? "★" : "☆";
  btn.setAttribute(
    "aria-label",
    estFavori(item) ? "Retirer des favoris" : "Ajouter aux favoris"
  );
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    basculerFavori(item);
    btn.className = "fav-btn" + (estFavori(item) ? " on" : "");
    btn.textContent = estFavori(item) ? "★" : "☆";
    if (onChange) onChange();
  });
  return btn;
}

// ---- Recherche ----
// Chercher « fièvre » obligeait à parcourir vingt-cinq catégories. La
// recherche balaie le vocabulaire et les situations d'un coup — c'est l'usage
// réel du quotidien, quand on cherche un mot précis juste avant d'en avoir
// besoin.
function normaliser(t) {
  // On ignore accents et casse : personne ne tape « métro » avec l'accent
  // quand il cherche vite, et le darija translittéré varie.
  return (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toutesLesEntrees() {
  const out = [];
  CATEGORIES.forEach((c) => {
    c.items.forEach((i) => out.push({ item: i, source: c.emoji + " " + c.label }));
  });
  if (typeof SITUATIONS !== "undefined") {
    SITUATIONS.forEach((sit) => {
      if (sit.refs) return; // le kit ne fait que pointer ailleurs
      sit.lines.forEach((l) =>
        out.push({ item: l, source: sit.emoji + " " + situationLabel(sit) })
      );
    });
  }
  return out;
}

function rechercher(q) {
  const n = normaliser(q);
  if (n.length < 2) return [];
  return toutesLesEntrees().filter(({ item }) => {
    return (
      normaliser(item.fr).includes(n) ||
      normaliser(item.latin).includes(n) ||
      (item.arabic || "").includes(q)
    );
  });
}

// ---- Arrivée depuis un lien ciblé ----
// Une vidéo parle d'une expression précise ; le visiteur qui clique atterrissait
// sur l'écran d'accueil générique et devait retrouver seul ce qu'il venait de
// voir. Un paramètre dans l'URL le dépose directement sur la bonne scène :
//   dari-famille.github.io/?s=compliment-enfant
function situationDemandee() {
  try {
    const id = new URLSearchParams(location.search).get("s");
    if (!id) return null;
    return SITUATIONS.find((x) => x.id === id) || null;
  } catch (e) {
    return null;
  }
}

// ---- Partage ----
// Le produit s'adresse à des familles : le conjoint, les grands-parents, la
// sœur qui vit la même chose. Sans bouton pour l'envoyer, la boucle la plus
// naturelle du produit n'existe pas. L'API de partage ouvre le sélecteur
// natif du téléphone ; ailleurs on copie le lien.
function partager() {
  const url = location.origin + location.pathname;
  const donnees = {
    title: "Dari — le darija en famille",
    text: "Pour que nos enfants parlent avec leurs grands-parents. Gratuit, et ça marche sans connexion.",
    url,
  };
  if (navigator.share) {
    navigator.share(donnees).catch(() => {});
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(
      () => alert("Lien copié : " + url),
      () => prompt("Copiez ce lien :", url)
    );
    return;
  }
  prompt("Copiez ce lien :", url);
}

function renderShareButton() {
  const footer = document.querySelector(".app-footer");
  if (!footer || document.querySelector(".share-btn")) return;
  const btn = document.createElement("button");
  btn.className = "share-btn";
  btn.innerHTML = "💌 Envoyer Dari à quelqu'un";
  btn.addEventListener("click", partager);
  footer.insertBefore(btn, footer.firstChild);
}

// ---- Démarrage ----
// Le bouton « Enfant » porte la classe active dans le HTML : sans cette
// synchronisation, un utilisateur revenant en mode adulte verrait l'interface
// adulte avec « Enfant » surligné.
document.querySelectorAll(".mode-btn").forEach((b) => {
  b.classList.toggle("active", b.dataset.mode === state.mode);
});

const cible = situationDemandee();
if (cible) {
  state.mode = cible.audience === "kid" ? "kid" : "adult";
  saveMode(state.mode);
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === state.mode);
  });
  state.categoryId = SITUATIONS_ID;
  state.situationId = cible.id;
  markWelcomed(); // il sait déjà ce qu'il vient chercher
}

renderCategoryNav();
renderContent();
renderShareButton();
saveScore();
if (!cible && !alreadyWelcomed()) renderWelcome();

// ---- Invitation à installer ----
// Sans collecte d'e-mail — impossible tant que le responsable de traitement
// n'est pas défini — l'installation sur l'écran d'accueil est le seul moyen
// de ne pas perdre un visiteur pour de bon. Elle ne demande aucune donnée.
const INSTALL_KEY = "dari-install-v1";

let deferredInstall = null;

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function installDismissed() {
  try {
    return localStorage.getItem(INSTALL_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function dismissInstall() {
  try {
    localStorage.setItem(INSTALL_KEY, "1");
  } catch (e) {
    /* sans stockage, l'invitation réapparaîtra */
  }
}

// Chrome émet cet événement quand l'app remplit les critères d'installation :
// on le retient pour déclencher la vraie fenêtre système au bon moment.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
});

function renderInstallBanner() {
  if (isInstalled() || installDismissed()) return;

  // iOS n'expose aucune API d'installation : Safari exige un passage par le
  // menu Partager, qu'il faut donc expliquer plutôt que déclencher.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!deferredInstall && !isIOS) return;

  const bar = document.createElement("div");
  bar.className = "install-bar";
  // Même emplacement à l'écran : on retire la note plutôt que de la recouvrir.
  const note = document.querySelector(".voice-note");
  if (note) note.remove();
  bar.innerHTML = `
    <span class="install-text">
      <strong>Gardez Dari sous la main</strong>
      ${isIOS
        ? "Partager <span aria-hidden=\"true\">→</span> « Sur l'écran d'accueil »"
        : "Installez l'app : elle marche sans connexion."}
    </span>
  `;

  const actions = document.createElement("div");
  actions.className = "install-actions";

  if (!isIOS) {
    const install = document.createElement("button");
    install.className = "install-btn";
    install.textContent = "Installer";
    install.addEventListener("click", async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      dismissInstall();
      bar.remove();
    });
    actions.appendChild(install);
  }

  const close = document.createElement("button");
  close.className = "install-close";
  close.setAttribute("aria-label", "Masquer");
  close.textContent = "✕";
  close.addEventListener("click", () => {
    dismissInstall();
    bar.remove();
  });
  actions.appendChild(close);

  bar.appendChild(actions);
  document.body.appendChild(bar);
}

// On laisse l'utilisateur découvrir l'app avant de lui proposer de l'installer :
// une invitation servie à la première seconde est refusée par réflexe.
setTimeout(renderInstallBanner, 45000);
