export interface VoiceLike {
  readonly name?: string;
  readonly lang: string;
  readonly default?: boolean;
  readonly localService?: boolean;
}

export function normalizeLanguageTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-');
}

function languageBase(tag: string): string {
  return normalizeLanguageTag(tag).split('-')[0] ?? '';
}

export function pickVoice<T extends VoiceLike>(voices: readonly T[], language: string): T | null {
  const normalized = normalizeLanguageTag(language);
  if (!normalized) {
    return null;
  }

  const exact = voices.find((voice) => normalizeLanguageTag(voice.lang) === normalized);
  if (exact) {
    return exact;
  }

  const base = languageBase(normalized);
  const sameBase = voices.filter((voice) => languageBase(voice.lang) === base);
  if (sameBase.length === 0) {
    return null;
  }

  return (
    sameBase.find((voice) => voice.default) ??
    sameBase.find((voice) => voice.localService) ??
    sameBase[0]
  );
}

export function pickSpeechVoice<T extends VoiceLike>(
  voices: readonly T[],
  requested: string,
  fallback: string | null = 'da-DK',
): T | null {
  const direct = pickVoice(voices, requested);
  if (direct) {
    return direct;
  }
  if (!fallback || normalizeLanguageTag(fallback) === normalizeLanguageTag(requested)) {
    return null;
  }
  return pickVoice(voices, fallback);
}
