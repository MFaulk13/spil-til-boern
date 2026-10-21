import { save } from '@/systems/save';

export type SfxName = 'click' | 'collect' | 'win';

interface Tone {
  frequency: number;
  endFrequency?: number;
  delay: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const SFX: Record<SfxName, Tone[]> = {
  click: [
    { frequency: 620, endFrequency: 760, delay: 0, duration: 0.08, type: 'triangle', gain: 0.18 },
  ],
  collect: [
    { frequency: 880, delay: 0, duration: 0.1, type: 'sine', gain: 0.22 },
    { frequency: 1320, delay: 0.06, duration: 0.14, type: 'sine', gain: 0.18 },
  ],
  win: [
    { frequency: 523.25, delay: 0, duration: 0.16, type: 'triangle', gain: 0.2 },
    { frequency: 659.25, delay: 0.12, duration: 0.16, type: 'triangle', gain: 0.2 },
    { frequency: 783.99, delay: 0.24, duration: 0.16, type: 'triangle', gain: 0.2 },
    { frequency: 1046.5, delay: 0.36, duration: 0.32, type: 'triangle', gain: 0.22 },
  ],
};

function getWebkitAudioContext(): typeof AudioContext | undefined {
  return (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.unlock();
    }
  }

  unlock(): void {
    const context = this.getContext();
    if (context && context.state === 'suspended') {
      void context.resume();
    }
  }

  play(name: SfxName): void {
    if (!this.enabled) {
      return;
    }
    const context = this.getContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume();
    }
    const now = context.currentTime;
    for (const tone of SFX[name]) {
      this.playTone(context, tone, now);
    }
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    const AudioContextCtor = globalThis.AudioContext ?? getWebkitAudioContext();
    if (!AudioContextCtor) {
      return null;
    }
    this.context = new AudioContextCtor();
    return this.context;
  }

  private playTone(context: AudioContext, tone: Tone, now: number): void {
    const start = now + tone.delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    if (tone.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, start + tone.duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(tone.gain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  }
}

export const audio = new AudioManager(save.soundEnabled);
