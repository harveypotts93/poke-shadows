const APP_CACHE_NAME = "poke-quiz-app-v4";
const ARTWORK_CACHE_NAME = "poke-quiz-artwork-v1";
const DATA_CACHE_NAME = "poke-quiz-data-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];
const API_ORIGIN = "https://pokeapi.co";
const ARTWORK_ORIGIN = "https://raw.githubusercontent.com";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("poke-quiz-app-v") && key !== APP_CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  if (cacheName === ARTWORK_CACHE_NAME) {
    const legacyCached = await caches.match(request);
    if (legacyCached) return legacyCached;
  }

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function navigationRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const appCache = await caches.open(APP_CACHE_NAME);
    const cachedPage = await appCache.match(request);
    if (cachedPage) return cachedPage;
    const appShell = await appCache.match("./index.html");
    if (appShell) return appShell;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === API_ORIGIN) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === ARTWORK_ORIGIN) {
    event.respondWith(cacheFirst(request, ARTWORK_CACHE_NAME));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(navigationRequest(request));
    return;
  }
  event.respondWith(cacheFirst(request, APP_CACHE_NAME));
});
