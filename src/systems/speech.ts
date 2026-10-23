type SpeechGlobal = typeof globalThis & {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance;
};

export type SpeechLanguage = 'da-DK' | 'en-US';

const cachedVoices = new Map<string, SpeechSynthesisVoice | null>();

function getGlobal(): SpeechGlobal {
  return globalThis as SpeechGlobal;
}

function getVoice(language: SpeechLanguage): SpeechSynthesisVoice | null {
  if (cachedVoices.has(language)) {
    return cachedVoices.get(language) ?? null;
  }
  const synth = getGlobal().speechSynthesis;
  if (!synth) {
    cachedVoices.set(language, null);
    return null;
  }

  const normalized = language.toLowerCase();
  const prefix = normalized.slice(0, 2);
  const voices = synth.getVoices();
  if (voices.length === 0) {
    return null;
  }
  const voice =
    voices.find((candidate) => candidate.lang.toLowerCase().startsWith(normalized)) ??
    voices.find((candidate) => candidate.lang.toLowerCase().startsWith(prefix)) ??
    null;
  cachedVoices.set(language, voice);
  return voice;
}

export function isSpeechAvailable(): boolean {
  const global = getGlobal();
  return Boolean(global.speechSynthesis && global.SpeechSynthesisUtterance);
}

export function speak(text: string, language: SpeechLanguage = 'da-DK'): boolean {
  const global = getGlobal();
  if (!global.speechSynthesis || !global.SpeechSynthesisUtterance || text.trim().length === 0) {
    return false;
  }

  global.speechSynthesis.cancel();
  const utterance = new global.SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = language === 'en-US' ? 0.85 : 0.9;
  utterance.pitch = 1.05;
  const voice = getVoice(language);
  if (voice) {
    utterance.voice = voice;
  }
  global.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  getGlobal().speechSynthesis?.cancel();
}
