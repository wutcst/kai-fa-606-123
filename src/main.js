import { createBeatAudio } from './game/audio.js';
import { createGame, resizeGame, triggerBomb, updateGame } from './game/game.js';
import { renderGame } from './game/render.js';
import { loadSaveData, saveDifficulty, saveRunRecord } from './game/storage.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const comboEl = document.querySelector('#combo');
const killsEl = document.querySelector('#kills');
const hpBar = document.querySelector('#hpBar');
const bombBar = document.querySelector('#bombBar');
const bombButton = document.querySelector('#bombButton');
const statusPanel = document.querySelector('#statusPanel');
const statusTitle = document.querySelector('#statusTitle');
const statusText = document.querySelector('#statusText');
const restartButton = document.querySelector('#restartButton');
const difficultyButtons = [...document.querySelectorAll('[data-difficulty]')];
const bestRecordEl = document.querySelector('#bestRecord');

let saveData = loadSaveData();
let currentDifficulty = saveData.difficulty;
let game = createGame(1280, 720, { difficulty: currentDifficulty });
let last = performance.now();
let paused = false;
let recordedGameOver = false;
const audio = createBeatAudio({ bpm: 174 });
const hudCache = {
  score: '',
  combo: '',
  kills: '',
  hp: '',
  bomb: '',
  disabled: null,
  panel: '',
  record: '',
  difficulty: '',
};
const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  pointerActive: false,
  pointerX: 0,
  pointerY: 0,
};

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
  const width = Math.floor(window.innerWidth * ratio);
  const height = Math.floor(window.innerHeight * ratio);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  resizeGame(game, window.innerWidth, window.innerHeight);
}

function restart() {
  game = createGame(window.innerWidth, window.innerHeight, { difficulty: currentDifficulty });
  paused = false;
  recordedGameOver = false;
  hudCache.panel = '';
  statusPanel.hidden = true;
  last = performance.now();
}

function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  if (!paused) updateGame(game, input, dt);
  audio.update(game.audioEvents.splice(0));
  renderGame(ctx, game);
  syncHud();
  requestAnimationFrame(loop);
}

function syncHud() {
  syncDifficultyHud();
  const score = Math.floor(game.score).toLocaleString('en-US');
  const combo = game.combo > 0 ? `x${game.combo}` : '0';
  const kills = String(game.kills);
  const hp = `scaleX(${Math.max(0, game.player.stats.hp / game.player.stats.maxHp)})`;
  const bomb = `scaleX(${Math.max(0, game.player.stats.bombCharge)})`;
  const disabled = game.player.stats.bombCharge < 1 || game.mode !== 'playing';

  if (hudCache.score !== score) {
    hudCache.score = score;
    scoreEl.textContent = score;
  }
  if (hudCache.combo !== combo) {
    hudCache.combo = combo;
    comboEl.textContent = combo;
  }
  if (hudCache.kills !== kills) {
    hudCache.kills = kills;
    killsEl.textContent = kills;
  }
  if (hudCache.hp !== hp) {
    hudCache.hp = hp;
    hpBar.style.transform = hp;
  }
  if (hudCache.bomb !== bomb) {
    hudCache.bomb = bomb;
    bombBar.style.transform = bomb;
  }
  if (hudCache.disabled !== disabled) {
    hudCache.disabled = disabled;
    bombButton.disabled = disabled;
  }

  if (paused) {
    if (hudCache.panel !== 'paused') {
      hudCache.panel = 'paused';
      statusTitle.textContent = 'PAUSED';
    }
    statusText.textContent = `SCORE ${Math.floor(game.score).toLocaleString('en-US')}`;
    statusPanel.hidden = false;
  } else if (game.mode === 'gameover') {
    if (!recordedGameOver) {
      saveData = saveRunRecord(window.localStorage, {
        difficulty: currentDifficulty,
        score: game.score,
        kills: game.kills,
      });
      recordedGameOver = true;
      hudCache.record = '';
    }
    if (hudCache.panel !== 'gameover') {
      hudCache.panel = 'gameover';
      statusTitle.textContent = 'GAME OVER';
    }
    statusText.textContent = `SCORE ${Math.floor(game.score).toLocaleString('en-US')} / KILLS ${game.kills}`;
    statusPanel.hidden = false;
  } else {
    if (hudCache.panel !== 'playing') {
      hudCache.panel = 'playing';
      statusPanel.hidden = true;
    }
  }
}

function syncDifficultyHud() {
  if (hudCache.difficulty !== currentDifficulty) {
    hudCache.difficulty = currentDifficulty;
    for (const button of difficultyButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.difficulty === currentDifficulty));
    }
  }

  const record = saveData.records[currentDifficulty] || saveData.records.normal;
  const bestScore = Math.floor(record.bestScore).toLocaleString('en-US');
  const best = `${bestScore} / ${record.bestKills}`;
  if (hudCache.record !== best) {
    hudCache.record = best;
    bestRecordEl.textContent = best;
  }
}

function setKey(code, value) {
  if (code === 'ArrowUp' || code === 'KeyW') input.up = value;
  if (code === 'ArrowDown' || code === 'KeyS') input.down = value;
  if (code === 'ArrowLeft' || code === 'KeyA') input.left = value;
  if (code === 'ArrowRight' || code === 'KeyD') input.right = value;
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  audio.unlock();
  setKey(event.code, true);
  if (event.code === 'Space') {
    event.preventDefault();
    triggerBomb(game);
  }
  if (event.code === 'KeyP') paused = !paused;
  if (event.code === 'KeyR' || event.code === 'Enter') {
    if (game.mode === 'gameover' || paused) restart();
  }
});
window.addEventListener('keyup', (event) => setKey(event.code, false));

canvas.addEventListener('pointerdown', (event) => {
  audio.unlock();
  input.pointerActive = true;
  input.pointerX = event.clientX;
  input.pointerY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!input.pointerActive) return;
  input.pointerX = event.clientX;
  input.pointerY = event.clientY;
});
canvas.addEventListener('pointerup', () => {
  input.pointerActive = false;
});

bombButton.addEventListener('click', () => {
  audio.unlock();
  triggerBomb(game);
});
restartButton.addEventListener('click', () => {
  audio.unlock();
  restart();
});

for (const button of difficultyButtons) {
  button.addEventListener('click', () => {
    audio.unlock();
    const nextDifficulty = button.dataset.difficulty;
    if (nextDifficulty === currentDifficulty) return;

    saveData = saveDifficulty(window.localStorage, nextDifficulty);
    currentDifficulty = saveData.difficulty;
    restart();
  });
}

resize();
syncDifficultyHud();
requestAnimationFrame(loop);
