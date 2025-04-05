/************************************************
 * script.js
 * Incorporating pressed-button effect, 
 * custom yes/no/done images, and my_Card for squares
 ************************************************/

const SHEET_ID = "1FE3h7OaeX7eZtTEE5-8uQe3yFNaKtHsN-itlOUUa5FA";
const API_KEY = "AIzaSyC8tdrYfi3zAu6A5cLrUd3xNUG4jxTdcn0";

let currentScreen = "introPage";
let playerNames = [];
let currentPlayerIndex = 0;
let turnOrder = [];
let digDeeperRemaining = {};

let timerInterval = null;
let elapsedSeconds = 0;

let decksData = {};
let chosenDeck = "";
let previousQuestionsList = [];

// Screens
const introPage = document.getElementById("introPage");
const mainPage = document.getElementById("mainPage");
const gamePage = document.getElementById("gamePage");

// Intro
const enterButtonImage = document.getElementById("enterButtonImage");

// Main
const beginSessionImage = document.getElementById("beginSessionImage");
const numPlayersSelect = document.getElementById("numPlayers");
const selectDeck = document.getElementById("selectDeck");
const playerInputs = document.getElementById("playerInputs");

// Game
const currentPlayer = document.getElementById("currentPlayer");
const timerDisplay = document.getElementById("timerDisplay");
const whiteBox = document.getElementById("whiteBox");
const redBox = document.getElementById("redBox");
const deckNameDisplay = document.getElementById("deckNameDisplay");
const cardsRemainingDisplay = document.getElementById("cardsRemainingDisplay");
const previousQuestionsBox = document.getElementById("previousQuestionsBox");
const levelSelect = document.getElementById("levelSelect");

// Pause overlay
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtnImage = document.getElementById("resumeBtnImage");
const confirmMainPageBtnImage = document.getElementById("confirmMainPageBtnImage");

// Dig Deeper overlay
const digDeeperOverlay = document.getElementById("digDeeperOverlay");
const digDeeperPlayers = document.getElementById("digDeeperPlayers");
const cancelDigDeeperBtnImage = document.getElementById("cancelDigDeeperBtnImage");

// Dig Deeper confirm overlay
const digDeeperConfirmOverlay = document.getElementById("digDeeperConfirmOverlay");
const digDeeperConfirmText = document.getElementById("digDeeperConfirmText");
const yesDigDeeperBtnImage = document.getElementById("yesDigDeeperBtnImage");
const noDigDeeperBtnImage = document.getElementById("noDigDeeperBtnImage");

// "DIG DEEPER BRO" overlay
const digDeeperBoxOverlay = document.getElementById("digDeeperBoxOverlay");
const digDeeperDoneBtnImage = document.getElementById("digDeeperDoneBtnImage");

// Action buttons (Game page)
const pauseBtnImage = document.getElementById("pauseBtnImage");
const endTurnBtnImage = document.getElementById("endTurnBtnImage");
const nextCardBtnImage = document.getElementById("nextCardBtnImage");
const digDeeperBtnImage = document.getElementById("digDeeperBtnImage");

// ========== SCREEN TOGGLING ==========
function showScreen(screenId) {
  introPage.classList.remove("active");
  mainPage.classList.remove("active");
  gamePage.classList.remove("active");

  document.getElementById(screenId).classList.add("active");
  currentScreen = screenId;
}

// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", async () => {
  // Start on Intro
  showScreen("introPage");

  // Setup
  populateNumPlayersSelect();
  await populateDeckNamesFromSheet();

  // Intro page
  enterButtonImage.addEventListener("click", () => {
    showScreen("mainPage");
  });

  // Main page
  beginSessionImage.addEventListener("click", () => {
    const num = parseInt(numPlayersSelect.value) || 0;
    if (num < 1) {
      alert("Please select the number of players.");
      return;
    }

    gatherPlayerNames(num);
    turnOrder = shuffle([...playerNames]);
    currentPlayerIndex = 0;
    chosenDeck = selectDeck.value;

    if (!chosenDeck) {
      alert("Please select a deck before beginning the session.");
      return;
    }

    // Initialize Dig Deeper usage
    digDeeperRemaining = {};
    turnOrder.forEach(name => {
      digDeeperRemaining[name] = 3;
    });
    previousQuestionsList = [];

    // Go to Game
    showScreen("gamePage");
    currentPlayer.textContent = turnOrder[currentPlayerIndex];
    deckNameDisplay.textContent = chosenDeck;

    startTimer(true);
    loadRandomQuestion();
  });

  // Game page action images
  pauseBtnImage.addEventListener("click", () => {
    stopTimer();
    pauseOverlay.classList.remove("hidden");
  });
  endTurnBtnImage.addEventListener("click", () => {
    setNextPlayer();
  });
  nextCardBtnImage.addEventListener("click", () => {
    loadRandomQuestion();
  });
  digDeeperBtnImage.addEventListener("click", () => {
    showDigDeeperOverlay();
  });

  // Pause overlay
  resumeBtnImage.addEventListener("click", () => {
    pauseOverlay.classList.add("hidden");
    startTimer(false);
  });
  confirmMainPageBtnImage.addEventListener("click", () => {
    pauseOverlay.classList.add("hidden");
    showScreen("mainPage");
  });

  // Dig Deeper overlay
  cancelDigDeeperBtnImage.addEventListener("click", () => {
    digDeeperOverlay.classList.add("hidden");
  });

  // Dig Deeper confirm overlay => "Yes" / "No"
  yesDigDeeperBtnImage.addEventListener("click", () => {
    // same as old "yesDigDeeperBtn"
    confirmDigDeeperYes();
  });
  noDigDeeperBtnImage.addEventListener("click", () => {
    // same as old "noDigDeeperBtn"
    digDeeperConfirmOverlay.classList.add("hidden");
  });

  // "DIG DEEPER BRO" overlay => "Done"
  digDeeperDoneBtnImage.addEventListener("click", () => {
    digDeeperBoxOverlay.classList.add("hidden");
  });

  // On level changes
  levelSelect.addEventListener("change", () => {
    loadRandomQuestion();
  });

  // On # players change
  numPlayersSelect.addEventListener("change", () => {
    const n = parseInt(numPlayersSelect.value);
    updatePlayerInputs(n);
  });
});

// ========== HELPER FUNCTIONS ==========

function startTimer(reset = true) {
  if (timerInterval) clearInterval(timerInterval);
  if (reset) elapsedSeconds = 0;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    timerDisplay.textContent =
      `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function populateNumPlayersSelect() {
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    numPlayersSelect.appendChild(opt);
  }
}

function updatePlayerInputs(num) {
  playerInputs.innerHTML = "";
  for (let i = 1; i <= num; i++) {
    const div = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = `Player #${i}: `;
    const input = document.createElement("input");
    input.type = "text";
    input.id = `playerName${i}`;
    input.placeholder = `Enter Player #${i} Name`;

    div.appendChild(label);
    div.appendChild(input);
    playerInputs.appendChild(div);
  }
}

function gatherPlayerNames(num) {
  playerNames = [];
  for (let i = 1; i <= num; i++) {
    const val = document.getElementById(`playerName${i}`).value.trim();
    playerNames.push(val || `Player${i}`);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function setNextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + 1) % turnOrder.length;
  currentPlayer.textContent = turnOrder[currentPlayerIndex];
}

async function populateDeckNamesFromSheet() {
  try {
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title&key=${API_KEY}`;
    const response = await fetch(sheetsUrl);
    const data = await response.json();
    if (!data.sheets) {
      console.error("No sheets found in the spreadsheet:", data);
      return;
    }

    selectDeck.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a Deck";
    selectDeck.appendChild(defaultOption);

    for (const sheet of data.sheets) {
      const sheetTitle = sheet.properties.title;
      const option = document.createElement("option");
      option.value = sheetTitle;
      option.textContent = sheetTitle;
      selectDeck.appendChild(option);
    }
  } catch (err) {
    console.error("Error fetching sheet names:", err);
  }
}

async function fetchDeckData(deckName) {
  if (decksData[deckName]) return;

  try {
    const range = encodeURIComponent(`${deckName}!A:B`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      console.warn(`No data found in sheet "${deckName}".`);
      decksData[deckName] = [];
      return;
    }

    const rows = data.values.slice(1);
    decksData[deckName] = rows.map(row => ({
      level: row[0] ? row[0].trim() : "",
      question: row[1] ? row[1].trim() : "",
    }));
  } catch (err) {
    console.error(`Error fetching data for deck "${deckName}":`, err);
    decksData[deckName] = [];
  }
}

async function loadRandomQuestion() {
  if (!chosenDeck) {
    whiteBox.textContent = "No deck chosen.";
    redBox.textContent = "";
    return;
  }

  await fetchDeckData(chosenDeck);

  const deckArray = decksData[chosenDeck] || [];
  const currentLevel = levelSelect.value;
  const filteredIndexes = [];

  for (let i = 0; i < deckArray.length; i++) {
    if (deckArray[i].level === currentLevel) {
      filteredIndexes.push(i);
    }
  }

  if (filteredIndexes.length === 0) {
    whiteBox.textContent = "No questions found for this level.";
    redBox.textContent = "Please pick another level or deck.";
    updateCardsRemaining();
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredIndexes.length);
  const selectedCard = deckArray[randomIndex];

  whiteBox.textContent = selectedCard.question;
  redBox.textContent = `Level: ${selectedCard.level}`;
  deckArray.splice(randomIndex, 1);

  updateCardsRemaining();
  addPreviousQuestion(selectedCard.question);
}

function updateCardsRemaining() {
  const remainingCount = decksData[chosenDeck] ? decksData[chosenDeck].length : 0;
  cardsRemainingDisplay.textContent = remainingCount;
}

function addPreviousQuestion(questionText) {
  previousQuestionsList.unshift(questionText);
  if (previousQuestionsList.length > 5) {
    previousQuestionsList.pop();
  }
  renderPreviousQuestions();
}

function renderPreviousQuestions() {
  previousQuestionsBox.innerHTML = "";
  previousQuestionsList.forEach(qText => {
    const div = document.createElement("div");
    div.classList.add("previous-question-item");
    div.textContent = qText;
    previousQuestionsBox.appendChild(div);
  });
}

// Show Dig Deeper overlay
function showDigDeeperOverlay() {
  digDeeperPlayers.innerHTML = "";
  turnOrder.forEach(name => {
    const squaresCount = digDeeperRemaining[name] || 0;

    // Issue #4: replace '■' squares with <img src="my_Card.png">
    let squaresHTML = "";
    for (let i = 0; i < squaresCount; i++) {
      squaresHTML += `<img src="media/my_Card.png" class="dig-deeper-card-img" alt="card" /> `;
    }

    // e.g. "Larry [ <img> <img> <img> ]"
    // We'll wrap in a <span> or something for styling
    const div = document.createElement("div");
    div.innerHTML = `${name} [ ${squaresHTML} ]`;
    if (squaresCount > 0) {
      div.style.cursor = "pointer";
      div.addEventListener("click", () => {
        showDigDeeperConfirm(name);
      });
    } else {
      // if no squares left, maybe gray it out
      div.style.color = "#888";
    }
    digDeeperPlayers.appendChild(div);
  });

  digDeeperOverlay.classList.remove("hidden");
}

// Show confirm overlay for a specific user
function showDigDeeperConfirm(playerName) {
  digDeeperConfirmOverlay.classList.remove("hidden");
  digDeeperConfirmText.textContent = `Does ${playerName} wish to use a Dig Deeper Card?`;
  digDeeperConfirmOverlay.dataset.currentPlayer = playerName;
}

// Called when the user clicks the "Yes" image in the confirm overlay
function confirmDigDeeperYes() {
  const playerName = digDeeperConfirmOverlay.dataset.currentPlayer;
  if (playerName) {
    digDeeperRemaining[playerName] = Math.max(0, digDeeperRemaining[playerName] - 1);
  }
  // close overlays
  digDeeperConfirmOverlay.classList.add("hidden");
  digDeeperOverlay.classList.add("hidden");
  // open the "DIG DEEPER BRO" overlay
  digDeeperBoxOverlay.classList.remove("hidden");
}




