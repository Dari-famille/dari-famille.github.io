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
  memory: {
    cards: [],
    flipped: [],
    matched: [],
    busy: false,
  },
};

const scoreKey = "darija-app-score";
const score = JSON.parse(
  localStorage.getItem(scoreKey) || '{"correct":0,"total":0}'
);

function saveScore() {
  localStorage.setItem(scoreKey, JSON.stringify(score));
  document.getElementById("score").textContent = score.correct;
  document.getElementById("score-total").textContent = score.total;
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

  if (item && audioIndex) {
    const cle = cleAudio(item);
    const ext = audioIndex[cle];
    if (ext) {
      if (lecteur) lecteur.pause();
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

// ---- Navigation par mode ----
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.mode;
    saveMode(state.mode);
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
    renderCategoryNav();
    renderContent();
  });
});

// Les situations ne sont pas une catégorie de vocabulaire : elles occupent
// un identifiant réservé dans la même barre de navigation, parce que c'est
// bien le même choix pour l'utilisateur — « qu'est-ce que je travaille ? ».
const SITUATIONS_ID = "__situations__";

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

  if (currentSituations().length > 0) {
    const sitBtn = document.createElement("button");
    sitBtn.className =
      "category-btn situations-btn" +
      (state.categoryId === SITUATIONS_ID ? " active" : "");
    sitBtn.textContent = "💬 Situations";
    sitBtn.addEventListener("click", () => {
      state.categoryId = SITUATIONS_ID;
      state.situationId = null;
      renderCategoryNav();
      renderContent();
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
      renderCategoryNav();
      renderContent();
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

  // Les situations ont leur propre mise en page : ni cartes, ni quiz, ni
  // barre de progression — on sort avant de construire tout ça.
  if (state.categoryId === SITUATIONS_ID) {
    renderSituations(content);
    return;
  }

  const toggle = document.createElement("div");
  toggle.className = "section-toggle";
  const listLabel = state.mode === "kid" ? "🖼️ Cartes" : "📋 Liste";
  const listSection = state.mode === "kid" ? "cards" : "list";
  const listBtn = makeToggleBtn(listLabel, state.section === listSection, () => {
    state.section = listSection;
    renderContent();
  });
  const quizBtn = makeToggleBtn("🎯 Quiz", state.section === "quiz", () => {
    clearTimeout(state.quiz.autoNext);
    state.section = "quiz";
    state.quiz.answered = false;
    renderContent();
  });
  const memoryBtn = makeToggleBtn("🧠 Mémoire", state.section === "memory", () => {
    clearTimeout(state.quiz.autoNext);
    state.section = "memory";
    buildMemoryDeck();
    renderContent();
  });
  const builderBtn = makeToggleBtn("🧩 Phrase", state.section === "builder", () => {
    state.section = "builder";
    renderContent();
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
  content.appendChild(toggle);

  renderProgress(content);
  renderFeedbackPrompt(content);

  if (state.section === "quiz") {
    renderQuiz(content);
  } else if (state.section === "memory") {
    renderMemory(content);
  } else if (state.section === "builder") {
    renderBuilder(content);
  } else if (state.mode === "kid") {
    renderKidCards(content);
  } else {
    renderAdultList(content);
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
  cat.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "vocab-card";
    card.innerHTML = `
      <div class="fr">${item.fr}</div>
      <div class="latin">${item.latin}</div>
      <div class="arabic">${item.arabic}</div>
      <button class="speak-btn">🔊 Écouter</button>
    `;
    card.querySelector(".speak-btn").addEventListener("click", () =>
      speak(item)
    );
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

// ---- Quiz ----
function pickNewQuestion() {
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
      optionsDiv.insertAdjacentElement("afterend", reveal);

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
        renderContent();
        window.scrollTo({ top: 0, behavior: "smooth" });
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
    renderContent();
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
const FEEDBACK_SEUIL = 12; // réponses de quiz avant de se manifester

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

function peutDemanderFeedback() {
  return !feedbackDejaVu() && score.total >= FEEDBACK_SEUIL;
}

function renderFeedbackPrompt(content) {
  if (!peutDemanderFeedback()) return;

  const box = document.createElement("div");
  box.className = "feedback-box";
  box.innerHTML = `
    <p class="feedback-q">Un mot vous manque&nbsp;?</p>
    <p class="feedback-sub">Dites-nous lequel — on l'ajoute. C'est comme ça que
    Dari s'est construite jusqu'ici.</p>
  `;

  const actions = document.createElement("div");
  actions.className = "feedback-actions";

  const write = document.createElement("a");
  write.className = "feedback-write";
  // Le sujet pré-rempli permet de retrouver ces messages d'un coup d'œil, et
  // le corps amorce la réponse : une page blanche fait abandonner.
  write.href =
    "mailto:dari.famille@proton.me" +
    "?subject=" + encodeURIComponent("Dari — il me manque un mot") +
    "&body=" + encodeURIComponent(
      "Le mot ou la phrase qui me manque :\n\n\n" +
      "La situation où j'en aurais besoin :\n\n"
    );
  write.textContent = "✉️ Dire ce qui manque";
  write.addEventListener("click", () => {
    classerFeedback();
    box.remove();
  });

  const later = document.createElement("button");
  later.className = "feedback-later";
  later.textContent = "Plus tard";
  later.addEventListener("click", () => {
    classerFeedback();
    box.remove();
  });

  actions.append(write, later);
  box.appendChild(actions);
  content.appendChild(box);
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
