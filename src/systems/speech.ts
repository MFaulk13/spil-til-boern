type SpeechGlobal = typeof globalThis & {
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance;
};

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function getGlobal(): SpeechGlobal {
  return globalThis as SpeechGlobal;
}

function getDanishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) {
    return cachedVoice;
  }
  const synth = getGlobal().speechSynthesis;
  if (!synth) {
    cachedVoice = null;
    return cachedVoice;
  }
  cachedVoice =
    synth.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('da')) ?? null;
  return cachedVoice;
}

export function isSpeechAvailable(): boolean {
  const global = getGlobal();
  return Boolean(global.speechSynthesis && global.SpeechSynthesisUtterance);
}

export function speak(text: string): boolean {
  const global = getGlobal();
  if (!global.speechSynthesis || !global.SpeechSynthesisUtterance || text.trim().length === 0) {
    return false;
  }

  global.speechSynthesis.cancel();
  const utterance = new global.SpeechSynthesisUtterance(text);
  utterance.lang = 'da-DK';
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  const voice = getDanishVoice();
  if (voice) {
    utterance.voice = voice;
  }
  global.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  getGlobal().speechSynthesis?.cancel();
}
