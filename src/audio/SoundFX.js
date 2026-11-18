// Sintetizador de efectos de sonido procedurales mediante Web Audio API
export class SoundFX {
  constructor() {
    this.ctx = null;
  }

  ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, type = 'sine', vol = 0.08, slideTo = null) {
    this.ensureCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  step() { this.playTone(260, 0.06, 'triangle', 0.05, 320); }

  crack() { this.playTone(150, 0.14, 'sawtooth', 0.04, 65); }

  gem() {
    this.playTone(587, 0.09, 'sine', 0.08);
    setTimeout(() => this.playTone(880, 0.14, 'sine', 0.08), 55);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.16, 'triangle', 0.08), i * 85);
    });
  }

  lose() {
    this.playTone(240, 0.18, 'sawtooth', 0.07, 110);
    setTimeout(() => this.playTone(140, 0.25, 'sawtooth', 0.07, 70), 140);
  }
}