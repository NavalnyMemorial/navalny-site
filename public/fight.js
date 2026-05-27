const arena = document.getElementById("arena");
const p1El = document.getElementById("p1");
const p2El = document.getElementById("p2");
const p1HpEl = document.getElementById("p1hp");
const p2HpEl = document.getElementById("p2hp");
const messageEl = document.getElementById("message");
const timerEl = document.getElementById("timer");

const input = {
  left: false,
  right: false,
  jump: false,
  punch: false,
  kick: false,
  block: false
};

const difficulty = {
  easy: {
    reactionDelay: 0.70,
    attackChance: 0.32,
    blockChance: 0.25,
    retreatChance: 0.45,
    mistakeChance: 0.35,
    damageMultiplier: 0.75,
    moveSpeed: 155
  },
  normal: {
    reactionDelay: 0.45,
    attackChance: 0.48,
    blockChance: 0.42,
    retreatChance: 0.35,
    mistakeChance: 0.22,
    damageMultiplier: 0.9,
    moveSpeed: 185
  },
  hard: {
    reactionDelay: 0.26,
    attackChance: 0.68,
    blockChance: 0.62,
    retreatChance: 0.25,
    mistakeChance: 0.10,
    damageMultiplier: 1.05,
    moveSpeed: 220
  }
};

let currentDifficulty = "normal";

let gameOver = false;
let timeLeft = 60;
let lastTime = performance.now();

const p1 = {
  x: 120,
  y: 0,
  vx: 0,
  vy: 0,
  hp: 100,
  facing: 1,
  attackCooldown: 0,
  block: false,
  isAttacking: false,
  attackTimer: 0,
  whiffTimer: 0
};

const p2 = {
  x: 520,
  y: 0,
  vx: 0,
  vy: 0,
  hp: 100,
  facing: -1,
  attackCooldown: 0,
  block: false,
  isAttacking: false,
  attackTimer: 0,
  aiState: "IDLE",
  aiTimer: 0,
  decisionTimer: 0,
  reactionTimer: 0
};

function resetGame() {
  p1.x = 120;
  p1.y = 0;
  p1.vx = 0;
  p1.vy = 0;
  p1.hp = 100;
  p1.attackCooldown = 0;
  p1.block = false;
  p1.isAttacking = false;
  p1.attackTimer = 0;
  p1.whiffTimer = 0;

  p2.x = Math.max(360, window.innerWidth - 180);
  p2.y = 0;
  p2.vx = 0;
  p2.vy = 0;
  p2.hp = 100;
  p2.attackCooldown = 0;
  p2.block = false;
  p2.isAttacking = false;
  p2.attackTimer = 0;
  p2.aiState = "IDLE";
  p2.aiTimer = 0;
  p2.decisionTimer = 0;
  p2.reactionTimer = 0;

  timeLeft = 60;
  gameOver = false;
  messageEl.textContent = "Fight!";
  updateHud();
  render();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distanceBetween() {
  return Math.abs((p2.x + 37) - (p1.x + 37));
}

function update(dt) {
  if (gameOver) return;

  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame(p1.hp === p2.hp ? "Draw!" : (p1.hp > p2.hp ? "Blue wins!" : "Red wins!"));
  }

  updatePlayer(dt);
  runSmartBot(dt);

  applyPhysics(p1, dt);
  applyPhysics(p2, dt);

  p1.x = clamp(p1.x, 20, arena.clientWidth - 94);
  p2.x = clamp(p2.x, 20, arena.clientWidth - 94);

  p1.facing = p1.x < p2.x ? 1 : -1;
  p2.facing = p2.x < p1.x ? 1 : -1;

  tickFighter(p1, dt);
  tickFighter(p2, dt);

  updateHud();
  render();
}

function updatePlayer(dt) {
  const speed = 330;

  p1.vx = 0;
  p1.block = input.block;

  if (input.left) p1.vx = -speed;
  if (input.right) p1.vx = speed;

  if (input.jump && p1.y === 0) {
    p1.vy = 620;
    input.jump = false;
  }

  if (input.punch) {
    attack(p1, p2, 10, 82, "punch");
    input.punch = false;
  }

  if (input.kick) {
    attack(p1, p2, 16, 105, "kick");
    input.kick = false;
  }
}

function tickFighter(f, dt) {
  f.attackCooldown = Math.max(0, f.attackCooldown - dt);
  f.attackTimer = Math.max(0, f.attackTimer - dt);
  f.whiffTimer = Math.max(0, f.whiffTimer - dt);

  if (f.attackTimer <= 0) {
    f.isAttacking = false;
  }
}

function applyPhysics(f, dt) {
  const gravity = 1700;

  f.x += f.vx * dt;
  f.y += f.vy * dt;
  f.vy -= gravity * dt;

  if (f.y < 0) {
    f.y = 0;
    f.vy = 0;
  }
}

function runSmartBot(dt) {
  const cfg = difficulty[currentDifficulty];
  const distance = distanceBetween();

  p2.vx = 0;
  p2.block = false;

  p2.decisionTimer -= dt;
  p2.aiTimer -= dt;
  p2.reactionTimer -= dt;

  const playerIsAttacking = p1.isAttacking || p1.attackTimer > 0;
  const playerWhiffed = p1.whiffTimer > 0;
  const lowHp = p2.hp < 35;
  const veryClose = distance < 70;
  const close = distance < 115;
  const far = distance > 165;

  if (p2.reactionTimer > 0) {
    executeCurrentBotState(cfg, distance);
    return;
  }

  if (Math.random() < cfg.mistakeChance * 0.01) {
    setBotState("IDLE", 0.25 + Math.random() * 0.35);
    executeCurrentBotState(cfg, distance);
    return;
  }

  if (playerIsAttacking && close) {
    if (Math.random() < cfg.blockChance) {
      setBotState("BLOCK", 0.35 + Math.random() * 0.25);
    } else {
      setBotState("RETREAT", 0.30 + Math.random() * 0.35);
    }
    p2.reactionTimer = cfg.reactionDelay * 0.45;
    executeCurrentBotState(cfg, distance);
    return;
  }

  if (playerWhiffed && close && p2.attackCooldown <= 0) {
    setBotState("PUNISH", 0.22);
    p2.reactionTimer = cfg.reactionDelay * 0.35;
    executeCurrentBotState(cfg, distance);
    return;
  }

  if (p2.decisionTimer <= 0 || p2.aiTimer <= 0) {
    p2.decisionTimer = cfg.reactionDelay + Math.random() * 0.25;

    if (lowHp && Math.random() < 0.45) {
      setBotState("RETREAT", 0.45 + Math.random() * 0.35);
    } else if (far) {
      setBotState("APPROACH", 0.45 + Math.random() * 0.45);
    } else if (veryClose && Math.random() < cfg.retreatChance) {
      setBotState("RETREAT", 0.28 + Math.random() * 0.35);
    } else if (close && p2.attackCooldown <= 0 && Math.random() < cfg.attackChance) {
      setBotState("ATTACK", 0.20);
    } else if (close && Math.random() < 0.25) {
      setBotState("BLOCK", 0.25 + Math.random() * 0.25);
    } else if (distance > 105) {
      setBotState("APPROACH", 0.25 + Math.random() * 0.25);
    } else {
      setBotState("IDLE", 0.20 + Math.random() * 0.35);
    }
  }

  executeCurrentBotState(cfg, distance);
}

function setBotState(state, duration) {
  p2.aiState = state;
  p2.aiTimer = duration;
}

function executeCurrentBotState(cfg, distance) {
  const directionToPlayer = p2.x > p1.x ? -1 : 1;
  const awayFromPlayer = -directionToPlayer;

  if (p2.aiState === "APPROACH") {
    p2.vx = directionToPlayer * cfg.moveSpeed;
    if (distance < 105) p2.vx = 0;
    return;
  }

  if (p2.aiState === "RETREAT") {
    p2.vx = awayFromPlayer * cfg.moveSpeed;
    p2.block = Math.random() < 0.25;
    return;
  }

  if (p2.aiState === "BLOCK") {
    p2.block = true;
    p2.vx = 0;
    return;
  }

  if (p2.aiState === "PUNISH") {
    p2.vx = 0;
    attack(p2, p1, Math.round(13 * cfg.damageMultiplier), 100, "punish");
    setBotState("IDLE", 0.25);
    return;
  }

  if (p2.aiState === "ATTACK") {
    p2.vx = 0;

    if (distance > 115) {
      setBotState("APPROACH", 0.25);
      return;
    }

    const useKick = Math.random() < 0.42;
    const damage = Math.round((useKick ? 12 : 8) * cfg.damageMultiplier);
    const range = useKick ? 105 : 88;

    attack(p2, p1, damage, range, useKick ? "kick" : "punch");
    setBotState("IDLE", 0.35 + Math.random() * 0.25);
    return;
  }

  p2.vx = 0;
}

function attack(attacker, defender, damage, range, attackType) {
  if (attacker.attackCooldown > 0 || gameOver) return false;

  attacker.attackCooldown = attackType === "kick" ? 0.55 : 0.42;
  attacker.isAttacking = true;
  attacker.attackTimer = 0.18;

  const attackerEl = attacker === p1 ? p1El : p2El;
  attackerEl.classList.add("attacking");
  setTimeout(() => attackerEl.classList.remove("attacking"), 160);

  const aCenter = attacker.x + 37;
  const dCenter = defender.x + 37;
  const sameHeight = Math.abs(attacker.y - defender.y) < 85;
  const facingTarget = attacker.facing === 1 ? dCenter > aCenter : dCenter < aCenter;
  const inRange = Math.abs(dCenter - aCenter) <= range;

  if (sameHeight && facingTarget && inRange) {
    const finalDamage = defender.block ? Math.ceil(damage * 0.25) : damage;

    defender.hp = clamp(defender.hp - finalDamage, 0, 100);
    defender.vx += attacker.facing * 140;

    flash(defender === p1 ? p1El : p2El);
    messageEl.textContent = defender.block ? "Blocked!" : `${attackType.toUpperCase()} hit!`;

    if (defender.hp <= 0) {
      endGame(attacker === p1 ? "Blue wins!" : "Red wins!");
    }

    return true;
  }

  attacker.whiffTimer = 0.38;
  messageEl.textContent = "Miss!";
  return false;
}

function flash(el) {
  el.classList.add("hit");
  setTimeout(() => el.classList.remove("hit"), 120);
}

function endGame(text) {
  gameOver = true;
  messageEl.textContent = text;
}

function updateHud() {
  p1HpEl.style.width = `${p1.hp}%`;
  p2HpEl.style.width = `${p2.hp}%`;
  timerEl.textContent = Math.ceil(timeLeft);
}

function render() {
  p1El.style.transform = `translate(${p1.x}px, ${-p1.y}px) scaleX(${p1.facing})`;
  p2El.style.transform = `translate(${p2.x}px, ${-p2.y}px) scaleX(${p2.facing})`;

  p1El.classList.toggle("blocking", p1.block);
  p2El.classList.toggle("blocking", p2.block);
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  update(dt);
  requestAnimationFrame(loop);
}

function bindInput() {
  window.addEventListener("keydown", e => {
    if (e.repeat) return;

    const k = e.key.toLowerCase();

    if (k === "a") input.left = true;
    if (k === "d") input.right = true;
    if (k === "w") input.jump = true;
    if (k === "f") input.punch = true;
    if (k === "g") input.kick = true;
    if (k === "h") input.block = true;

    if (k === "1") {
      currentDifficulty = "easy";
      messageEl.textContent = "Difficulty: Easy";
    }

    if (k === "2") {
      currentDifficulty = "normal";
      messageEl.textContent = "Difficulty: Normal";
    }

    if (k === "3") {
      currentDifficulty = "hard";
      messageEl.textContent = "Difficulty: Hard";
    }
  });

  window.addEventListener("keyup", e => {
    const k = e.key.toLowerCase();

    if (k === "a") input.left = false;
    if (k === "d") input.right = false;
    if (k === "h") input.block = false;
  });

  document.querySelectorAll(".ctrl").forEach(btn => {
    const key = btn.dataset.input;

    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      input[key] = true;
      btn.classList.add("pressed");
      btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener("pointerup", e => {
      e.preventDefault();

      if (key !== "punch" && key !== "kick" && key !== "jump") {
        input[key] = false;
      }

      btn.classList.remove("pressed");
    });

    btn.addEventListener("pointercancel", () => {
      if (key !== "punch" && key !== "kick" && key !== "jump") {
        input[key] = false;
      }

      btn.classList.remove("pressed");
    });
  });

  document.getElementById("restart").addEventListener("click", resetGame);
}

bindInput();
resetGame();
requestAnimationFrame(loop);
