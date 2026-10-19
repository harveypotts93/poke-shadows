const API_URL = "https://pokeapi.co/api/v2/pokemon?limit=151";
const ARTWORK_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

const scoreElement = document.querySelector("#score");
const roundElement = document.querySelector("#round-label");
const promptElement = document.querySelector("#prompt-text");
const loadingElement = document.querySelector("#loading-state");
const mysteryImage = document.querySelector("#mystery-image");
const choicesElement = document.querySelector("#choices");
const feedbackElement = document.querySelector("#feedback");
const nextButton = document.querySelector("#next-button");
const errorElement = document.querySelector("#error-message");
const retryButton = document.querySelector("#retry-button");

let pokemonList = [];
let questionOrder = [];
let questionIndex = 0;
let score = 0;
let currentAnswer = null;
let answered = false;

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function imageUrl(pokemon) {
  return `${ARTWORK_URL}/${pokemon.id}.png`;
}

function formatName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hideError() {
  errorElement.classList.add("is-hidden");
}

function showError() {
  loadingElement.classList.add("is-hidden");
  mysteryImage.classList.add("is-hidden");
  choicesElement.replaceChildren();
  errorElement.classList.remove("is-hidden");
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
  currentAnswer = answer;
  answered = false;
  roundElement.textContent = `ROUND ${questionIndex}`;
  promptElement.textContent = "Choose the Pokémon that matches the shadow";
  feedbackElement.textContent = "";
  feedbackElement.className = "feedback";
  nextButton.classList.add("is-hidden");
  loadingElement.classList.remove("is-hidden");
  mysteryImage.classList.add("is-hidden");
  mysteryImage.style.filter = "";
  mysteryImage.alt = "A mystery Pokémon silhouette";
  mysteryImage.onload = () => {
    loadingElement.classList.add("is-hidden");
    mysteryImage.classList.remove("is-hidden");
  };
  mysteryImage.onerror = showError;
  mysteryImage.src = imageUrl(answer);

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
  nextButton.classList.remove("is-hidden");
  nextButton.focus();
}

async function startGame() {
  hideError();
  loadingElement.classList.remove("is-hidden");
  mysteryImage.classList.add("is-hidden");
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`PokéAPI responded with ${response.status}`);
    }

    const data = await response.json();
    pokemonList = data.results.map((pokemon, index) => ({
      id: index + 1,
      name: pokemon.name
    }));
    if (pokemonList.length < 4) {
      throw new Error("PokéAPI returned fewer than four Pokémon");
    }

    questionOrder = shuffle(pokemonList);
    questionIndex = 0;
    score = 0;
    scoreElement.textContent = "0";
    nextQuestion();
  } catch (error) {
    console.error("Unable to start the Pokémon quiz.", error);
    showError();
  }
}

nextButton.addEventListener("click", nextQuestion);
retryButton.addEventListener("click", startGame);
startGame();
