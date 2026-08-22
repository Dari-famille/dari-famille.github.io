// Service worker : l'app doit fonctionner entièrement hors-ligne (usage au
// Maroc, connexion peu fiable). Tout le contenu est statique, donc on met en
// cache la coquille complète à l'installation et on sert depuis le cache.
//
// IMPORTANT : incrémenter CACHE_VERSION à chaque modification de data.js,
// app.js ou style.css, sinon les visiteurs gardent l'ancienne version.
const CACHE_VERSION = "dari-v52";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./situations.js",
  "./srs.js",
  "./app.js",
  "./manifest.json",
  "./audio/index.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // addAll est tout-ou-rien : une seule 404 ferait échouer l'installation.
      // On tolère les manquants pour ne pas casser l'app entière.
      //
      // `cache: "reload"` force le passage par le réseau : sans lui, le cache
      // HTTP du navigateur peut renvoyer l'ancien fichier, et la nouvelle
      // version du service worker réinstallerait le contenu périmé.
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            cache
              .add(new Request(url, { cache: "reload" }))
              .catch(() => console.warn("SW: non mis en cache", url))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Requêtes de navigation : on tente le réseau d'abord pour récupérer une
  // version fraîche, avec repli sur le cache si hors-ligne.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  // Reste des ressources : cache d'abord (rapide et fiable hors-ligne),
  // réseau en repli, et on stocke ce qu'on récupère.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
