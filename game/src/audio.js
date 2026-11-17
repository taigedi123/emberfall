// Synthesised sound effects, no audio files: a few oscillators through one
// gain node. The context is created on the first user gesture (browsers
// refuse audio before that) and everything after it is silent until then.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem('emberfall.muted') === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(startFreq, endFreq, seconds, type, when = 0) {
    if (!ensure() || muted || !context || !master) return;
    const at = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, startFreq), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), at + seconds);
    gain.gain.setValueAtTime(0.9, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + seconds + 0.02);
  }

  function noise(seconds, when = 0) {
    if (!ensure() || muted || !context || !master) return;
    const at = context.currentTime + when;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.5, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(master);
    source.start(at);
  }

  return {
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume().catch(() => {});
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem('emberfall.muted', muted ? '1' : '0');
      } catch {
        // Storage off: the mute lasts this visit only.
      }
      return muted;
    },
    pickup(combo) {
      const base = 520 + Math.min(combo, 8) * 55;
      tone(base, base * 1.6, 0.09, 'sine');
      tone(base * 2, base * 2.4, 0.07, 'triangle', 0.04);
    },
    dash() {
      noise(0.14);
      tone(300, 900, 0.12, 'sawtooth');
    },
    hit() {
      tone(220, 55, 0.28, 'sawtooth');
      noise(0.2);
    },
    powerup() {
      tone(440, 660, 0.1, 'triangle');
      tone(660, 990, 0.12, 'triangle', 0.09);
    },
    wave() {
      tone(392, 392, 0.1, 'triangle');
      tone(523, 523, 0.1, 'triangle', 0.1);
      tone(659, 659, 0.16, 'triangle', 0.2);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, i) => tone(freq, freq, 0.18, 'triangle', i * 0.12));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((freq, i) => tone(freq, freq * 0.94, 0.22, 'triangle', i * 0.16));
    },
  };
}
