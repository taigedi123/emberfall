// Everything the eye sees: the arena, the ember spirit, its enemies and
// pickups, the HUD and the four screens. Drawing only — it never changes the
// world, it only reads state, particles and the screen it is asked to paint.
import { FIELD, METEOR, POWERUP, SHARD, WIN_SCORE } from './config.js';
import {
  KIND_CINDER,
  KIND_METEOR,
  KIND_POWERUP,
  KIND_SHARD,
  KIND_SPARK,
  POWER_MAGNET,
  POWER_SHIELD,
  POWER_SLOW,
} from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_WIN = 4;

const BG_TOP = '#0b1026';
const BG_BOTTOM = '#1b0f2e';
const INK = '#f5f0ff';
const DIM = '#b9aed6';
const GOLD = '#ffd166';
const EMBER = '#ff7a3c';
const ROSE = '#ff5d73';
const MINT = '#5df2c0';
const SKY = '#6cc7ff';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function star(ctx, x, y, radius, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heart(ctx, x, y, size, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.9);
  ctx.bezierCurveTo(x - size * 1.2, y + size * 0.1, x - size * 0.7, y - size * 0.9, x, y - size * 0.25);
  ctx.bezierCurveTo(x + size * 0.7, y - size * 0.9, x + size * 1.2, y + size * 0.1, x, y + size * 0.9);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const scale = window.devicePixelRatio > 1 ? 2 : 1;
  canvas.width = FIELD.width * scale;
  canvas.height = FIELD.height * scale;
  canvas.style.width = `${FIELD.width}px`;
  canvas.style.height = `${FIELD.height}px`;
  ctx.scale(scale, scale);

  // Fixed background stars, placed once so they never twinkle-jump.
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: (i * 137.5) % FIELD.width,
      y: (i * 89.3) % FIELD.height,
      r: 0.6 + ((i * 7) % 10) / 10,
      phase: (i * 0.7) % (Math.PI * 2),
    });
  }

  let shake = 0;
  let time = 0;

  function addShake(amount) {
    shake = Math.min(14, shake + amount);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, BG_TOP);
    gradient.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const s of stars) {
      const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#cfd8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255, 122, 60, 0.16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, FIELD.width - 8, FIELD.height - 8);
  }

  function drawShard(item) {
    const twinkle = 0.75 + 0.25 * Math.sin(item.age * 4 + item.phase);
    ctx.save();
    ctx.globalAlpha = twinkle;
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 12;
    ctx.fillStyle = GOLD;
    star(ctx, item.x, item.y, item.radius + 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3c4';
    star(ctx, item.x, item.y, item.radius * 0.45);
    ctx.fill();
  }

  function drawPowerup(item) {
    const bob = Math.sin(item.age * 3) * 3;
    const y = item.y + bob;
    ctx.save();
    ctx.shadowColor = item.power === POWER_SHIELD ? SKY : item.power === POWER_MAGNET ? ROSE : MINT;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#241b3d';
    ctx.strokeStyle = ctx.shadowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(item.x, y, item.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = ctx.shadowColor;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = item.power === POWER_SHIELD ? 'S' : item.power === POWER_MAGNET ? 'M' : 'T';
    ctx.fillText(glyph, item.x, y + 0.5);
  }

  function drawCinder(item) {
    const wobble = Math.sin(item.age * 5 + item.phase) * 2;
    ctx.save();
    ctx.shadowColor = ROSE;
    ctx.shadowBlur = 16;
    const gradient = ctx.createRadialGradient(
      item.x,
      item.y - 4,
      2,
      item.x,
      item.y,
      item.radius + 4,
    );
    gradient.addColorStop(0, '#ff8fa0');
    gradient.addColorStop(0.55, '#e33e5f');
    gradient.addColorStop(1, '#7a1030');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(item.x, item.y + wobble * 0.4, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Two eyes, always looking at the player — it is chasing, after all.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(item.x - 5, item.y - 3 + wobble * 0.4, 3.2, 0, Math.PI * 2);
    ctx.arc(item.x + 5, item.y - 3 + wobble * 0.4, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0b12';
    ctx.beginPath();
    ctx.arc(item.x - 5, item.y - 3 + wobble * 0.4, 1.5, 0, Math.PI * 2);
    ctx.arc(item.x + 5, item.y - 3 + wobble * 0.4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpark(item) {
    const flicker = 0.7 + 0.3 * Math.sin(item.age * 14);
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#f3e8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.x - 5, item.y);
    ctx.lineTo(item.x + 5, item.y);
    ctx.moveTo(item.x, item.y - 5);
    ctx.lineTo(item.x, item.y + 5);
    ctx.stroke();
  }

  function drawMeteor(item) {
    // While the telegraph runs, only the warning shows: a pulsing ring on
    // the ground where the blast will land. The rock itself appears at the
    // last instant, so the warning is the whole mechanic.
    const progress = 1 - item.telegraph / METEOR.fallTime;
    const pulse = 0.5 + 0.5 * Math.sin(time * 18);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * pulse;
    ctx.strokeStyle = ROSE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(item.targetX, item.targetY, METEOR.blastRadius * (0.35 + 0.65 * progress), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.12 + 0.1 * pulse;
    ctx.fillStyle = ROSE;
    ctx.beginPath();
    ctx.arc(item.targetX, item.targetY, METEOR.blastRadius * (0.35 + 0.65 * progress), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (progress > 0.75) {
      ctx.save();
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ff9d00';
      ctx.beginPath();
      ctx.arc(item.targetX, item.targetY - 30, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = ROSE;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', item.targetX, item.targetY - METEOR.blastRadius - 8);
  }

  function drawPlayer(player, state) {
    const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    const dashing = player.dashTime > 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    ctx.shadowColor = EMBER;
    ctx.shadowBlur = dashing ? 30 : 18;
    const gradient = ctx.createRadialGradient(
      player.x,
      player.y - 4,
      2,
      player.x,
      player.y,
      player.radius + 8,
    );
    gradient.addColorStop(0, '#ffe08a');
    gradient.addColorStop(0.5, '#ff9a3c');
    gradient.addColorStop(1, '#e2481f');
    ctx.fillStyle = gradient;
    // A teardrop flame: a circle with a flickering tip that leans into motion.
    ctx.beginPath();
    const lean = player.moving ? 4 : 0;
    ctx.moveTo(player.x + lean, player.y - player.radius - 6 - Math.sin(time * 9) * 2);
    ctx.quadraticCurveTo(player.x + player.radius, player.y - 2, player.x, player.y + player.radius);
    ctx.quadraticCurveTo(player.x - player.radius, player.y - 2, player.x + lean, player.y - player.radius - 6 - Math.sin(time * 9) * 2);
    ctx.fill();
    ctx.restore();
    // Eyes.
    ctx.fillStyle = '#2b0d02';
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y - 1, 2.4, 0, Math.PI * 2);
    ctx.arc(player.x + 5, player.y - 1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (state.shield) {
      ctx.save();
      ctx.strokeStyle = SKY;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = SKY;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (dashing) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x - player.dashX * 26, player.y - player.dashY * 26);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(particles) {
    for (const part of particles.parts) {
      if (!part.active) continue;
      ctx.globalAlpha = Math.max(0, part.life / part.maxLife);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const text of particles.texts) {
      if (!text.active) continue;
      ctx.globalAlpha = Math.max(0, text.life / text.maxLife);
      ctx.font = `bold ${text.size}px system-ui, sans-serif`;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, muted) {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score ${state.score}`, 16, 32);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText(`Best ${Math.max(state.best, state.score)}`, 16, 54);
    ctx.textAlign = 'right';
    ctx.fillStyle = INK;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`Wave ${state.wave}`, FIELD.width - 16, 30);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = DIM;
    ctx.fillText(`Goal ${WIN_SCORE}`, FIELD.width - 16, 52);
    // Lives, top centre.
    for (let i = 0; i < 3; i += 1) {
      heart(ctx, FIELD.width / 2 - 28 + i * 28, 22, 9, i < state.lives ? ROSE : 'rgba(255,93,115,0.22)');
    }
    // Combo meter, under the score while a chain is alive.
    if (state.combo > 1 && state.comboTimer > 0) {
      const width = 120;
      const fraction = state.comboTimer / 3.5;
      ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
      roundRect(ctx, 16, 64, width, 8, 4);
      ctx.fill();
      ctx.fillStyle = GOLD;
      roundRect(ctx, 16, 64, width * fraction, 8, 4);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Combo x${state.combo}`, 16, 92);
    }
    // Dash cooldown, bottom centre.
    const dashFraction = state.player.dashCooldown > 0 ? 1 - state.player.dashCooldown / 1.5 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, FIELD.width / 2 - 45, FIELD.height - 18, 90, 6, 3);
    ctx.fill();
    ctx.fillStyle = dashFraction >= 1 ? MINT : SKY;
    roundRect(ctx, FIELD.width / 2 - 45, FIELD.height - 18, 90 * dashFraction, 6, 3);
    ctx.fill();
    ctx.fillStyle = DIM;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dashFraction >= 1 ? 'SPACE — dash ready' : 'dash…', FIELD.width / 2, FIELD.height - 26);
    // Active power-ups, bottom left.
    let line = 0;
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px system-ui, sans-serif';
    if (state.shield) {
      ctx.fillStyle = SKY;
      ctx.fillText('🛡 Shield', 16, FIELD.height - 22 - line * 20);
      line += 1;
    }
    if (state.magnet > 0) {
      ctx.fillStyle = ROSE;
      ctx.fillText(`🧲 Magnet ${Math.ceil(state.magnet)}s`, 16, FIELD.height - 22 - line * 20);
      line += 1;
    }
    if (state.slow > 0) {
      ctx.fillStyle = MINT;
      ctx.fillText(`⏳ Slow ${Math.ceil(state.slow)}s`, 16, FIELD.height - 22 - line * 20);
      line += 1;
    }
    if (muted) {
      ctx.fillStyle = DIM;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Muted (M)', FIELD.width - 16, FIELD.height - 22);
    }
  }

  function panel(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 24, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillText(title, FIELD.width / 2, 190);
    ctx.fillStyle = INK;
    ctx.font = '19px system-ui, sans-serif';
    let y = 240;
    for (const line of lines) {
      ctx.fillText(line, FIELD.width / 2, y);
      y += 30;
    }
    ctx.fillStyle = DIM;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press Enter or click to play again — P pauses, M mutes', FIELD.width / 2, y + 34);
  }

  function drawTitle(state, best) {
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.shadowColor = EMBER;
    ctx.shadowBlur = 26;
    ctx.fillText('EMBERFALL', FIELD.width / 2, 170);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = '21px system-ui, sans-serif';
    ctx.fillText('A little ember spirit. A sky full of trouble.', FIELD.width / 2, 214);
    ctx.fillStyle = DIM;
    ctx.font = '17px system-ui, sans-serif';
    const help = [
      'Move with WASD or arrow keys — collect star shards to score.',
      'Chain pickups fast to raise your combo up to x8.',
      'Dodge cinders, sidestep meteor warnings, outrun sparks.',
      'SPACE dashes through danger. Reach 5,000 to become Ember Legend.',
      'Shield, Magnet and Slow-Time power-ups drop as you play.',
    ];
    let y = 262;
    for (const line of help) {
      ctx.fillText(line, FIELD.width / 2, y);
      y += 28;
    }
    if (best > 0) {
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, y + 8);
    }
    ctx.fillStyle = MINT;
    ctx.font = 'bold 22px system-ui, sans-serif';
    const blink = Math.floor(time * 2) % 2 === 0;
    if (blink) ctx.fillText('Press Enter or click to start', FIELD.width / 2, 500);
    ctx.fillStyle = DIM;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('P pauses · M mutes · your best score is kept on this device', FIELD.width / 2, 540);
  }

  function drawOver(state, best) {
    panel('GAME OVER', [
      `Score ${state.score} — best ${best}`,
      `Wave ${state.wave} · ${state.shards} shards · best combo x${state.bestCombo}`,
      `The goal was ${WIN_SCORE}. So close — the embers believe in you.`,
    ], ROSE);
  }

  function drawWin(state, best) {
    const stars = state.lives >= 3 ? 3 : state.lives === 2 ? 2 : 1;
    panel('EMBER LEGEND!', [
      `Score ${state.score} — best ${best}`,
      `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  Wave ${state.wave} · ${state.shards} shards · best combo x${state.bestCombo}`,
      'You reached 5,000 and the night is yours.',
    ], GOLD);
  }

  function drawPaused() {
    panel('PAUSED', ['Take a breath. The embers wait for you.'], SKY);
  }

  function drawWorld(state, particles) {
    drawBackground();
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_SHARD) drawShard(item);
      else if (item.kind === KIND_POWERUP) drawPowerup(item);
      else if (item.kind === KIND_METEOR) drawMeteor(item);
    }
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_CINDER) drawCinder(item);
      else if (item.kind === KIND_SPARK) drawSpark(item);
    }
    drawParticles(particles);
    drawPlayer(state.player, state);
  }

  return {
    addShake,
    draw(state, screen, best, particles, muted) {
      time += 1 / 60;
      ctx.save();
      if (shake > 0.2) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.86;
      }
      if (screen === SCREEN_TITLE) {
        drawBackground();
        drawWorld(state, particles);
        ctx.save();
        ctx.fillStyle = 'rgba(8, 8, 24, 0.55)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        ctx.restore();
        drawTitle(state, best);
      } else if (screen === SCREEN_PLAY) {
        drawWorld(state, particles);
        drawHud(state, muted);
      } else if (screen === SCREEN_PAUSED) {
        drawWorld(state, particles);
        drawHud(state, muted);
        drawPaused();
      } else if (screen === SCREEN_OVER) {
        drawWorld(state, particles);
        drawOver(state, best);
      } else {
        drawWorld(state, particles);
        drawWin(state, best);
      }
      ctx.restore();
    },
  };
}
