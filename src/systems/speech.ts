import { pickSpeechVoice } from '@/utils/voices';

type SpeechGlobal = typeof globalThis & {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance;
};

export type SpeechLanguage = 'da-DK' | 'en-US';

export interface SpeechDiagnostics {
  voiceCount: number;
  danishVoice: string | null;
  englishVoice: string | null;
}

const VOICE_WAIT_MS = 1500;
const VOICE_POLL_MS = 100;

let pendingRequest = 0;
let warnedMissingDanish = false;

function getGlobal(): SpeechGlobal {
  return globalThis as SpeechGlobal;
}

function readVoices(synth: SpeechSynthesis): SpeechSynthesisVoice[] {
  return synth.getVoices();
}

function waitForVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const current = readVoices(synth);
  if (current.length > 0) {
    return Promise.resolve(current);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      synth.removeEventListener('voiceschanged', onChange);
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      resolve(readVoices(synth));
    };

    const onChange = (): void => finish();

    synth.addEventListener('voiceschanged', onChange);
    const pollTimer = window.setInterval(() => {
      if (readVoices(synth).length > 0) {
        finish();
      }
    }, VOICE_POLL_MS);
    const timeoutTimer = window.setTimeout(finish, VOICE_WAIT_MS);
  });
}

function startUtterance(
  synth: SpeechSynthesis,
  text: string,
  language: SpeechLanguage,
  voices: readonly SpeechSynthesisVoice[],
): void {
  const Utterance = getGlobal().SpeechSynthesisUtterance;
  if (!Utterance) {
    return;
  }

  const voice = pickSpeechVoice(voices, language, 'da-DK');
  if (language === 'da-DK' && !voice && voices.length > 0 && !warnedMissingDanish) {
    warnedMissingDanish = true;
    console.warn('[gotar] ingen dansk TTS-stemme fundet - bruger ikke engelsk stemme');
  }

  const utterance = new Utterance(text);
  utterance.lang = language;
  utterance.rate = language === 'en-US' ? 0.85 : 0.9;
  utterance.pitch = 1.05;
  if (voice) {
    utterance.voice = voice;
  }
  synth.speak(utterance);
}

export function primeSpeech(): void {
  const synth = getGlobal().speechSynthesis;
  if (!synth) {
    return;
  }
  readVoices(synth);
}

export function isSpeechAvailable(): boolean {
  const global = getGlobal();
  return Boolean(global.speechSynthesis && global.SpeechSynthesisUtterance);
}

export function getSpeechDiagnostics(): SpeechDiagnostics {
  const synth = getGlobal().speechSynthesis;
  if (!synth) {
    return { voiceCount: 0, danishVoice: null, englishVoice: null };
  }
  const voices = readVoices(synth);
  return {
    voiceCount: voices.length,
    danishVoice: pickSpeechVoice(voices, 'da-DK', null)?.name ?? null,
    englishVoice: pickSpeechVoice(voices, 'en-US', null)?.name ?? null,
  };
}

export function speak(text: string, language: SpeechLanguage = 'da-DK'): boolean {
  const global = getGlobal();
  if (!global.speechSynthesis || !global.SpeechSynthesisUtterance || text.trim().length === 0) {
    return false;
  }

  const synth = global.speechSynthesis;
  const request = ++pendingRequest;
  synth.cancel();

  const voices = readVoices(synth);
  if (voices.length > 0) {
    startUtterance(synth, text, language, voices);
    return true;
  }

  void waitForVoices(synth).then((loaded) => {
    if (request !== pendingRequest) {
      return;
    }
    startUtterance(synth, text, language, loaded);
  });
  return true;
}

export function stopSpeaking(): void {
  pendingRequest += 1;
  getGlobal().speechSynthesis?.cancel();
}
