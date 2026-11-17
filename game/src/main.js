// Boot and main loop: canvas scaling, the screen flow (title → play ⇄ upgrades → results → again),
// fixed-step simulation, and wiring game events to sound and music.
import { STEP, VIEW, LAST_WAVE } from './config.js';
import { createInput } from './input.js';
import { createGame, pickUpgrade, stepGame } from './world.js';
import { drawWorld } from './renderWorld.js';
import { cardRects, drawHud, drawPause, drawResults, drawTitle, drawUpgradeScreen } from './renderUi.js';
import { playEvents, playSound, toggleMute, unlockAudio } from './audio.js';
import { playMusic } from './music.js';
import { loadBest, saveBest } from './storage.js';
import { buildShotScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
let scale = 1;
let offsetX = 0;
let offsetY = 0;

/** Fit the 1280×720 view into the window, letterboxed, sharp on high-DPI screens. */
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
  offsetX = (canvas.width - VIEW.width * scale) / 2;
  offsetY = (canvas.height - VIEW.height * scale) / 2;
}
window.addEventListener('resize', resize);
resize();

const toLogical = (clientX, clientY) => {
  const dpr = window.devicePixelRatio || 1;
  return { x: (clientX * dpr - offsetX) / scale, y: (clientY * dpr - offsetY) / scale };
};

const input = createInput(canvas, toLogical);
const app = { screen: 'title', game: null, paused: false, best: loadBest(), newBest: false, clock: 0 };

function announce(text) {
  if (status.textContent !== text) status.textContent = text;
}

function startRun() {
  unlockAudio();
  playSound('start');
  app.game = createGame((Date.now() & 0xffffff) ^ 0x5eed);
  app.screen = 'game';
  app.paused = false;
  app.newBest = false;
}

function finishRun() {
  const g = app.game;
  if (g.score > app.best) {
    app.best = g.score;
    app.newBest = true;
    saveBest(g.score);
  }
}

function hoveredCard() {
  const { x, y } = input.mouse;
  return cardRects().findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y - 14 && y <= r.y + r.h);
}

/** Read this frame's keys and clicks for whichever screen is up. */
function handleInput() {
  if (input.pressed('KeyM')) { unlockAudio(); toggleMute(); }
  if (app.screen === 'title') {
    if (input.clicked() || input.pressed('Enter', 'Space')) startRun();
    return;
  }
  const g = app.game;
  if (g.mode === 'play' && input.pressed('KeyP', 'Escape')) { app.paused = !app.paused; playSound('click'); }
  if (app.paused) {
    if (input.pressed('KeyQ')) { app.screen = 'title'; app.paused = false; }
    input.clicked();
    return;
  }
  if (g.mode === 'upgrade') {
    let pick = -1;
    if (input.pressed('Digit1', 'Numpad1')) pick = 0;
    if (input.pressed('Digit2', 'Numpad2')) pick = 1;
    if (input.pressed('Digit3', 'Numpad3')) pick = 2;
    if (input.clicked() && g.modeTime > 0.35) pick = hoveredCard();
    if (pick >= 0) pickUpgrade(g, pick);
  } else if (g.mode === 'victory' || g.mode === 'defeat') {
    const again = input.clicked() || input.pressed('Enter', 'Space', 'KeyR');
    if (again && g.modeTime > 0.8) startRun();
    if (input.pressed('Escape')) app.screen = 'title';
  }
}

function musicFor() {
  if (app.screen === 'title') return 'title';
  const g = app.game;
  if (g.mode === 'victory' || g.mode === 'defeat') return 'title';
  return g.wave >= LAST_WAVE ? 'boss' : 'play';
}

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  app.clock += dt;
  handleInput();

  if (app.screen === 'game' && !app.paused) {
    const g = app.game;
    acc += dt;
    const controls = input.controls();
    while (acc >= STEP) {
      const before = g.mode;
      stepGame(g, controls, STEP);
      controls.dash = false;
      if (before !== g.mode && (g.mode === 'victory' || g.mode === 'defeat')) finishRun();
      acc -= STEP;
    }
    playEvents(g.events);
    g.events.length = 0;
  } else {
    acc = 0;
  }
  input.endFrame();
  playMusic(musicFor());
  render();
  requestAnimationFrame(frame);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#3a1440';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIEW.width, VIEW.height);
  ctx.clip();
  drawScreen(ctx, app.screen, app.game, app.clock, { paused: app.paused, best: app.best, newBest: app.newBest, hover: app.game && app.game.mode === 'upgrade' ? hoveredCard() : -1 });
  ctx.restore();
}

/** Draw one whole screen; shared with the screenshot scenes. */
export function drawScreen(context, screen, game, time, ui) {
  if (screen === 'title') {
    drawTitle(context, time, ui.best);
    announce('Gumdrop Gauntlet. Click or press Enter to start.');
    return;
  }
  drawWorld(context, game, time);
  if (game.mode === 'play' || game.mode === 'outro' || game.mode === 'upgrade') drawHud(context, game, time);
  if (game.mode === 'upgrade') {
    drawUpgradeScreen(context, game, time, ui.hover);
    announce(`Wave ${game.wave} cleared. Pick an upgrade with 1, 2 or 3.`);
  } else if (game.mode === 'victory' || game.mode === 'defeat') {
    drawResults(context, game, time, ui.best, ui.newBest);
    announce(`${game.mode === 'victory' ? 'Victory' : 'Defeat'}. Score ${game.score}. Click or press Enter to play again.`);
  } else {
    announce(`Wave ${game.wave}. Hearts ${game.player.hp}. Score ${game.score}.`);
  }
  if (ui.paused) drawPause(context);
}

// ?debug exposes the app state so tools/playtest.mjs can steer real inputs from it.
if (new URLSearchParams(window.location.search).has('debug')) window.gumdropDebug = app;

const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) {
  const scene = buildShotScene(shot, Number(new URLSearchParams(window.location.search).get('seed') || 1));
  const paint = () => {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#3a1440';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawScreen(ctx, scene.screen, scene.game, scene.time, scene.ui);
    document.body.dataset.shotReady = 'yes';
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint); else paint();
} else {
  requestAnimationFrame(frame);
}
