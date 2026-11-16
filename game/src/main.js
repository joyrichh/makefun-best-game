// Bloom Rush — bootstrap and game loop. Owns the screen state machine
// (title / playing / paused / day-clear / game-over), routes clicks and
// keys, and drives the world one frame at a time. Rendering lives in
// render.js; the garden's rules live in world.js.
import { CANVAS_H, CANVAS_W } from './config.js';
import { makeRng } from './random.js';
import { SoundBank } from './audio.js';
import { Particles } from './particles.js';
import { Input } from './input.js';
import { World } from './world.js';
import { drawScene, screenButtons } from './render.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || Date.now() % 2147483647);

const sounds = new SoundBank();
const particles = new Particles();
const input = new Input(canvas);
let world = new World(makeRng(seed), sounds, particles);

let screen = 'title';
let frozen = false; // screenshot mode: render the arranged state, never advance it
let last = performance.now();
let uiTime = 0;

if (shotName) {
  frozen = true;
  if (shotName === 'start') {
    screen = 'title';
  } else if (shotName === 'play' || shotName === 'combo') {
    setupShot(world, shotName);
    screen = 'playing';
  } else if (shotName === 'win') {
    setupShot(world, 'win');
    screen = 'dayclear';
  }
}

function newRun() {
  world = new World(makeRng((Date.now() % 2147483647) || 1), sounds, particles);
  screen = 'playing';
}

function hitButton(id) {
  const buttons = screenButtons(screen === 'playing' ? 'playing' : screen);
  const h = input.hover;
  return buttons.find((b) => b.id === id && h.x >= b.x && h.x <= b.x + b.w && h.y >= b.y && h.y <= b.y + b.h);
}

function handleClicks() {
  for (const c of input.takeClicks()) {
    sounds.ensure();
    input.hover.x = c.x;
    input.hover.y = c.y;
    if (frozen) continue;
    if (screen === 'title') {
      if (hitButton('start')) {
        sounds.click();
        screen = 'playing';
      } else if (hitButton('mute')) {
        sounds.toggleMute();
      }
      continue;
    }
    if (screen === 'playing') {
      if (hitButton('mute')) {
        sounds.toggleMute();
        continue;
      }
      world.handleClick(c.x, c.y);
      continue;
    }
    if (screen === 'paused') {
      if (hitButton('resume')) screen = 'playing';
      else if (hitButton('restart')) newRun();
      continue;
    }
    if (screen === 'dayclear') {
      if (hitButton('next')) {
        sounds.click();
        world.startDay(world.day + 1);
        screen = 'playing';
      }
      continue;
    }
    if (screen === 'over') {
      if (hitButton('again')) {
        sounds.click();
        newRun();
      }
    }
  }
}

function handleKeys() {
  if (input.wasPressed('m')) sounds.toggleMute();
  if (input.wasPressed(' ')) {
    if (screen === 'playing') screen = 'paused';
    else if (screen === 'paused') screen = 'playing';
  }
  if (input.wasPressed('r')) {
    if (screen === 'playing' || screen === 'paused' || screen === 'over') newRun();
  }
  if (input.wasPressed('enter')) {
    if (screen === 'title') {
      sounds.ensure();
      sounds.click();
      screen = 'playing';
    } else if (screen === 'dayclear') {
      world.startDay(world.day + 1);
      screen = 'playing';
    } else if (screen === 'over') {
      newRun();
    }
  }
  if (input.wasPressed('escape') && screen === 'paused') screen = 'playing';
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  uiTime += dt;
  handleKeys();
  handleClicks();
  if (!frozen) {
    if (screen === 'playing') {
      world.update(dt);
      particles.update(dt);
      if (world.status === 'dayclear') screen = 'dayclear';
      else if (world.status === 'over') screen = 'over';
    } else if (screen === 'title' || screen === 'paused') {
      particles.update(dt);
    }
  }
  drawScene(ctx, world, { screen, hover: input.hover, muted: sounds.muted, time: uiTime });
  input.endFrame();
  requestAnimationFrame(frame);
}

// A handle for play-testing: the test driver reads state and pokes the
// world without touching the DOM.
window.__bloom = {
  get world() {
    return world;
  },
  get screen() {
    return screen;
  },
  setScreen(s) {
    screen = s;
  },
  start() {
    screen = 'playing';
  },
  click(x, y) {
    input.clicks.push({ x, y });
  },
  canvas,
};

requestAnimationFrame(frame);
