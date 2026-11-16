// All sound is synthesized with WebAudio — no audio files, no network.
// Every effect is a short envelope over an oscillator (or filtered noise),
// so the game stays silent until the player first interacts with the page.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol, cutoff) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // Named effects, one per game event.
  harvest(combo) {
    const base = 520 + Math.min(combo, 8) * 45;
    this.tone(base, 0.12, 'sine', 0.5, base * 1.6);
    this.tone(base * 2, 0.18, 'triangle', 0.25, base * 2.4);
  }

  squish() {
    this.noise(0.09, 0.5, 900);
    this.tone(180, 0.1, 'square', 0.25, 60);
  }

  water() {
    this.noise(0.16, 0.3, 2400);
    this.tone(900, 0.1, 'sine', 0.15, 1400);
  }

  sprout() {
    this.tone(660, 0.08, 'sine', 0.18, 990);
  }

  lost() {
    this.tone(220, 0.35, 'sawtooth', 0.3, 110);
    this.tone(165, 0.4, 'triangle', 0.2, 82);
  }

  dayClear() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.22, 'triangle', 0.4), i * 110);
    });
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.3, 'triangle', 0.35), i * 160);
    });
  }

  click() {
    this.tone(700, 0.05, 'sine', 0.25, 900);
  }
}
