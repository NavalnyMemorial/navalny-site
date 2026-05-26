const characters = [
  { id: 1, name: "Crypto King", emoji: "😵", dunks: 128 },
  { id: 2, name: "Fake Guru", emoji: "🤡", dunks: 94 },
  { id: 3, name: "Drama Mayor", emoji: "😬", dunks: 212 },
  { id: 4, name: "Greedy Boss", emoji: "🤑", dunks: 77 },
  { id: 5, name: "Angry Coach", emoji: "😡", dunks: 156 }
];

let throwsLeft = 5;

function render() {
  const arena = document.getElementById("arena");

  if (!arena) {
    console.error("Arena element was not found.");
    return;
  }

  arena.innerHTML = "";

  characters.forEach((ch) => {
    const card = document.createElement("div");
    card.className = "character";

    card.innerHTML = `
      <div class="counter">
        Dunked: <span id="count-${ch.id}">${ch.dunks}</span>
      </div>

      <div class="seat-area">
        <div class="person" id="person-${ch.id}">
          <div class="head">${ch.emoji}</div>
          <div class="body"></div>
        </div>
      </div>

      <button class="target" id="target-${ch.id}" data-character-id="${ch.id}" aria-label="Dunk ${ch.name}"></button>

      <div class="seat"></div>
      <div class="mud"></div>
      <div class="splash" id="splash-${ch.id}">💦 SPLASH!</div>

      <h2>${ch.name}</h2>
    `;

    arena.appendChild(card);
  });

  document.querySelectorAll(".target").forEach((target) => {
    target.addEventListener("click", () => {
      const id = Number(target.dataset.characterId);
      throwBall(id);
    });
  });
}

function throwBall(id) {
  if (throwsLeft <= 0) return;

  throwsLeft--;
  document.getElementById("throwsLeft").innerText = throwsLeft;

  const character = characters.find(c => c.id === id);
  if (!character) return;

  character.dunks++;

  document.getElementById(`count-${id}`).innerText = character.dunks;
  document.getElementById(`person-${id}`).classList.add("dunked");
  document.getElementById(`splash-${id}`).classList.add("show");

  document.getElementById("message").innerText =
    `${character.name} was dunked into the mud!`;

  setTimeout(() => {
    const person = document.getElementById(`person-${id}`);
    const splash = document.getElementById(`splash-${id}`);

    if (person) person.classList.remove("dunked");
    if (splash) splash.classList.remove("show");
  }, 900);

  if (throwsLeft === 0) {
    document.getElementById("message").innerText =
      "Game over. You used all 5 throws.";

    document.querySelectorAll(".target").forEach(t => {
      t.classList.add("disabled");
    });
  }
}

function restartGame() {
  throwsLeft = 5;
  document.getElementById("throwsLeft").innerText = throwsLeft;
  document.getElementById("message").innerText =
    "Tap any target to dunk a character.";

  document.querySelectorAll(".target").forEach(t => {
    t.classList.remove("disabled");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  render();

  const restartButton = document.getElementById("restartButton");
  if (restartButton) {
    restartButton.addEventListener("click", restartGame);
  }
});
