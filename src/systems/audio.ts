import { save } from '@/systems/save';

export type SfxName =
  | 'click'
  | 'collect'
  | 'win'
  | 'hatch'
  | 'reveal'
  | 'pop'
  | 'bark'
  | 'meow'
  | 'neigh'
  | 'chirp'
  | 'splash'
  | 'bubble'
  | 'oink'
  | 'cluck'
  | 'squeak'
  | 'tweet'
  | 'quack'
  | 'hoot'
  | 'ribbit'
  | 'eat'
  | 'play'
  | 'love'
  | 'sleep'
  | 'happy'
  | 'sad'
  | 'unlock'
  | 'sniff'
  | 'error';

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
  hatch: [
    { frequency: 440, endFrequency: 880, delay: 0, duration: 0.12, type: 'triangle', gain: 0.16 },
    {
      frequency: 660,
      endFrequency: 1320,
      delay: 0.08,
      duration: 0.16,
      type: 'triangle',
      gain: 0.14,
    },
  ],
  reveal: [
    { frequency: 587.33, delay: 0, duration: 0.2, type: 'sine', gain: 0.18 },
    { frequency: 739.99, delay: 0.1, duration: 0.22, type: 'sine', gain: 0.18 },
    { frequency: 880, delay: 0.2, duration: 0.2, type: 'sine', gain: 0.18 },
    { frequency: 1174.66, delay: 0.3, duration: 0.4, type: 'sine', gain: 0.16 },
  ],
  pop: [{ frequency: 900, endFrequency: 300, delay: 0, duration: 0.09, type: 'sine', gain: 0.18 }],
  bark: [
    { frequency: 240, endFrequency: 150, delay: 0, duration: 0.12, type: 'square', gain: 0.12 },
    { frequency: 220, endFrequency: 140, delay: 0.16, duration: 0.12, type: 'square', gain: 0.1 },
  ],
  meow: [{ frequency: 720, endFrequency: 420, delay: 0, duration: 0.32, type: 'sine', gain: 0.16 }],
  neigh: [
    { frequency: 320, endFrequency: 190, delay: 0, duration: 0.3, type: 'sawtooth', gain: 0.08 },
    {
      frequency: 300,
      endFrequency: 170,
      delay: 0.12,
      duration: 0.28,
      type: 'sawtooth',
      gain: 0.06,
    },
  ],
  chirp: [
    { frequency: 980, endFrequency: 1300, delay: 0, duration: 0.09, type: 'sine', gain: 0.14 },
    { frequency: 1100, endFrequency: 1450, delay: 0.12, duration: 0.09, type: 'sine', gain: 0.12 },
  ],
  splash: [
    { frequency: 420, endFrequency: 160, delay: 0, duration: 0.18, type: 'triangle', gain: 0.14 },
  ],
  bubble: [
    { frequency: 300, endFrequency: 640, delay: 0, duration: 0.13, type: 'sine', gain: 0.14 },
    { frequency: 380, endFrequency: 760, delay: 0.14, duration: 0.12, type: 'sine', gain: 0.1 },
  ],
  oink: [
    { frequency: 190, endFrequency: 120, delay: 0, duration: 0.12, type: 'sawtooth', gain: 0.07 },
    {
      frequency: 210,
      endFrequency: 130,
      delay: 0.16,
      duration: 0.12,
      type: 'sawtooth',
      gain: 0.06,
    },
  ],
  cluck: [
    { frequency: 620, endFrequency: 430, delay: 0, duration: 0.07, type: 'square', gain: 0.08 },
    { frequency: 700, endFrequency: 480, delay: 0.1, duration: 0.07, type: 'square', gain: 0.07 },
    { frequency: 580, endFrequency: 400, delay: 0.2, duration: 0.07, type: 'square', gain: 0.06 },
  ],
  squeak: [
    { frequency: 1350, endFrequency: 1850, delay: 0, duration: 0.08, type: 'sine', gain: 0.1 },
    { frequency: 1500, endFrequency: 2000, delay: 0.1, duration: 0.08, type: 'sine', gain: 0.08 },
  ],
  tweet: [
    { frequency: 1250, endFrequency: 1650, delay: 0, duration: 0.07, type: 'sine', gain: 0.12 },
    { frequency: 1450, endFrequency: 1900, delay: 0.1, duration: 0.07, type: 'sine', gain: 0.1 },
    { frequency: 1200, endFrequency: 1600, delay: 0.22, duration: 0.06, type: 'sine', gain: 0.08 },
  ],
  quack: [
    { frequency: 420, endFrequency: 230, delay: 0, duration: 0.16, type: 'sawtooth', gain: 0.08 },
    { frequency: 400, endFrequency: 220, delay: 0.2, duration: 0.14, type: 'sawtooth', gain: 0.06 },
  ],
  hoot: [
    { frequency: 310, endFrequency: 250, delay: 0, duration: 0.22, type: 'sine', gain: 0.12 },
    { frequency: 290, endFrequency: 230, delay: 0.3, duration: 0.3, type: 'sine', gain: 0.1 },
  ],
  ribbit: [
    { frequency: 170, endFrequency: 270, delay: 0, duration: 0.12, type: 'square', gain: 0.08 },
    { frequency: 160, endFrequency: 250, delay: 0.16, duration: 0.12, type: 'square', gain: 0.07 },
  ],
  eat: [
    { frequency: 210, endFrequency: 150, delay: 0, duration: 0.07, type: 'square', gain: 0.09 },
    { frequency: 250, endFrequency: 170, delay: 0.11, duration: 0.07, type: 'square', gain: 0.08 },
    { frequency: 200, endFrequency: 140, delay: 0.22, duration: 0.07, type: 'square', gain: 0.07 },
  ],
  play: [
    { frequency: 523.25, delay: 0, duration: 0.09, type: 'triangle', gain: 0.16 },
    { frequency: 659.25, delay: 0.09, duration: 0.09, type: 'triangle', gain: 0.16 },
    { frequency: 783.99, delay: 0.18, duration: 0.14, type: 'triangle', gain: 0.16 },
  ],
  love: [
    { frequency: 740, endFrequency: 980, delay: 0, duration: 0.22, type: 'sine', gain: 0.15 },
    { frequency: 880, endFrequency: 1174, delay: 0.16, duration: 0.28, type: 'sine', gain: 0.12 },
  ],
  sleep: [
    { frequency: 392, endFrequency: 261.63, delay: 0, duration: 0.5, type: 'sine', gain: 0.12 },
    { frequency: 329.63, endFrequency: 196, delay: 0.4, duration: 0.6, type: 'sine', gain: 0.09 },
  ],
  happy: [
    { frequency: 659.25, delay: 0, duration: 0.1, type: 'triangle', gain: 0.14 },
    { frequency: 783.99, delay: 0.08, duration: 0.1, type: 'triangle', gain: 0.14 },
    { frequency: 1046.5, delay: 0.16, duration: 0.22, type: 'triangle', gain: 0.13 },
  ],
  sad: [
    { frequency: 392, endFrequency: 349.23, delay: 0, duration: 0.32, type: 'sine', gain: 0.12 },
    {
      frequency: 293.66,
      endFrequency: 261.63,
      delay: 0.28,
      duration: 0.42,
      type: 'sine',
      gain: 0.1,
    },
  ],
  unlock: [
    { frequency: 587.33, delay: 0, duration: 0.12, type: 'sine', gain: 0.16 },
    { frequency: 880, delay: 0.08, duration: 0.12, type: 'sine', gain: 0.16 },
    { frequency: 1174.66, delay: 0.16, duration: 0.28, type: 'sine', gain: 0.14 },
  ],
  sniff: [
    { frequency: 340, endFrequency: 520, delay: 0, duration: 0.1, type: 'sine', gain: 0.1 },
    { frequency: 380, endFrequency: 620, delay: 0.14, duration: 0.1, type: 'sine', gain: 0.08 },
  ],
  error: [
    { frequency: 260, endFrequency: 180, delay: 0, duration: 0.2, type: 'square', gain: 0.08 },
  ],
};

const MUSIC_CHORDS: readonly (readonly number[])[] = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66],
];

const MUSIC_MELODY: readonly number[] = [523.25, 659.25, 783.99, 659.25, 587.33, 493.88, 523.25, 0];

const BAR_SECONDS = 3.6;

function getWebkitAudioContext(): typeof AudioContext | undefined {
  return (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private enabled: boolean;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicPlaying = false;
  private musicStep = 0;

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
    } else {
      this.stopMusic();
    }
  }

  unlock(): void {
    const context = this.getContext();
    if (context && context.state === 'suspended') {
      void context.resume().then(() => this.startMusic());
      return;
    }
    this.startMusic();
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
      this.playTone(context, tone, now, context.destination);
    }
  }

  playNotes(
    frequencies: readonly number[],
    noteDuration = 0.28,
    gap = 0.08,
    type: OscillatorType = 'triangle',
  ): void {
    if (!this.enabled || frequencies.length === 0) {
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
    frequencies.forEach((frequency, index) => {
      this.playTone(
        context,
        {
          frequency,
          delay: index * (noteDuration + gap),
          duration: noteDuration,
          type,
          gain: 0.14,
        },
        now,
        context.destination,
      );
    });
  }

  startMusic(): void {
    if (!this.enabled || this.musicPlaying) {
      return;
    }
    const context = this.getContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      void context.resume().then(() => this.startMusic());
      return;
    }
    this.musicPlaying = true;
    this.musicStep = 0;
    this.musicGain = context.createGain();
    this.musicGain.gain.value = 0.7;
    this.musicGain.connect(context.destination);
    this.scheduleMusic();
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    const context = this.context;
    const gain = this.musicGain;
    if (context && gain) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.06);
      setTimeout(() => {
        try {
          gain.disconnect();
        } catch {
          // The node may already be disconnected.
        }
      }, 300);
    }
    this.musicGain = null;
  }

  private scheduleMusic(): void {
    if (!this.musicPlaying) {
      return;
    }
    const context = this.context;
    if (!context || !this.musicGain) {
      return;
    }
    if (context.state !== 'running') {
      this.musicTimer = setTimeout(() => this.scheduleMusic(), 400);
      return;
    }

    const start = context.currentTime + 0.08;
    const chord = MUSIC_CHORDS[this.musicStep % MUSIC_CHORDS.length];
    for (const frequency of chord) {
      this.playMusicTone(context, frequency, start, BAR_SECONDS, 0.022);
      this.playMusicTone(context, frequency * 2, start, BAR_SECONDS, 0.006);
    }

    const melody = MUSIC_MELODY[this.musicStep % MUSIC_MELODY.length];
    if (melody > 0) {
      this.playMusicTone(context, melody, start + 0.15, 0.9, 0.014, 'triangle');
      this.playMusicTone(context, melody * 1.5, start + 1.85, 0.7, 0.009, 'triangle');
    }

    this.musicStep += 1;
    this.musicTimer = setTimeout(() => this.scheduleMusic(), BAR_SECONDS * 1000 - 120);
  }

  private playMusicTone(
    context: AudioContext,
    frequency: number,
    start: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = 'sine',
  ): void {
    if (!this.musicGain) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.35);
    gain.gain.setValueAtTime(gainValue, start + duration - 0.5);
    gain.gain.linearRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
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

  private playTone(context: AudioContext, tone: Tone, now: number, destination: AudioNode): void {
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
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  }
}

export const audio = new AudioManager(save.soundEnabled);
