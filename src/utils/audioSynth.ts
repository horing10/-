/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Gugak web audio synthesizer representing traditional pitch-bends (Nonghyeon: 농현) and unique timbres.

class GugakSynthesizer {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Gayageum pluck: Fast decay string pluck, includes pitch-bending Nonghyeon
  playGayageum(freq: number, nonghyeonLevel = 0) {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Use triangle with rich odd harmonics to simulate cozy silk string
    osc.type = 'triangle';
    
    // Frequency set
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // If Nonghyeon is applied, we bend the pitch upwards and back in a wave
    if (nonghyeonLevel > 0) {
      // simulate hand physical pulling string (causes pitch to wave upwards)
      const bendAmp = freq * 0.08 * nonghyeonLevel; // Up to 8% pitch bend
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(freq + bendAmp, ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(freq - bendAmp / 2, ctx.currentTime + 0.4);
      osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.8);
    }

    filter.type = 'lowpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(freq * 3, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.3);
  }

  // Geomungo pluck: Deeper plucking sound with thick woody resonance
  playGeomungo(freq: number, suldaeHit = true) {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    // Layer main low zither string and a small noise transient for the bamboo "Suldae (술대)" scraping the soundboard
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    subOsc.type = 'triangle';

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    subOsc.frequency.setValueAtTime(freq * 0.5, ctx.currentTime); // Low sub octave

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    subOsc.start();
    osc.stop(ctx.currentTime + 1.6);
    subOsc.stop(ctx.currentTime + 1.6);

    if (suldaeHit) {
      // Suldae hit click noise
      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
    }
  }

  // Haegeum Bowing: Extended sliding tone (bow scraping)
  playHaegeum(freq: number) {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Squeaky rustic twin-strings
    osc.type = 'sawtooth';
    osc2.type = 'triangle';

    // Slide up into pitch slightly (characteristic of bowed instruments)
    osc.frequency.setValueAtTime(freq * 0.9, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq, ctx.currentTime + 0.15);
    // Vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6.5; // Vibrato Speed (6.5Hz)
    lfoGain.gain.value = freq * 0.02; // Depth
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfoGain.connect(osc2.frequency);

    osc2.frequency.setValueAtTime(freq * 1.005, ctx.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, ctx.currentTime);
    filter.Q.value = 1.0;

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    lfo.start();
    osc.start();
    osc2.start();

    lfo.stop(ctx.currentTime + 1.3);
    osc.stop(ctx.currentTime + 1.3);
    osc2.stop(ctx.currentTime + 1.3);
  }

  // Daegeum Flute: High wind whistles alongside deep trembling reed vibration 'Cheong' (청)
  playDaegeum(freq: number, enableCheong = true) {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const breathNoise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    const mainGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Dynamic tremolo representing traditional "Cheong (청)" membrane buzzing
    if (enableCheong) {
      const cheongLFO = ctx.createOscillator();
      const cheongGain = ctx.createGain();
      cheongLFO.frequency.value = 9.0; // Buzzing frequency 9Hz
      cheongGain.gain.value = freq * 0.04; // 4% pitch wobble
      cheongLFO.connect(cheongGain);
      cheongGain.connect(osc.frequency);
      cheongLFO.start();
      cheongLFO.stop(ctx.currentTime + 1.5);
    }

    // Generate white noise for soft air breath simulation
    const bufSize = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    breathNoise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = freq * 2;
    noiseFilter.Q.value = 6;

    noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);

    mainGain.gain.setValueAtTime(0.01, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.15);
    mainGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);

    osc.connect(mainGain);
    breathNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    mainGain.connect(ctx.destination);
    noiseGain.connect(ctx.destination);

    osc.start();
    breathNoise.start();

    osc.stop(ctx.currentTime + 1.5);
    breathNoise.stop(ctx.currentTime + 1.5);
  }

  // Piri: High nasal resonance double-reed sound (rich harmonics)
  playPiri(freq: number) {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Traditional trembling ornament (요성) vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7.5; // Double reed shaking fast (7.5Hz)
    lfoGain.gain.value = freq * 0.035; // Vibrato strength
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, ctx.currentTime);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    lfo.start();
    osc.start();

    lfo.stop(ctx.currentTime + 1.3);
    osc.stop(ctx.currentTime + 1.3);
  }

  // Janggu/Buk Low Percussion: Thick thump (쿵) with filtered crackle
  playStrikeLow(freq: number) {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    
    // Add brief low-pass noise chunk to represent drum-skin impact
    const bufSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.12);
  }

  // Kkwaenggwari High Metal Chime: High metallic ring (깽)
  playStrikeHigh() {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    // Combine 3 metallic sine wave frequencies for authentic brass dissonance
    const freqs = [987, 1420, 1850];
    const gain = ctx.createGain();
    
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    gain.connect(ctx.destination);

    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    });

    // Metallic harsh strike crackle noise
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.1);
  }

  // Jing Gong: Immersive warm brass wave with long slow decay (지이잉)
  playStrikeMetal() {
    this.initCtx();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const baseFreq = 98; // Deep base 98Hz
    const mults = [1, 1.48, 2.1, 3.05];
    const masterGain = ctx.createGain();

    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);
    masterGain.connect(ctx.destination);

    // Warm, slightly detuned overtones to simulate huge metal plate vibration (징의 울림)
    mults.forEach((m, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * m, ctx.currentTime);

      // Wobble amplitude for physical oscillation (징의 맥놀이 현상)
      const wobble = ctx.createOscillator();
      const wobbleGain = ctx.createGain();
      wobble.frequency.value = 3.5 - i * 0.5; // low frequency phasing wobble
      wobbleGain.gain.value = 0.15;
      wobble.connect(wobbleGain);
      
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.4 / (i + 1), ctx.currentTime);
      wobbleGain.connect(oscGain.gain);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      wobble.start();
      osc.start();

      wobble.stop(ctx.currentTime + 3.0);
      osc.stop(ctx.currentTime + 3.0);
    });
  }

  // Generic play route mapping
  playNote(soundStyle: string, freq: number, options?: { nonghyeon?: number }) {
    try {
      switch (soundStyle) {
        case 'pluck':
          this.playGayageum(freq, options?.nonghyeon || 0);
          break;
        case 'vibrate':
          this.playGeomungo(freq);
          break;
        case 'wind':
          this.playDaegeum(freq);
          break;
        case 'bend':
          this.playHaegeum(freq);
          break;
        case 'strike_low':
          this.playStrikeLow(freq);
          break;
        case 'strike_high':
          this.playStrikeHigh();
          break;
        case 'strike_metal':
          this.playStrikeMetal();
          break;
        default:
          this.playGayageum(freq);
      }
    } catch (e) {
      console.warn('AudioContext failed to trigger sound: ', e);
    }
  }
}

export const gugakSynth = new GugakSynthesizer();
