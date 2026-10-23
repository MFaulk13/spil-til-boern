import { describe, expect, it } from 'vitest';
import { shouldShowRotateHint } from '@/utils/viewport';

describe('shouldShowRotateHint', () => {
  it('viser rotationshjælp på en telefon i portræt', () => {
    expect(shouldShowRotateHint(390, 844, true)).toBe(true);
  });

  it('viser ikke hjælp i landskab', () => {
    expect(shouldShowRotateHint(844, 390, true)).toBe(false);
  });

  it('viser ikke hjælp uden touch', () => {
    expect(shouldShowRotateHint(390, 844, false)).toBe(false);
  });

  it('viser ikke hjælp på store skærme', () => {
    expect(shouldShowRotateHint(1200, 1600, true)).toBe(false);
  });
});
