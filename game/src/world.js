// The game's rules and state, with no drawing and no browser in it. The
// player drifts around an arena collecting star shards while cinders chase,
// meteors fall on telegraphed spots and sparks zig-zag in. step() advances
// one fixed step and returns what happened as bit flags, so the caller can
// react (sounds, announcements, particles) without the world knowing about
// screens or speakers. Nothing here allocates after createWorld returns.
import {
  CINDER,
  COMBO,
  FIELD,
  LIVES,
  METEOR,
  PLAYER,
  POOL_SIZE,
  POWERUP,
  SHARD,
  SPARK,
  WAVE,
  WIN_SCORE,
} from './config.js';

export const KIND_CINDER = 0;
export const KIND_METEOR = 1;
export const KIND_SPARK = 2;
export const KIND_SHARD = 3;
export const KIND_POWERUP = 4;

export const EVENT_SHARD = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE = 8;
export const EVENT_WIN = 16;
export const EVENT_POWERUP = 32;
export const EVENT_DASH = 64;
export const EVENT_BLOCK = 128;

export const POWER_SHIELD = 0;
export const POWER_MAGNET = 1;
export const POWER_SLOW = 2;

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function overlapRadius(a, b) {
  const reach = a.radius + b.radius;
  return distanceSquared(a, b) < reach * reach;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    dashTime: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    invulnerable: 0,
    moving: false,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({
      active: false,
      kind: KIND_CINDER,
      x: 0,
      y: 0,
      radius: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      age: 0,
      telegraph: 0,
      targetX: 0,
      targetY: 0,
      power: POWER_SHIELD,
      phase: 0,
    });
  }
  const state = {
    player,
    items,
    score: 0,
    best: 0,
    lives: LIVES,
    wave: 1,
    elapsed: 0,
    shards: 0,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    lastPoints: 0,
    shield: false,
    magnet: 0,
    slow: 0,
    shardTimer: SHARD.interval,
    cinderTimer: CINDER.interval,
    meteorTimer: METEOR.interval,
    sparkTimer: SPARK.interval,
    powerupTimer: POWERUP.interval,
    powerupKind: POWER_SHIELD,
    won: false,
  };

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].active) return items[index];
    }
    return null;
  }

  function randomEdge() {
    const side = Math.floor(random() * 4);
    const margin = 24;
    if (side === 0) return { x: random() * FIELD.width, y: -margin };
    if (side === 1) return { x: FIELD.width + margin, y: random() * FIELD.height };
    if (side === 2) return { x: random() * FIELD.width, y: FIELD.height + margin };
    return { x: -margin, y: random() * FIELD.height };
  }

  function spawnShard() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_SHARD;
    item.radius = SHARD.radius;
    item.x = 40 + random() * (FIELD.width - 80);
    item.y = 40 + random() * (FIELD.height - 80);
    item.vx = (random() - 0.5) * SHARD.drift;
    item.vy = (random() - 0.5) * SHARD.drift;
    item.age = 0;
    item.phase = random() * Math.PI * 2;
  }

  function spawnCinder() {
    const item = freeItem();
    if (item === null) return;
    const at = randomEdge();
    item.active = true;
    item.kind = KIND_CINDER;
    item.radius = CINDER.radius;
    item.x = at.x;
    item.y = at.y;
    item.speed = CINDER.baseSpeed + CINDER.speedPerWave * (state.wave - 1);
    item.age = 0;
    item.phase = random() * Math.PI * 2;
  }

  function spawnMeteor() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_METEOR;
    item.radius = METEOR.radius;
    item.targetX = 60 + random() * (FIELD.width - 120);
    item.targetY = 60 + random() * (FIELD.height - 120);
    item.x = item.targetX;
    item.y = -METEOR.radius;
    item.telegraph = METEOR.fallTime;
    item.age = 0;
  }

  function spawnSpark() {
    const item = freeItem();
    if (item === null) return;
    const at = randomEdge();
    item.active = true;
    item.kind = KIND_SPARK;
    item.radius = SPARK.radius;
    item.x = at.x;
    item.y = at.y;
    item.speed = SPARK.baseSpeed + SPARK.speedPerWave * (state.wave - 1);
    item.age = 0;
    item.phase = random() * Math.PI * 2;
  }

  function spawnPowerup() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_POWERUP;
    item.radius = POWERUP.radius;
    item.x = 50 + random() * (FIELD.width - 100);
    item.y = 50 + random() * (FIELD.height - 100);
    item.power = state.powerupKind;
    state.powerupKind = (state.powerupKind + 1) % 3;
    item.age = 0;
  }

  function aliveCount(kind) {
    let count = 0;
    for (const item of items) if (item.active && item.kind === kind) count += 1;
    return count;
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.invulnerable = 0;
    player.moving = false;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.elapsed = 0;
    state.shards = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.bestCombo = 1;
    state.lastPoints = 0;
    state.shield = false;
    state.magnet = 0;
    state.slow = 0;
    state.shardTimer = 0.6;
    state.cinderTimer = 1.6;
    state.meteorTimer = 2.2;
    state.sparkTimer = 3;
    state.powerupTimer = POWERUP.interval;
    state.powerupKind = POWER_SHIELD;
    state.won = false;
    spawnShard();
    spawnShard();
    spawnShard();
  }

  function hurt(events) {
    if (state.shield) {
      state.shield = false;
      player.invulnerable = Math.max(player.invulnerable, 1);
      return events | EVENT_BLOCK;
    }
    state.lives -= 1;
    state.combo = 1;
    state.comboTimer = 0;
    player.invulnerable = PLAYER.invulnerable;
    events |= EVENT_HIT;
    if (state.lives <= 0) events |= EVENT_OVER;
    return events;
  }

  function dash(dx, dy) {
    if (player.dashCooldown > 0 || player.dashTime > 0) return false;
    if (dx === 0 && dy === 0) {
      dx = 0;
      dy = -1;
    }
    player.dashX = dx;
    player.dashY = dy;
    player.dashTime = PLAYER.dashTime;
    player.dashCooldown = PLAYER.dashCooldown;
    player.invulnerable = Math.max(player.invulnerable, PLAYER.dashTime + 0.05);
    return true;
  }

  /**
   * One fixed step. `direction` is a unit [x, y] pair (or [0, 0]).
   * `wantDash` asks for a dash in the movement direction. With `harmless`
   * set (the title screen's backdrop) things drift but nothing touches the
   * player and nothing scores.
   */
  function step(dt, direction, wantDash, harmless) {
    let events = 0;
    state.elapsed += dt;
    const wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
    if (wave !== state.wave) {
      state.wave = wave;
      events |= EVENT_WAVE;
    }
    const slowFactor = state.slow > 0 ? POWERUP.slowFactor : 1;
    if (state.magnet > 0) state.magnet = Math.max(0, state.magnet - dt);
    if (state.slow > 0) state.slow = Math.max(0, state.slow - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }

    // The player: a dash overrides steering while it lasts, then steering.
    player.moving = direction[0] !== 0 || direction[1] !== 0;
    if (wantDash && dash(direction[0], direction[1])) events |= EVENT_DASH;
    if (player.dashCooldown > 0) player.dashCooldown -= dt;
    if (player.dashTime > 0) {
      player.dashTime -= dt;
      player.x += player.dashX * PLAYER.dashSpeed * dt;
      player.y += player.dashY * PLAYER.dashSpeed * dt;
    } else if (player.moving) {
      player.x += direction[0] * PLAYER.speed * dt;
      player.y += direction[1] * PLAYER.speed * dt;
    }
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    // Spawning, paced by the wave.
    state.shardTimer -= dt;
    if (state.shardTimer <= 0 && aliveCount(KIND_SHARD) < SHARD.maxAlive) {
      spawnShard();
      state.shardTimer += SHARD.interval + random() * SHARD.intervalJitter;
    }
    state.cinderTimer -= dt;
    if (state.cinderTimer <= 0) {
      spawnCinder();
      const interval = Math.max(
        CINDER.minInterval,
        CINDER.interval * CINDER.intervalScale ** (state.wave - 1),
      );
      state.cinderTimer += interval;
    }
    if (state.wave >= METEOR.firstWave) {
      state.meteorTimer -= dt;
      if (state.meteorTimer <= 0) {
        spawnMeteor();
        const interval = Math.max(
          METEOR.minInterval,
          METEOR.interval * METEOR.intervalScale ** (state.wave - 1),
        );
        state.meteorTimer += interval;
      }
    }
    if (state.wave >= SPARK.firstWave) {
      state.sparkTimer -= dt;
      if (state.sparkTimer <= 0) {
        spawnSpark();
        const interval = Math.max(
          SPARK.minInterval,
          SPARK.interval * SPARK.intervalScale ** (state.wave - 1),
        );
        state.sparkTimer += interval;
      }
    }
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      spawnPowerup();
      state.powerupTimer += POWERUP.interval;
    }

    // Every live thing moves, then meets the player.
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.age += dt;
      if (item.kind === KIND_SHARD) {
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        if (item.x < item.radius || item.x > FIELD.width - item.radius) item.vx *= -1;
        if (item.y < item.radius || item.y > FIELD.height - item.radius) item.vy *= -1;
        if (state.magnet > 0) {
          const dx = player.x - item.x;
          const dy = player.y - item.y;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = 420 * (1 - Math.min(dist, 260) / 260);
          if (pull > 0) {
            item.x += (dx / dist) * pull * dt;
            item.y += (dy / dist) * pull * dt;
          }
        }
        if (harmless || !overlapRadius(item, player)) continue;
        item.active = false;
        state.shards += 1;
        state.lastPoints = SHARD.points * state.combo;
        state.score += state.lastPoints;
        state.combo = Math.min(COMBO.max, state.combo + 1);
        state.comboTimer = COMBO.window;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        events |= EVENT_SHARD;
        if (state.score >= WIN_SCORE && !state.won) {
          state.won = true;
          events |= EVENT_WIN;
        }
        continue;
      }
      if (item.kind === KIND_POWERUP) {
        if (harmless || !overlapRadius(item, player)) continue;
        item.active = false;
        if (item.power === POWER_SHIELD) state.shield = true;
        else if (item.power === POWER_MAGNET) state.magnet = POWERUP.magnetSeconds;
        else state.slow = POWERUP.slowSeconds;
        events |= EVENT_POWERUP;
        continue;
      }
      if (item.kind === KIND_CINDER) {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const dist = Math.hypot(dx, dy) || 1;
        const wobble = Math.sin(item.age * 2 + item.phase) * 0.35;
        const nx = dx / dist + -dy / dist * wobble;
        const ny = dy / dist + dx / dist * wobble;
        const norm = Math.hypot(nx, ny) || 1;
        const speed = item.speed * slowFactor;
        item.x += (nx / norm) * speed * dt;
        item.y += (ny / norm) * speed * dt;
        if (harmless || player.invulnerable > 0 || !overlapRadius(item, player)) continue;
        item.active = false;
        events = hurt(events);
        continue;
      }
      if (item.kind === KIND_SPARK) {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const dist = Math.hypot(dx, dy) || 1;
        const zig = Math.sin(item.age * SPARK.zigzag + item.phase);
        const nx = dx / dist + -dy / dist * zig * 0.6;
        const ny = dy / dist + dx / dist * zig * 0.6;
        const norm = Math.hypot(nx, ny) || 1;
        const speed = item.speed * slowFactor;
        item.x += (nx / norm) * speed * dt;
        item.y += (ny / norm) * speed * dt;
        if (item.x < -40 || item.x > FIELD.width + 40 || item.y < -40 || item.y > FIELD.height + 40) {
          item.active = false;
          continue;
        }
        if (harmless || player.invulnerable > 0 || !overlapRadius(item, player)) continue;
        item.active = false;
        events = hurt(events);
        continue;
      }
      if (item.kind === KIND_METEOR) {
        if (item.telegraph > 0) {
          item.telegraph -= dt;
          continue;
        }
        // The fall is instant once the telegraph ends: the blast is the
        // moment the meteor lands, and the player must already be clear.
        const blast = { x: item.targetX, y: item.targetY, radius: METEOR.blastRadius };
        item.active = false;
        if (!harmless && player.invulnerable === 0 && overlapRadius(blast, player)) {
          events = hurt(events);
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, dash };
}
