import { describe, expect, it } from 'vitest';
import { normalizeLanguageTag, pickSpeechVoice, pickVoice } from '@/utils/voices';

const danish = { name: 'Dansk', lang: 'da-DK' };
const danishBase = { name: 'Dansk basis', lang: 'da' };
const englishUs = { name: 'English US', lang: 'en-US' };
const englishGb = { name: 'English GB', lang: 'en-GB' };

describe('voice selection', () => {
  it('normalizes language tags', () => {
    expect(normalizeLanguageTag(' DA_dk ')).toBe('da-dk');
    expect(normalizeLanguageTag('en_US')).toBe('en-us');
  });

  it('prefers an exact locale before a base language', () => {
    expect(pickVoice([danishBase, danish], 'da-DK')?.name).toBe('Dansk');
    expect(pickVoice([danish, danishBase], 'da')?.name).toBe('Dansk basis');
  });

  it('matches underscore tags from the browser', () => {
    expect(pickVoice([{ name: 'Dansk', lang: 'da_DK' }], 'da-DK')?.name).toBe('Dansk');
  });

  it('matches the language base when no exact locale exists', () => {
    expect(pickVoice([englishGb], 'en-US')?.name).toBe('English GB');
    expect(pickVoice([danishBase], 'da-DK')?.name).toBe('Dansk basis');
  });

  it('never falls back from Danish to English', () => {
    expect(pickSpeechVoice([englishUs], 'da-DK')).toBeNull();
  });

  it('falls back from English to Danish when English is missing', () => {
    expect(pickSpeechVoice([danish], 'en-US')?.name).toBe('Dansk');
  });

  it('uses English before Danish when an English voice exists', () => {
    expect(pickSpeechVoice([danish, englishUs], 'en-US')?.name).toBe('English US');
  });

  it('can disable the fallback explicitly', () => {
    expect(pickSpeechVoice([danish], 'en-US', null)).toBeNull();
  });
});
