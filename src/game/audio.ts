class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private roadNoiseNode: AudioBufferSourceNode | null = null;
  private roadNoiseFilter: BiquadFilterNode | null = null;
  private roadNoiseGain: GainNode | null = null;

  private nitroNoiseGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  private soundEnabled = true;
  private musicEnabled = true;
  private isEngineRunning = false;
  private musicIntervalId: number | null = null;
  private musicStep = 0;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.soundEnabled ? 0.85 : 0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.24 : 0;
      this.musicGain.connect(this.masterGain);

      this.setupContinuousLoops();
      this.startMusicLoop();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private setupContinuousLoops(): void {
    if (!this.ctx || !this.sfxGain) return;

    // Engine dual-oscillator synth
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineFilter.Q.value = 2.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 55;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 110.5;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Shared white/pink noise buffer for tire roll + nitro jet
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.12) * 0.45;
    }

    // Tire & wind noise
    this.roadNoiseNode = this.ctx.createBufferSource();
    this.roadNoiseNode.buffer = noiseBuffer;
    this.roadNoiseNode.loop = true;

    this.roadNoiseFilter = this.ctx.createBiquadFilter();
    this.roadNoiseFilter.type = 'bandpass';
    this.roadNoiseFilter.frequency.value = 420;
    this.roadNoiseFilter.Q.value = 0.9;

    this.roadNoiseGain = this.ctx.createGain();
    this.roadNoiseGain.gain.value = 0;

    this.roadNoiseNode.connect(this.roadNoiseFilter);
    this.roadNoiseFilter.connect(this.roadNoiseGain);
    this.roadNoiseGain.connect(this.sfxGain);
    this.roadNoiseNode.start();

    // Nitro jet roar
    const nitroSource = this.ctx.createBufferSource();
    nitroSource.buffer = noiseBuffer;
    nitroSource.loop = true;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = 'bandpass';
    this.nitroFilter.frequency.value = 950;
    this.nitroFilter.Q.value = 2.2;

    this.nitroNoiseGain = this.ctx.createGain();
    this.nitroNoiseGain.gain.value = 0;

    nitroSource.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroNoiseGain);
    this.nitroNoiseGain.connect(this.sfxGain);
    nitroSource.start();
  }

  public setSettings(soundEnabled: boolean, musicEnabled: boolean): void {
    this.soundEnabled = soundEnabled;
    this.musicEnabled = musicEnabled;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(soundEnabled ? 0.85 : 0, now, 0.05);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(musicEnabled ? 0.24 : 0, now, 0.08);
    }
  }

  public updateDriving(
    active: boolean,
    speedNorm: number, // 0..1.4
    nitroActive: boolean,
    steeringIntensity: number,
    isRainy: boolean,
    isOffroad = false
  ): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || !this.soundEnabled) {
      if (this.isEngineRunning) {
        this.engineGain.gain.setTargetAtTime(0, now, 0.08);
        this.roadNoiseGain?.gain.setTargetAtTime(0, now, 0.08);
        this.nitroNoiseGain?.gain.setTargetAtTime(0, now, 0.06);
        this.isEngineRunning = false;
      }
      return;
    }

    this.isEngineRunning = true;
    const clamped = Math.max(0, Math.min(1.5, speedNorm));
    const gearCycle = (clamped * 3.4) % 1;
    const baseFreq =
      (isOffroad ? 44 : 52) + clamped * (isOffroad ? 78 : 95) + gearCycle * 22 + (nitroActive ? 34 : 0);

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * (isOffroad ? 1.5 : 2.01), now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(
      (isOffroad ? 180 : 220) + clamped * 720 + (nitroActive ? 600 : 0),
      now,
      0.06
    );
    this.engineGain.gain.setTargetAtTime((isOffroad ? 0.095 : 0.08) + clamped * 0.065, now, 0.06);

    if (this.roadNoiseGain && this.roadNoiseFilter) {
      const steerBoost = Math.abs(steeringIntensity) * (isOffroad ? 0.14 : 0.08);
      const rainBoost = isRainy ? 0.055 : 0;
      const offroadBoost = isOffroad ? 0.075 * Math.min(1, clamped * 1.4) : 0;
      const noiseFreq = isRainy ? 1150 : isOffroad ? 210 + clamped * 290 : 420 + clamped * 450;
      this.roadNoiseFilter.frequency.setTargetAtTime(noiseFreq, now, 0.08);
      this.roadNoiseGain.gain.setTargetAtTime(
        0.03 + clamped * 0.09 + steerBoost + rainBoost + offroadBoost,
        now,
        0.08
      );
    }

    if (this.nitroNoiseGain && this.nitroFilter) {
      this.nitroFilter.frequency.setTargetAtTime(nitroActive ? 1300 : 750, now, 0.06);
      this.nitroNoiseGain.gain.setTargetAtTime(nitroActive ? 0.22 : 0, now, 0.06);
    }
  }

  public playClick(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.045);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playPurchase(): void {
    this.unlock();
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const start = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  public playCoin(): void {
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.045);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playNitroIgnite(): void {
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.25);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.34);
  }

  public playCrash(): void {
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;
    const now = this.ctx.currentTime;

    // Sub impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.42);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);

    // Metallic crunch burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channel[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.42);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  private startMusicLoop(): void {
    if (this.musicIntervalId !== null) return;
    const bassPattern = [55, 55, 65.41, 55, 73.42, 55, 82.41, 73.42];
    const arpPattern = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];

    this.musicIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || this.ctx.state !== 'running') {
        return;
      }
      const now = this.ctx.currentTime;
      const step = this.musicStep % 8;
      this.musicStep++;

      // Driving synthwave bass pulse
      const bassOsc = this.ctx.createOscillator();
      const bassFilter = this.ctx.createBiquadFilter();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassPattern[step], now);
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(360, now);
      bassGain.gain.setValueAtTime(0.22, now);
      bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.17);

      // Subtle melodic arp on alternating steps
      if (step % 2 === 0) {
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'triangle';
        arpOsc.frequency.setValueAtTime(arpPattern[step], now);
        arpGain.gain.setValueAtTime(0.09, now);
        arpGain.gain.exponentialRampToValueAtTime(0.002, now + 0.14);
        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain);
        arpOsc.start(now);
        arpOsc.stop(now + 0.15);
      }
    }, 185);
  }

  public dispose(): void {
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
