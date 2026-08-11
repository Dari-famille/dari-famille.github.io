// Révision espacée (système de Leitner).
//
// Sans ce module, le quiz tire au hasard : on repose sans cesse les mots déjà
// acquis et on laisse filer ceux qu'on rate. Ici chaque mot avance dans des
// « boîtes » : bonne réponse, il monte d'une boîte et revient plus tard ;
// mauvaise réponse, il redescend et revient vite.

const SRS = (() => {
  const STORE_KEY = "dari-srs-v1";
  const STREAK_KEY = "dari-streak-v1";
  const DAY = 24 * 60 * 60 * 1000;

  // Délai avant réapparition, par boîte. La boîte 0 est le mot jamais vu.
  // La dernière boîte vaut « acquis » : on le revoit rarement, sans l'oublier.
  const INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY, 90 * DAY];
  const MAX_BOX = INTERVALS.length - 1;
  const ACQUIRED_BOX = 4; // seuil à partir duquel on considère le mot su

  // ---- Identité d'un mot -------------------------------------------------
  // Les entrées de data.js n'ont pas d'identifiant. On en dérive un du contenu
  // plutôt que de la position, pour que réordonner ou insérer du vocabulaire
  // ne remette pas la progression à zéro. Corriger une entrée la réinitialise :
  // c'est le compromis accepté, et c'est même souhaitable si le sens change.
  function itemKey(item) {
    const raw = `${item.fr}|${item.latin}`;
    let h = 5381;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    }
    return "w" + (h >>> 0).toString(36);
  }

  // ---- Persistance -------------------------------------------------------
  let store = load();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      // Stockage corrompu ou désactivé : on repart d'une progression vide
      // plutôt que d'empêcher l'app de démarrer.
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {
      /* quota dépassé ou navigation privée : la session reste utilisable */
    }
  }

  function record(item) {
    const key = itemKey(item);
    if (!store[key]) {
      store[key] = { box: 0, due: 0, seen: 0, correct: 0, lapses: 0 };
    }
    return store[key];
  }

  // ---- Enregistrement d'une réponse --------------------------------------
  function review(item, isCorrect) {
    const rec = record(item);
    rec.seen++;
    if (isCorrect) {
      rec.correct++;
      rec.box = Math.min(rec.box + 1, MAX_BOX);
    } else {
      rec.lapses++;
      // On redescend en boîte 1, pas en 0 : le mot revient vite sans effacer
      // le fait qu'il a déjà été rencontré.
      rec.box = rec.box > 1 ? 1 : rec.box;
      if (rec.box === 0) rec.box = 1;
    }
    rec.due = Date.now() + INTERVALS[rec.box];
    save();
    touchStreak();
    return rec;
  }

  // ---- Choix du prochain mot ---------------------------------------------
  // Priorité : ce qui est dû, puis ce qui n'a jamais été vu, puis le reste
  // (le plus anciennement échéancé d'abord). Un peu d'aléatoire à l'intérieur
  // de chaque groupe évite de reposer les mots toujours dans le même ordre.
  function pick(items) {
    if (!items || items.length === 0) return null;
    const now = Date.now();
    const due = [];
    const fresh = [];
    const rest = [];

    items.forEach((item) => {
      const rec = store[itemKey(item)];
      if (!rec) fresh.push(item);
      else if (rec.due <= now) due.push(item);
      else rest.push(item);
    });

    if (due.length) return sample(due);
    if (fresh.length) return sample(fresh);
    rest.sort((a, b) => (store[itemKey(a)].due || 0) - (store[itemKey(b)].due || 0));
    // Parmi les non-dus, on pioche dans le tiers le plus proche de l'échéance.
    const window = rest.slice(0, Math.max(1, Math.ceil(rest.length / 3)));
    return sample(window);
  }

  function sample(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---- Statistiques pour l'affichage de progression ----------------------
  function stats(items) {
    const now = Date.now();
    let acquired = 0;
    let learning = 0;
    let dueNow = 0;
    items.forEach((item) => {
      const rec = store[itemKey(item)];
      if (!rec) return;
      if (rec.box >= ACQUIRED_BOX) acquired++;
      else if (rec.box > 0) learning++;
      if (rec.due <= now) dueNow++;
    });
    return {
      total: items.length,
      acquired,
      learning,
      untouched: items.length - acquired - learning,
      due: dueNow,
    };
  }

  function boxOf(item) {
    const rec = store[itemKey(item)];
    return rec ? rec.box : 0;
  }

  // ---- Série de jours consécutifs ----------------------------------------
  // Un compteur de jours d'affilée : la régularité est ce qui fait apprendre
  // une langue, plus que la durée d'une session.
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function loadStreak() {
    try {
      return JSON.parse(localStorage.getItem(STREAK_KEY)) || { days: 0, last: null };
    } catch (e) {
      return { days: 0, last: null };
    }
  }

  function touchStreak() {
    const s = loadStreak();
    const t = today();
    if (s.last === t) return s;
    const yesterday = new Date(Date.now() - DAY);
    const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
    s.days = s.last === yKey ? s.days + 1 : 1;
    s.last = t;
    try {
      localStorage.setItem(STREAK_KEY, JSON.stringify(s));
    } catch (e) {
      /* ignoré : la série est un bonus, pas une fonction critique */
    }
    return s;
  }

  function streak() {
    const s = loadStreak();
    // Une série interrompue depuis plus d'un jour est retombée à zéro.
    if (!s.last) return 0;
    const t = today();
    const yesterday = new Date(Date.now() - DAY);
    const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
    return s.last === t || s.last === yKey ? s.days : 0;
  }

  function reset() {
    store = {};
    save();
    try {
      localStorage.removeItem(STREAK_KEY);
    } catch (e) {
      /* rien à faire */
    }
  }

  return { itemKey, review, pick, stats, boxOf, streak, reset, ACQUIRED_BOX };
})();
