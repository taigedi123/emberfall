// Bursts and floating text: the juice. Particles are a fixed pool — a burst
// grabs free slots, a dead particle costs nothing — and floating texts rise
// and fade over their short life. The renderer reads them, the world never
// sees them.
export function createParticles(capacity = 240) {
  const parts = [];
  for (let i = 0; i < capacity; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff' });
  }
  const texts = [];
  for (let i = 0; i < 24; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 16 });
  }

  function freePart() {
    for (const part of parts) if (!part.active) return part;
    return null;
  }

  function freeText() {
    for (const text of texts) if (!text.active) return text;
    return null;
  }

  return {
    parts,
    texts,
    burst(x, y, color, count, speed = 160) {
      for (let i = 0; i < count; i += 1) {
        const part = freePart();
        if (!part) return;
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.3 + Math.random() * 0.7);
        part.active = true;
        part.x = x;
        part.y = y;
        part.vx = Math.cos(angle) * velocity;
        part.vy = Math.sin(angle) * velocity;
        part.maxLife = 0.4 + Math.random() * 0.5;
        part.life = part.maxLife;
        part.size = 2 + Math.random() * 3.5;
        part.color = color;
      }
    },
    ring(x, y, color, count = 28, speed = 260) {
      for (let i = 0; i < count; i += 1) {
        const part = freePart();
        if (!part) return;
        const angle = (i / count) * Math.PI * 2;
        part.active = true;
        part.x = x;
        part.y = y;
        part.vx = Math.cos(angle) * speed;
        part.vy = Math.sin(angle) * speed;
        part.maxLife = 0.5;
        part.life = 0.5;
        part.size = 3;
        part.color = color;
      }
    },
    floatText(x, y, text, color, size = 16) {
      const slot = freeText();
      if (!slot) return;
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.maxLife = 0.9;
      slot.life = 0.9;
      slot.text = text;
      slot.color = color;
      slot.size = size;
    },
    step(dt) {
      for (const part of parts) {
        if (!part.active) continue;
        part.life -= dt;
        if (part.life <= 0) {
          part.active = false;
          continue;
        }
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.vx *= 1 - 2.4 * dt;
        part.vy *= 1 - 2.4 * dt;
      }
      for (const text of texts) {
        if (!text.active) continue;
        text.life -= dt;
        if (text.life <= 0) {
          text.active = false;
          continue;
        }
        text.y -= 34 * dt;
      }
    },
    clear() {
      for (const part of parts) part.active = false;
      for (const text of texts) text.active = false;
    },
  };
}
