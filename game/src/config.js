// Emberfall — tuning constants. One place for every number the world and the
// renderer agree on, so balancing is editing values here, not hunting literals.
export const FIELD = { width: 960, height: 600 };

export const STEP = 1 / 60;
export const BEST_KEY = 'emberfall.best';
export const MUTE_KEY = 'emberfall.muted';

// The player: a small ember spirit. Fast enough to outrun a cinder, slow
// enough that a meteor's telegraph still matters.
export const PLAYER = {
  radius: 14,
  speed: 265,
  dashSpeed: 640,
  dashTime: 0.22,
  dashCooldown: 1.5,
  invulnerable: 1.6,
};

// Waves last this long; clearing wave 10 is not the win — the win is the
// score target below. Waves only set the pressure.
export const WAVE = { seconds: 15, max: 10 };
export const WIN_SCORE = 5000;
export const LIVES = 3;

// Star shards: the points. A pickup is worth SHARD.points times the combo
// multiplier, which climbs while pickups keep coming and falls away when
// they stop. COMBO.window is how long the chain stays alive between pickups.
export const SHARD = {
  radius: 9,
  points: 20,
  interval: 1.15,
  intervalJitter: 0.7,
  maxAlive: 7,
  drift: 26,
};
export const COMBO = { window: 3.5, max: 8 };

// Enemies. Cinders chase, meteors fall on a telegraphed spot, sparks zig-zag
// once the game has warmed up. Spawn pacing tightens every wave.
export const CINDER = {
  radius: 15,
  baseSpeed: 62,
  speedPerWave: 11,
  interval: 2.4,
  intervalScale: 0.88,
  minInterval: 0.9,
  turn: 2.6,
};
export const METEOR = {
  radius: 17,
  interval: 3.4,
  intervalScale: 0.9,
  minInterval: 1.7,
  fallTime: 0.85,
  blastRadius: 54,
  firstWave: 2,
};
export const SPARK = {
  radius: 10,
  baseSpeed: 150,
  speedPerWave: 9,
  interval: 3.1,
  intervalScale: 0.9,
  minInterval: 1.5,
  firstWave: 3,
  zigzag: 3.2,
};

// Power-ups drop on a timer, one at a time, cycling through the three kinds.
export const POWERUP = {
  radius: 13,
  interval: 16,
  magnetSeconds: 8,
  slowSeconds: 5,
  slowFactor: 0.5,
};

export const POOL_SIZE = 160;
