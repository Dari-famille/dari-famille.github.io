// État de l'application
const state = {
  mode: "kid", // "kid" | "adult"
  categoryId: CATEGORIES.find((c) => c.kidFriendly).id,
  section: "cards", // "cards"/"list" | "quiz" | "builder"
  quiz: {
    question: null,
    options: [],
    answered: false,
    direction: "fr2ma", // "fr2ma" | "ma2fr" (adulte uniquement)
  },
  builder: {
    verbId: null,
    object: null,
  },
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

// ---- Synthèse vocale ----
function speak(arabicText) {
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
// Certains navigateurs chargent les voix de façon asynchrone
if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {};
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
    document
      .querySelectorAll(".mode-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    const cats = currentCategories();
    if (!cats.find((c) => c.id === state.categoryId)) {
      state.categoryId = cats[0].id;
    }
    state.section = state.mode === "kid" ? "cards" : "list";
    renderCategoryNav();
    renderContent();
  });
});

function renderCategoryNav() {
  const nav = document.getElementById("category-nav");
  nav.innerHTML = "";
  currentCategories().forEach((cat) => {
    const btn = document.createElement("button");
    btn.className =
      "category-btn" + (cat.id === state.categoryId ? " active" : "");
    btn.textContent = `${cat.emoji} ${cat.label}`;
    btn.addEventListener("click", () => {
      state.categoryId = cat.id;
      state.section = state.mode === "kid" ? "cards" : "list";
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

  const toggle = document.createElement("div");
  toggle.className = "section-toggle";
  const listLabel = state.mode === "kid" ? "🖼️ Cartes" : "📋 Liste";
  const listSection = state.mode === "kid" ? "cards" : "list";
  const listBtn = makeToggleBtn(listLabel, state.section === listSection, () => {
    state.section = listSection;
    renderContent();
  });
  const quizBtn = makeToggleBtn("🎯 Quiz", state.section === "quiz", () => {
    state.section = "quiz";
    state.quiz.answered = false;
    renderContent();
  });
  const memoryBtn = makeToggleBtn("🧠 Mémoire", state.section === "memory", () => {
    state.section = "memory";
    buildMemoryDeck();
    renderContent();
  });
  const builderBtn = makeToggleBtn("🧩 Phrase", state.section === "builder", () => {
    state.section = "builder";
    renderContent();
  });
  toggle.appendChild(listBtn);
  toggle.appendChild(quizBtn);
  toggle.appendChild(memoryBtn);
  toggle.appendChild(builderBtn);
  content.appendChild(toggle);

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
    card.addEventListener("click", () => speak(item.arabic));
    grid.appendChild(card);
  });
  content.appendChild(grid);

  const note = document.createElement("p");
  note.className = "note";
  note.textContent = "👉 Touche une carte pour entendre le mot !";
  content.appendChild(note);
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
      speak(item.arabic)
    );
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

// ---- Quiz ----
function pickNewQuestion() {
  const cat = getCategory();
  const items = cat.items;
  const correct = items[Math.floor(Math.random() * items.length)];

  // options fausses : d'abord depuis la même catégorie, sinon toutes catégories du mode courant
  let pool = items.filter((i) => i !== correct);
  if (pool.length < 2) {
    const allItems = currentCategories().flatMap((c) => c.items);
    pool = allItems.filter((i) => i.latin !== correct.latin);
  }
  const wrongs = shuffle(pool).slice(0, 2);
  const options = shuffle([correct, ...wrongs]);

  state.quiz.question = correct;
  state.quiz.options = options;
  state.quiz.answered = false;

  if (state.mode === "kid" || (state.mode === "adult" && state.quiz.direction === "ma2fr")) {
    speak(correct.arabic);
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
  if (!state.quiz.question || state.categoryId !== state.quiz.catId) {
    state.quiz.catId = state.categoryId;
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

  const prompt = document.createElement("div");
  prompt.className = "quiz-prompt";
  prompt.innerHTML = `<span class="quiz-emoji">🔊</span>Écoute et trouve l'image !`;
  box.appendChild(prompt);

  const replayBtn = document.createElement("button");
  replayBtn.className = "quiz-next";
  replayBtn.style.marginBottom = "18px";
  replayBtn.textContent = "🔊 Réécouter";
  replayBtn.addEventListener("click", () => speak(q.arabic));
  box.appendChild(replayBtn);

  const optionsDiv = document.createElement("div");
  optionsDiv.className = "kid-quiz-grid";
  state.quiz.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "kid-quiz-tile";
    btn.innerHTML = `<span class="kid-quiz-emoji">${opt.emoji}</span>`;
    btn.addEventListener("click", () => {
      if (state.quiz.answered) return;
      state.quiz.answered = true;
      score.total++;
      const isCorrect = opt === q;
      if (isCorrect) score.correct++;
      saveScore();
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
      speak(q.arabic);
      nextBtn.style.display = "inline-block";
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
    replayBtn.addEventListener("click", () => speak(q.arabic));
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
      if (dir === "fr2ma") speak(q.arabic);
      document.querySelectorAll(".quiz-option").forEach((b2, i) => {
        const optData = state.quiz.options[i];
        if (optData === q) b2.classList.add("correct");
        else if (b2 === btn) b2.classList.add("wrong");
      });
      nextBtn.style.display = "inline-block";
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

// ---- Jeu de mémoire (paires) ----
// Enfant : associer l'emoji d'un mot à sa carte "son" (🔊, joue l'audio au
// retournement) — aucune lecture nécessaire. Adulte : associer la
// transcription latine à l'écriture arabe, pour muscler la lecture.
function buildMemoryDeck() {
  const cat = getCategory();
  const pool = shuffle(cat.items).slice(0, 6);
  const kid = state.mode === "kid";
  const cards = [];
  pool.forEach((item, i) => {
    cards.push({ item, kind: kid ? "emoji" : "latin", pairId: i });
    cards.push({ item, kind: kid ? "audio" : "arabic", pairId: i });
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
      : "Retourne deux cartes : associe la transcription à l'écriture arabe.";
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
      else if (card.kind === "latin") tile.innerHTML = `<span class="memory-text">${card.item.latin}</span>`;
      else tile.innerHTML = `<span class="memory-text arabic">${card.item.arabic}</span>`;
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
  if (card.kind === "audio") speak(card.item.arabic);
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

// ---- Démarrage ----
renderCategoryNav();
renderContent();
saveScore();
