// Staged scenes for the screenshots: ?shot=start|play|end (with &seed=N)
// paints one frozen moment instead of running the loop, twice, then sets
// window.__shotReady. The scenes are built from the real world — same
// spawn code, same renderer — only arranged, never faked with other art.
import { FIELD } from './config.js';
import { KIND_CINDER, KIND_METEOR, KIND_SHARD, KIND_SPARK } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function place(state, kind, x, y, extra = {}) {
  for (const item of state.items) {
    if (item.active) continue;
    Object.assign(item, { active: true, kind, x, y, radius: 14, age: 0.5, phase: 0.7 }, extra);
    return item;
  }
  return null;
}

export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'start') {
    // A quiet drift behind the title: shards and one cinder, nothing scored.
    place(state, KIND_SHARD, 180, 150, { radius: 9 });
    place(state, KIND_SHARD, 760, 420, { radius: 9 });
    place(state, KIND_SHARD, 480, 110, { radius: 9 });
    place(state, KIND_CINDER, 700, 180, { radius: 15, speed: 60 });
    place(state, KIND_CINDER, 240, 430, { radius: 15, speed: 60 });
    state.player.x = FIELD.width / 2;
    state.player.y = FIELD.height / 2 + 60;
    return { screen: SCREEN_TITLE, best: 1240 };
  }
  if (name === 'play') {
    // Mid-game, wave 3, a combo running: shards to chase, a cinder closing
    // in, a spark crossing, a meteor warning blooming.
    state.score = 1240;
    state.wave = 3;
    state.elapsed = 32;
    state.combo = 5;
    state.comboTimer = 2.4;
    state.bestCombo = 6;
    state.shards = 41;
    state.lives = 3;
    state.shield = true;
    place(state, KIND_SHARD, 300, 200, { radius: 9 });
    place(state, KIND_SHARD, 380, 260, { radius: 9 });
    place(state, KIND_SHARD, 640, 380, { radius: 9 });
    place(state, KIND_SHARD, 520, 150, { radius: 9 });
    place(state, KIND_CINDER, 620, 210, { radius: 15, speed: 84 });
    place(state, KIND_CINDER, 250, 420, { radius: 15, speed: 84 });
    place(state, KIND_SPARK, 820, 120, { radius: 10, speed: 168 });
    place(state, KIND_METEOR, 0, 0, {
      radius: 17,
      targetX: 480,
      targetY: 460,
      telegraph: 0.3,
    });
    state.player.x = 430;
    state.player.y = 300;
    return { screen: SCREEN_PLAY, best: 1240 };
  }
  // end: the run is over — no lives left, the field still burning.
  state.score = 2890;
  state.wave = 5;
  state.elapsed = 74;
  state.shards = 96;
  state.bestCombo = 7;
  state.lives = 0;
  place(state, KIND_SHARD, 200, 180, { radius: 9 });
  place(state, KIND_CINDER, 700, 200, { radius: 15, speed: 106 });
  place(state, KIND_CINDER, 300, 440, { radius: 15, speed: 106 });
  state.player.x = FIELD.width / 2;
  state.player.y = FIELD.height / 2;
  return { screen: SCREEN_OVER, best: 2890 };
}
