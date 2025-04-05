/************************************************
 * script.js
 * Revised Code Addressing Your Issues
 ************************************************/

/* 
  Your Google Sheet must have these Column A values exactly:
    "Level 1 (Perception)"
    "Level 2 (Connection)"
    "Level 3 (Reflection)"
  And Column B = Question Text.

  Make sure your sheet is publicly viewable or "Anyone with the link" can view.
*/

const SHEET_ID = "1FE3h7OaeX7eZtTEE5-8uQe3yFNaKtHsN-itlOUUa5FA";
const API_KEY = "AIzaSyC8tdrYfi3zAu6A5cLrUd3xNUG4jxTdcn0";

// Global variables
let currentScreen = "introPage";
let playerNames = [];
let currentPlayerIndex = 0;
let turnOrder = [];
let timerInterval = null;
let elapsedSeconds = 0;

// For decks data: { "DeckName": [ {level: "Level 1 (Perception)", question: "..."} ] }
let decksData = {};

// The chosen deck name
let chosenDeck = "";

// Track each player's "Dig Deeper" usage. Key = player name, Value = how many remain
let digDeeperRemaining = {};

// ========== GET DOM ELEMENTS ==========
const introPage = document.getElementById("introPage");
const mainPage = document.getElementById("mainPage");
const gamePage = document.getElementById("gamePage");

// Buttons
const enterButton = document.getElementById("enterButton");
const beginSession = document.getElementById("beginSession");
const pauseBtn = document.getElementById("pauseBtn"); // formerly mainPageBtn
const nextCardBtn = document.getElementById("nextCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const digDeeperBtn = document.getElementById("digDeeperBtn");

// Overlays
const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn = document.getElementById("resumeBtn");
const confirmMainPageBtn = document.getElementById("confirmMainPageBtn");

const digDeeperOverlay = document.getElementById("digDeeperOverlay");
const cancelDigDeeperBtn = document.getElementById("cancelDigDeeperBtn");
const digDeeperConfirmOverlay = document.getElementById("digDeeperConfirmOverlay");
const noDigDeeperBtn = document.getElementById("noDigDeeperBtn");
const yesDigDeeperBtn = document.getElementById("yesDigDeeperBtn");
const digDeeperBoxOverlay = document.getElementById("digDeeperBoxOverlay");
const digDeeperDoneBtn = document.getElementById("digDeeperDoneBtn");
const digDeeperPlayers = document.getElementById("digDeeperPlayers");
const digDeeperConfirmText = document.getElementById("digDeeperConfirmText");

// Selects
const numPlayersSelect = document.getElementById("numPlayers");
const levelSelect = document.getElementById("levelSelect");
const selectDeck = document.getElementById("selectDeck");

// Containers
const playerInputs = document.getElementById("playerInputs");
const timerDisplay = document.getElementById("timerDisplay");
const currentPlayer = document.getElementById("currentPlayer");

// Card boxes
const whiteBox = document.getElementById("whiteBox");
const redBox = document.getElementById("redBox");

// Deck name display
const selectedDeckName = document.getElementById("selectedDeckName");

// ========== SCREEN TOGGLING ==========
function showScreen(screenId) {
  introPage.classList.remove("active");
  mainPage.classList.remove("active");
  gamePage.classList.remove("active");

  document.getElementById(screenId).classList.add("active");
  currentScreen = screenId;
}

// ========== EVENT LISTENERS ==========

// On page load
window.addEventListener("DOMContentLoaded", async () => {
  // Show Intro Page
  showScreen("introPage");

  // Populate # of players
  populateNumPlayersSelect();

  // Fetch list of sheet names -> populate deck dropdown
  await populateDeckNamesFromSheet();
});

// Intro Page -> Main Page
enterButton.addEventListener("click", () => {
  showScreen("mainPage");
});

// "Begin Session" -> gather names, choose deck, start game
beginSession.addEventListener("click", () => {
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

  // Show the chosen deck name in the white box at top
  selectedDeckName.textContent = chosenDeck;

  // Go to Game Page
  showScreen("gamePage");
  currentPlayer.textContent = turnOrder[currentPlayerIndex];

  // Reset timer to 0 for a new session
  elapsedSeconds = 0;
  startTimer(); // start counting from 0

  // Load initial question
  loadRandomQuestion();
});

// "Next Card"
nextCardBtn.addEventListener("click", () => {
  loadRandomQuestion();
});

// "End Turn"
endTurnBtn.addEventListener("click", () => {
  setNextPlayer();
});

// Changing the level
levelSelect.addEventListener("change", () => {
  loadRandomQuestion();
});

// "Pause" button -> show pause overlay
pauseBtn.addEventListener("click", () => {
  stopTimer(); // do not reset elapsedSeconds, just stop
  pauseOverlay.classList.remove("hidden");
});

// "Resume" in pause overlay
resumeBtn.addEventListener("click", () => {
  pauseOverlay.classList.add("hidden");
  startTimer(); // continue from existing elapsedSeconds
});

// "Main Page" from overlay
confirmMainPageBtn.addEventListener("click", () => {
  pauseOverlay.classList.add("hidden");
  showScreen("mainPage");
});

// "Dig Deeper"
digDeeperBtn.addEventListener("click", () => {
  showDigDeeperOverlay();
});

// Cancel Dig Deeper
cancelDigDeeperBtn.addEventListener("click", () => {
  digDeeperOverlay.classList.add("hidden");
});

// Dig Deeper confirm overlay
noDigDeeperBtn.addEventListener("click", () => {
  digDeeperConfirmOverlay.classList.add("hidden");
});

yesDigDeeperBtn.addEventListener("click", () => {
  digDeeperConfirmOverlay.classList.add("hidden");
  digDeeperOverlay.classList.add("hidden");
  digDeeperBoxOverlay.classList.remove("hidden");
});

// "DIG DEEPER BRO" overlay -> Done
digDeeperDoneBtn.addEventListener("click", () => {
  digDeeperBoxOverlay.classList.add("hidden");
  // usage has already been decremented. The game just resumes.
});

// ========== HELPER FUNCTIONS ==========

/** Populate the # of players select with 1-10 */
function populateNumPlayersSelect() {
  for (let i = 1; i <= 10; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    numPlayersSelect.appendChild(option);
  }
}

/** When # of players changes, create dynamic fields */
numPlayersSelect.addEventListener("change", () => {
  const num = parseInt(numPlayersSelect.value);
  updatePlayerInputs(num);
});

/** Clear and recreate the player name input fields */
function updatePlayerInputs(num) {
  playerInputs.innerHTML = "";
  for (let i = 1; i <= num; i++) {
    const label = document.createElement("label");
    label.textContent = `Player #${i}: `;

    const input = document.createElement("input");
    input.type = "text";
    input.id = `playerName${i}`;
    input.placeholder = `Enter Player #${i} Name`;

    const container = document.createElement("div");
    container.style.marginBottom = "10px";

    container.appendChild(label);
    container.appendChild(input);
    playerInputs.appendChild(container);
  }
}

/** Gather player names from the text inputs */
function gatherPlayerNames(num) {
  playerNames = [];
  for (let i = 1; i <= num; i++) {
    const val = document.getElementById(`playerName${i}`).value.trim();
    playerNames.push(val || `Player${i}`);
  }
}

/** Simple array shuffle */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Timer controls */
function startTimer() {
  // Just resume from elapsedSeconds, do not reset it here
  if (timerInterval) clearInterval(timerInterval);

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

/** Advance to the next player in turnOrder */
function setNextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + 1) % turnOrder.length;
  currentPlayer.textContent = turnOrder[currentPlayerIndex];
}

/** Populate deck names by reading all sheet names from your spreadsheet */
async function populateDeckNamesFromSheet() {
  try {
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title&key=${API_KEY}`;
    const response = await fetch(sheetsUrl);
    const data = await response.json();

    if (!data.sheets) {
      console.error("No sheets found in the spreadsheet:", data);
      return;
    }

    // Clear deck select
    selectDeck.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a Deck";
    selectDeck.appendChild(defaultOption);

    // For each sheet tab, add as an option
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

/** 
 * Once the user picks a deck, fetch the data for that sheet (range A:B)
 * and store it in decksData[deckName].
 */
async function fetchDeckData(deckName) {
  // If we've already fetched it, skip
  if (decksData[deckName]) return;

  try {
    // e.g. "MySheetName!A:B"
    const range = encodeURIComponent(`${deckName}!A:B`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      console.warn(`No data found in sheet "${deckName}".`);
      decksData[deckName] = [];
      return;
    }

    // Skip header row if row 0 is a header
    const rows = data.values.slice(1); 
    decksData[deckName] = rows.map(row => {
      return {
        level: row[0] ? row[0].trim() : "",
        question: row[1] ? row[1].trim() : "",
      };
    });
  } catch (err) {
    console.error(`Error fetching data for deck "${deckName}":`, err);
    decksData[deckName] = [];
  }
}

/** Load a random question for the chosen deck & current level from Google Sheets data */
async function loadRandomQuestion() {
  if (!chosenDeck) {
    whiteBox.textContent = "No deck chosen.";
    redBox.textContent = "";
    return;
  }

  // Ensure we have the deck's data loaded
  await fetchDeckData(chosenDeck);

  const deckArray = decksData[chosenDeck] || [];
  const currentLevel = levelSelect.value; 
  // e.g. "Level 1 (Perception)", "Level 2 (Connection)", "Level 3 (Reflection)"

  // Filter by current level
  const filteredCards = deckArray.filter(card => card.level === currentLevel);

  if (filteredCards.length === 0) {
    whiteBox.textContent = "No questions found for this level.";
    redBox.textContent = "Please pick another level or deck.";
    return;
  }

  // Randomly pick one
  const randomIndex = Math.floor(Math.random() * filteredCards.length);
  const selectedCard = filteredCards[randomIndex];

  whiteBox.textContent = selectedCard.question;
  redBox.textContent = selectedCard.level;
}

/** Show the Dig Deeper overlay with all players and squares */
function showDigDeeperOverlay() {
  digDeeperPlayers.innerHTML = "";

  turnOrder.forEach(name => {
    const div = document.createElement("div");
    div.style.margin = "10px 0";

    const squaresCount = digDeeperRemaining[name] || 0;
    let squaresStr = "";
    for (let i = 0; i < squaresCount; i++) {
      squaresStr += "■ ";
    }

    div.textContent = `${name} [${squaresStr.trim()}]`;

    if (squaresCount > 0) {
      div.style.cursor = "pointer";
      div.addEventListener("click", () => {
        showDigDeeperConfirm(name);
      });
    } else {
      div.style.color = "#888";
    }

    digDeeperPlayers.appendChild(div);
  });

  digDeeperOverlay.classList.remove("hidden");
}

/** Show the confirm overlay for a specific user (are you sure you want to use a card?) */
function showDigDeeperConfirm(playerName) {
  digDeeperConfirmOverlay.classList.remove("hidden");
  digDeeperConfirmText.textContent = `Does ${playerName} wish to use a Dig Deeper Card?`;
  digDeeperConfirmOverlay.dataset.currentPlayer = playerName;
}

/** On "Yes", decrement that player's count */
yesDigDeeperBtn.addEventListener("click", () => {
  // Hide the confirm overlay
  digDeeperConfirmOverlay.classList.add("hidden");

  // Identify which player
  const playerName = digDeeperConfirmOverlay.dataset.currentPlayer;
  if (playerName) {
    digDeeperRemaining[playerName] = Math.max(0, digDeeperRemaining[playerName] - 1);
  }

  // Then we show the "DIG DEEPER BRO" overlay
  // The rest is handled in the yesDigDeeperBtn event (line above).
});
