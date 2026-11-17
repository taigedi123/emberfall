// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, game over and victory.
//
// ?seed=N fixes the run's randomness. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LIVES, STEP, WIN_SCORE } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  EVENT_BLOCK,
  EVENT_DASH,
  EVENT_HIT,
  EVENT_OVER,
  EVENT_POWERUP,
  EVENT_SHARD,
  EVENT_WAVE,
  EVENT_WIN,
  POWER_MAGNET,
  POWER_SHIELD,
  POWER_SLOW,
  createWorld,
} from './world.js';
import { createParticles } from './particles.js';
import {
  ACTION_CONFIRM,
  ACTION_DASH,
  ACTION_MUTE,
  ACTION_PAUSE,
  createInput,
} from './input.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const particles = createParticles();
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, particles, audio.muted);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    particles.clear();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Reach ${WIN_SCORE} to win.`);
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.win();
      announce(`You win! Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.gameOver();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && screen !== SCREEN_PLAY && screen !== SCREEN_PAUSED) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function react(events) {
    const state = world.state;
    if (events & EVENT_SHARD) {
      audio.pickup(state.combo);
      particles.burst(state.player.x, state.player.y, '#ffd166', 8, 120);
      particles.floatText(state.player.x, state.player.y - 24, `+${state.lastPoints}`, '#ffd166', 15);
    }
    if (events & EVENT_BLOCK) {
      audio.powerup();
      renderer.addShake(4);
      particles.ring(state.player.x, state.player.y, '#6cc7ff');
      particles.floatText(state.player.x, state.player.y - 30, 'Shield blocked it!', '#6cc7ff', 17);
      announce('Shield blocked a hit.');
    }
    if (events & EVENT_DASH) {
      audio.dash();
      particles.burst(state.player.x, state.player.y, '#ff9a3c', 10, 200);
    }
    if (events & EVENT_POWERUP) {
      audio.powerup();
      const label = state.shield ? 'Shield!' : state.magnet > 0 ? 'Magnet!' : 'Slow-Time!';
      particles.floatText(state.player.x, state.player.y - 30, label, '#6cc7ff', 18);
      particles.ring(state.player.x, state.player.y, '#6cc7ff');
    }
    if (events & EVENT_WAVE) {
      audio.wave();
      announce(`Wave ${state.wave}.`);
      particles.floatText(state.player.x, state.player.y - 44, `Wave ${state.wave}`, '#f5f0ff', 22);
    }
    if (events & EVENT_HIT) {
      audio.hit();
      renderer.addShake(9);
      particles.burst(state.player.x, state.player.y, '#ff5d73', 22, 240);
      if (!(events & EVENT_OVER)) {
        announce(state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${state.lives} lives left.`);
      }
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function step(frameActions, firstStep) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, [0, 0], false, true);
      particles.step(STEP);
      return;
    }
    const direction = input.direction();
    const wantDash = firstStep && Boolean(frameActions & ACTION_DASH);
    const events = world.step(STEP, direction, wantDash, false);
    particles.step(STEP);
    react(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Actions are taken once per frame and shared: handleActions owns the
    // screen keys, the first fixed step owns the dash, so a press is never
    // eaten by one reader before the other sees it.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions, firstStep);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, particles, audio.muted);
  }

  // Leaving the tab pauses a running game rather than letting things fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });
  // A click anywhere also unlocks sound, so the first pickup is heard.
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  announce('Emberfall. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
