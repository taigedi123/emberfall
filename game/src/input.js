// Keyboard (and pointer) input, read once per frame. Movement keys give a
// direction vector; the action keys are edge-triggered — takeActions returns
// each press once, so holding Space does not re-dash every frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;

  function onKeyDown(event) {
    if (event.repeat) {
      if (MOVE_KEYS[event.code]) event.preventDefault();
      return;
    }
    if (MOVE_KEYS[event.code]) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      queued |= ACTION_DASH;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      queued |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      queued |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      queued |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerDown() {
    queued |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const vector = MOVE_KEYS[code];
        if (vector) {
          x += vector[0];
          y += vector[1];
        }
      }
      if (x === 0 && y === 0) return [0, 0];
      const length = Math.hypot(x, y);
      return [x / length, y / length];
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
