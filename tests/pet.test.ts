import { describe, expect, it } from 'vitest';
import {
  CARE_EFFECTS,
  LOW_NEED_THRESHOLD,
  NEED_DECAY_PER_SECOND,
  applyCare,
  isNeedLow,
  lowestNeed,
  moodOf,
  tickNeeds,
} from '@/systems/pet';
import type { Needs } from '@/game/types';

const full: Needs = { hunger: 100, joy: 100, energy: 100 };
const mid: Needs = { hunger: 50, joy: 50, energy: 50 };

describe('tickNeeds', () => {
  it('does not change needs without elapsed time', () => {
    expect(tickNeeds(mid, 0)).toEqual(mid);
    expect(tickNeeds(mid, -10)).toEqual(mid);
  });

  it('drops each need at its own pace', () => {
    const after = tickNeeds(full, 36);

    expect(after.hunger).toBeCloseTo(100 - NEED_DECAY_PER_SECOND.hunger * 36);
    expect(after.joy).toBeCloseTo(100 - NEED_DECAY_PER_SECOND.joy * 36);
    expect(after.energy).toBeCloseTo(100 - NEED_DECAY_PER_SECOND.energy * 36);
    expect(after.hunger).toBeCloseTo(98);
    expect(after.joy).toBeCloseTo(98.5);
    expect(after.energy).toBeCloseTo(99);
  });

  it('never drops below zero', () => {
    expect(tickNeeds({ hunger: 1, joy: 2, energy: 3 }, 100_000)).toEqual({
      hunger: 0,
      joy: 0,
      energy: 0,
    });
  });

  it('ignores invalid elapsed time', () => {
    expect(tickNeeds(mid, Number.NaN)).toEqual(mid);
  });
});

describe('applyCare', () => {
  it('feeds, plays, pets and lets the pet sleep with the designed effects', () => {
    expect(applyCare({ hunger: 40, joy: 40, energy: 40 }, 'feed').needs.hunger).toBe(75);
    expect(applyCare({ hunger: 40, joy: 40, energy: 40 }, 'play').needs.joy).toBe(70);
    expect(applyCare({ hunger: 40, joy: 40, energy: 40 }, 'pet').needs.joy).toBe(55);
    expect(applyCare({ hunger: 40, joy: 40, energy: 40 }, 'sleep').needs.energy).toBe(80);
  });

  it('clamps the raised need at 100', () => {
    expect(applyCare({ hunger: 90, joy: 50, energy: 50 }, 'feed').needs.hunger).toBe(100);
  });

  it('only gives hearts when the need actually rises', () => {
    const cared = applyCare(mid, 'play');
    expect(cared.gained).toBe(CARE_EFFECTS.play.amount);
    expect(cared.hearts).toBe(CARE_EFFECTS.play.hearts);

    const capped = applyCare({ hunger: 100, joy: 95, energy: 50 }, 'pet');
    expect(capped.gained).toBe(5);
    expect(capped.hearts).toBe(CARE_EFFECTS.pet.hearts);

    const fullJoy = applyCare({ hunger: 80, joy: 100, energy: 50 }, 'pet');
    expect(fullJoy.gained).toBe(0);
    expect(fullJoy.hearts).toBe(0);
    expect(fullJoy.needs.joy).toBe(100);
  });
});

describe('moodOf', () => {
  it('uses the average of all three needs', () => {
    expect(moodOf({ hunger: 80, joy: 80, energy: 80 })).toBe('happy');
    expect(moodOf({ hunger: 45, joy: 45, energy: 45 })).toBe('okay');
    expect(moodOf({ hunger: 20, joy: 20, energy: 20 })).toBe('sad');
  });

  it('treats the thresholds as inclusive', () => {
    expect(moodOf({ hunger: 75, joy: 75, energy: 75 })).toBe('happy');
    expect(moodOf({ hunger: 40, joy: 40, energy: 40 })).toBe('okay');
    expect(moodOf({ hunger: 39.9, joy: 39.9, energy: 39.9 })).toBe('sad');
  });
});

describe('need helpers', () => {
  it('finds the lowest need', () => {
    expect(lowestNeed({ hunger: 70, joy: 20, energy: 50 })).toBe('joy');
    expect(lowestNeed({ hunger: 10, joy: 70, energy: 50 })).toBe('hunger');
  });

  it('detects when any need is low', () => {
    expect(isNeedLow({ hunger: 90, joy: 90, energy: LOW_NEED_THRESHOLD - 1 })).toBe(true);
    expect(isNeedLow({ hunger: 90, joy: 90, energy: LOW_NEED_THRESHOLD })).toBe(false);
  });
});
