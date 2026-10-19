const API_URL = "https://pokeapi.co/api/v2/pokemon-species?limit=1025";
const ARTWORK_ORIGIN = "https://raw.githubusercontent.com";
const ARTWORK_URL = `${ARTWORK_ORIGIN}/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork`;
const HARD_ARTWORK_URL = `${ARTWORK_ORIGIN}/PokeAPI/sprites/master/sprites/pokemon/other/home`;
const ARTWORK_CACHE_NAME = "poke-quiz-artwork-v1";
const GENERATIONS = [
  { id: 1, start: 1, end: 151 },
  { id: 2, start: 152, end: 251 },
  { id: 3, start: 252, end: 386 },
  { id: 4, start: 387, end: 493 },
  { id: 5, start: 494, end: 649 },
  { id: 6, start: 650, end: 721 },
  { id: 7, start: 722, end: 809 },
  { id: 8, start: 810, end: 905 },
  { id: 9, start: 906, end: 1025 }
];

const scoreElement = document.querySelector("#score");
const roundElement = document.querySelector("#round-label");
const promptElement = document.querySelector("#prompt-text");
const loadingElement = document.querySelector("#loading-state");
const mysteryImage = document.querySelector("#mystery-image");
const choicesElement = document.querySelector("#choices");
const feedbackElement = document.querySelector("#feedback");
const nextButton = document.querySelector("#next-button");
const roundControls = document.querySelector("#round-controls");
const errorElement = document.querySelector("#error-message");
const retryButton = document.querySelector("#retry-button");
const installButton = document.querySelector("#install-button");
const installHint = document.querySelector("#install-hint");
const setupScreen = document.querySelector("#setup-screen");
const quizScreen = document.querySelector("#quiz-screen");
const setupError = document.querySelector("#setup-error");
const pokemonCount = document.querySelector("#pokemon-count");
const startButton = document.querySelector("#start-button");
const downloadButton = document.querySelector("#download-offline-button");
const offlineProgress = document.querySelector("#offline-progress");
const progressLabel = document.querySelector("#progress-label");
const progressCount = document.querySelector("#progress-count");
const downloadProgress = document.querySelector("#download-progress");
const cancelDownloadButton = document.querySelector("#cancel-download");
const generationCheckboxes = [...document.querySelectorAll(".generation-checkbox")];

let catalog = [];
let pokemonList = [];
let questionOrder = [];
let questionIndex = 0;
let roundNumber = 0;
let score = 0;
let currentAnswer = null;
let answered = false;
let installPrompt = null;
let selectedMode = "normal";
let downloadController = null;

function isRunningAsApp() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function showInstallInstructions() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  installHint.textContent = isIOS
    ? "To install: tap Share, then Add to Home Screen."
    : "To install: open your browser menu and choose Install app or Add to Home screen.";
  installHint.classList.remove("is-hidden");
}

async function installApp() {
  if (!installPrompt) {
    showInstallInstructions();
    return;
  }

  await installPrompt.prompt();
  const choice = await installPrompt.userChoice;
  installPrompt = null;
  if (choice.outcome === "accepted") {
    installButton.classList.add("is-hidden");
    installHint.textContent = "PokéQuiz is installing.";
    installHint.classList.remove("is-hidden");
  }
}

function setupInstallPrompt() {
  if (isRunningAsApp()) {
    installButton.classList.add("is-hidden");
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.classList.add("is-hidden");
    installHint.textContent = "PokéQuiz is installed and ready to play.";
    installHint.classList.remove("is-hidden");
  });

  installButton.addEventListener("click", installApp);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
      });
    }
  } catch (error) {
    console.error("Unable to register the offline app worker.", error);
  }
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function imageUrl(pokemon, hardMode = false) {
  const artwork = hardMode ? HARD_ARTWORK_URL : ARTWORK_URL;
  return `${artwork}/${pokemon.id}.png`;
}

function formatName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function showSetupError(message) {
  setupError.textContent = message;
  setupError.classList.remove("is-hidden");
}

function clearSetupError() {
  setupError.textContent = "";
  setupError.classList.add("is-hidden");
}

function getSelectedGenerationIds() {
  return generationCheckboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => Number(checkbox.value));
}

function filterSelectedPokemon() {
  const selectedGenerations = new Set(getSelectedGenerationIds());
  return catalog.filter((pokemon) => selectedGenerations.has(pokemon.generation));
}

function updateSelectedCount() {
  const count = filterSelectedPokemon().length;
  pokemonCount.textContent = `${count.toLocaleString()} Pokémon selected`;
  startButton.disabled = catalog.length === 0 || count < 4;
  downloadButton.disabled = catalog.length === 0 || count < 4 || !navigator.onLine;
}

function saveSettings() {
  try {
    localStorage.setItem("poke-quiz-generations", JSON.stringify(getSelectedGenerationIds()));
    localStorage.setItem("poke-quiz-mode", document.querySelector('input[name="mode"]:checked').value);
  } catch (error) {
    console.error("Unable to save quiz settings.", error);
  }
}

function restoreSettings() {
  try {
    const savedGenerations = JSON.parse(localStorage.getItem("poke-quiz-generations"));
    if (Array.isArray(savedGenerations)) {
      for (const checkbox of generationCheckboxes) {
        checkbox.checked = savedGenerations.includes(Number(checkbox.value));
      }
    }

    const savedMode = localStorage.getItem("poke-quiz-mode");
    if (savedMode === "normal" || savedMode === "hard") {
      document.querySelector(`input[name="mode"][value="${savedMode}"]`).checked = true;
    }
  } catch (error) {
    console.error("Unable to restore quiz settings.", error);
  }
}

async function loadCatalog() {
  startButton.disabled = true;
  downloadButton.disabled = true;
  pokemonCount.textContent = "Loading Pokémon…";
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`PokéAPI responded with ${response.status}`);
    }

    const data = await response.json();
    catalog = data.results.map((pokemon) => {
      const id = Number(pokemon.url.match(/\/(\d+)\/?$/)?.[1]);
      const generation = GENERATIONS.find((entry) => id >= entry.start && id <= entry.end)?.id;
      return { id, name: pokemon.name, generation };
    }).filter((pokemon) => pokemon.generation);

    if (catalog.length < 4) {
      throw new Error(`PokéAPI returned only ${catalog.length} Pokémon`);
    }
    updateSelectedCount();
  } catch (error) {
    console.error("Unable to load the Pokémon catalog.", error);
    pokemonCount.textContent = "Pokémon data unavailable";
    showSetupError("Couldn't load the Pokémon list. Connect to the internet and try again.");
  }
}

function openSetup() {
  quizScreen.classList.add("is-hidden");
  setupScreen.classList.remove("is-hidden");
  errorElement.classList.add("is-hidden");
  roundControls.classList.add("is-hidden");
  clearSetupError();
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateSelectedCount();
}

function showQuizError(message) {
  loadingElement.classList.add("is-hidden");
  mysteryImage.classList.add("is-hidden");
  choicesElement.replaceChildren();
  errorElement.firstChild.textContent = `${message} `;
  errorElement.classList.remove("is-hidden");
  roundControls.classList.add("is-hidden");
}

async function getCachedPokemonPool(pokemon) {
  const cachedUrls = await getCachedArtworkUrls();
  return pokemon.filter((entry) => (
    cachedUrls.has(imageUrl(entry))
    && cachedUrls.has(imageUrl(entry, true))
  ));
}

async function getCachedArtworkUrls() {
  const cacheNames = await caches.keys();
  const cacheKeys = await Promise.all(cacheNames.map(async (cacheName) => {
    const cache = await caches.open(cacheName);
    return cache.keys();
  }));
  return new Set(
    cacheKeys
      .flat()
      .map((request) => request.url)
      .filter((url) => url.startsWith(`${ARTWORK_ORIGIN}/`))
  );
}

function makeChoice(pokemon, index) {
  const button = document.createElement("button");
  button.className = "choice";
  button.type = "button";
  button.setAttribute("aria-label", `Choice ${index + 1}`);
  button.dataset.pokemonId = String(pokemon.id);

  const key = document.createElement("span");
  key.className = "choice-key";
  key.setAttribute("aria-hidden", "true");
  key.textContent = String.fromCharCode(65 + index);

  const image = document.createElement("img");
  image.alt = "";
  image.loading = "eager";
  image.addEventListener("error", () => {
    image.alt = `${formatName(pokemon.name)} image unavailable`;
    image.src = "";
    image.classList.add("image-unavailable");
  }, { once: true });
  image.src = imageUrl(pokemon);

  button.append(key, image);
  button.addEventListener("click", () => selectAnswer(button, pokemon));
  return button;
}

function nextQuestion() {
  if (questionIndex >= questionOrder.length) {
    questionOrder = shuffle(pokemonList);
    questionIndex = 0;
  }

  const answer = questionOrder[questionIndex];
  questionIndex += 1;
  roundNumber += 1;
  currentAnswer = answer;
  answered = false;
  roundElement.textContent = `ROUND ${roundNumber}`;
  promptElement.textContent = "Choose the Pokémon that matches the shadow";
  feedbackElement.textContent = "";
  feedbackElement.className = "feedback";
  roundControls.classList.add("is-hidden");
  nextButton.classList.add("is-hidden");
  loadingElement.classList.remove("is-hidden");
  mysteryImage.classList.add("is-hidden");
  mysteryImage.style.filter = "";
  mysteryImage.alt = "A mystery Pokémon silhouette";
  mysteryImage.onload = () => {
    loadingElement.classList.add("is-hidden");
    mysteryImage.classList.remove("is-hidden");
  };
  mysteryImage.onerror = () => showQuizError("The Pokémon image couldn't load.");
  mysteryImage.src = imageUrl(answer, selectedMode === "hard");

  const distractors = shuffle(pokemonList.filter((pokemon) => pokemon.id !== answer.id)).slice(0, 3);
  const options = shuffle([answer, ...distractors]);
  choicesElement.replaceChildren(...options.map(makeChoice));
}

function selectAnswer(button, pokemon) {
  if (answered || !currentAnswer) return;

  answered = true;
  const isCorrect = pokemon.id === currentAnswer.id;
  for (const choice of choicesElement.querySelectorAll(".choice")) {
    choice.disabled = true;
    if (Number(choice.dataset.pokemonId) === currentAnswer.id) {
      choice.classList.add("correct");
    }
  }

  if (isCorrect) {
    score += 1;
    scoreElement.textContent = String(score);
    feedbackElement.textContent = `Correct! It's ${formatName(currentAnswer.name)}!`;
    feedbackElement.classList.add("is-correct");
  } else {
    button.classList.add("incorrect");
    feedbackElement.textContent = `Not quite — it's ${formatName(currentAnswer.name)}.`;
    feedbackElement.classList.add("is-incorrect");
  }

  mysteryImage.style.filter = "none";
  mysteryImage.alt = formatName(currentAnswer.name);
  promptElement.textContent = "Mystery solved!";
  roundControls.classList.remove("is-hidden");
  nextButton.classList.remove("is-hidden");
  nextButton.focus({ preventScroll: true });
}

async function startQuiz() {
  clearSetupError();
  saveSettings();
  const selectedPokemon = filterSelectedPokemon();
  if (selectedPokemon.length < 4) {
    showSetupError("Select at least four Pokémon to start a quiz.");
    return;
  }

  startButton.disabled = true;
  try {
    if (navigator.onLine) {
      pokemonList = selectedPokemon;
    } else {
      pokemonList = await getCachedPokemonPool(selectedPokemon);
      if (pokemonList.length !== selectedPokemon.length) {
        throw new Error(`Only ${pokemonList.length} of ${selectedPokemon.length} selected Pokémon are saved offline. Select only downloaded generations or connect and download them first.`);
      }
    }

    selectedMode = document.querySelector('input[name="mode"]:checked').value;
    questionOrder = shuffle(pokemonList);
    questionIndex = 0;
    roundNumber = 0;
    score = 0;
    scoreElement.textContent = "0";
    setupScreen.classList.add("is-hidden");
    quizScreen.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "instant" });
    nextQuestion();
  } catch (error) {
    console.error("Unable to start the Pokémon quiz.", error);
    showSetupError(error.message);
  } finally {
    updateSelectedCount();
  }
}

function buildOfflineImageUrls(pokemon) {
  return pokemon.flatMap((entry) => [imageUrl(entry), imageUrl(entry, true)]);
}

async function downloadOfflineQuiz() {
  if (!navigator.onLine) {
    showSetupError("Connect to the internet before downloading Pokémon for offline play.");
    return;
  }

  const selectedPokemon = filterSelectedPokemon();
  if (selectedPokemon.length < 4) {
    showSetupError("Select at least four Pokémon before downloading.");
    return;
  }

  clearSetupError();
  let missingUrls;
  try {
    const imageUrls = buildOfflineImageUrls(selectedPokemon);
    const cachedUrls = await getCachedArtworkUrls();
    missingUrls = imageUrls.filter((url) => !cachedUrls.has(url));
  } catch (error) {
    console.error("Unable to check saved Pokémon artwork.", error);
    showSetupError("Couldn't check offline storage. Check your available device storage and try again.");
    return;
  }

  if (missingUrls.length === 0) {
    offlineProgress.classList.remove("is-hidden");
    progressLabel.textContent = "Offline quiz is ready on this device.";
    progressCount.textContent = "100%";
    downloadProgress.value = 100;
    return;
  }

  offlineProgress.classList.remove("is-hidden");
  startButton.disabled = true;
  downloadButton.disabled = true;
  cancelDownloadButton.classList.remove("is-hidden");
  downloadController = new AbortController();
  let completed = 0;
  let failures = 0;

  try {
    for (let index = 0; index < missingUrls.length; index += 8) {
      if (downloadController.signal.aborted) break;
      const batch = missingUrls.slice(index, index + 8);
      const results = await Promise.allSettled(batch.map(async (url) => {
        const response = await fetch(url, {
          mode: "cors",
          signal: downloadController.signal
        });
        if (!response.ok) {
          throw new Error(`Artwork request failed (${response.status}): ${url}`);
        }
      }));
      failures += results.filter((result) => result.status === "rejected").length;
      completed += batch.length;
      const percent = Math.round((completed / missingUrls.length) * 100);
      progressLabel.textContent = `Downloading Pokémon artwork…`;
      progressCount.textContent = `${percent}%`;
      downloadProgress.value = percent;
    }

    if (downloadController.signal.aborted) {
      progressLabel.textContent = "Offline download cancelled. Downloaded images remain saved.";
    } else if (failures > 0) {
      progressLabel.textContent = `${failures} image${failures === 1 ? "" : "s"} couldn't be downloaded. Try again while online.`;
      showSetupError("The offline download was incomplete. Connect to the internet and retry to save the missing artwork.");
    } else {
      progressLabel.textContent = `Offline quiz ready: ${selectedPokemon.length.toLocaleString()} Pokémon saved.`;
      progressCount.textContent = "100%";
      downloadProgress.value = 100;
    }
  } catch (error) {
    console.error("Unable to download the offline quiz.", error);
    progressLabel.textContent = "Offline download failed.";
    showSetupError("Couldn't finish the offline download. Check your connection and available device storage, then try again.");
  } finally {
    downloadController = null;
    cancelDownloadButton.classList.add("is-hidden");
    updateSelectedCount();
  }
}

async function initialize() {
  restoreSettings();
  setupInstallPrompt();
  for (const checkbox of generationCheckboxes) {
    checkbox.addEventListener("change", () => {
      clearSetupError();
      saveSettings();
      updateSelectedCount();
    });
  }
  for (const modeInput of document.querySelectorAll('input[name="mode"]')) {
    modeInput.addEventListener("change", saveSettings);
  }
  document.querySelector("#select-all-generations").addEventListener("click", () => {
    for (const checkbox of generationCheckboxes) checkbox.checked = true;
    saveSettings();
    updateSelectedCount();
  });
  document.querySelector("#clear-generations").addEventListener("click", () => {
    for (const checkbox of generationCheckboxes) checkbox.checked = false;
    saveSettings();
    updateSelectedCount();
  });
  startButton.addEventListener("click", startQuiz);
  downloadButton.addEventListener("click", downloadOfflineQuiz);
  cancelDownloadButton.addEventListener("click", () => downloadController?.abort());
  retryButton.addEventListener("click", openSetup);
  document.querySelector("#back-button").addEventListener("click", openSetup);
  nextButton.addEventListener("click", nextQuestion);
  window.addEventListener("online", () => {
    updateSelectedCount();
    if (!catalog.length) loadCatalog();
  });
  window.addEventListener("offline", updateSelectedCount);

  await registerServiceWorker();
  await loadCatalog();
}

initialize();
