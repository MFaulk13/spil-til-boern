import { describe, expect, it } from 'vitest';
import {
  BOND_LEVELS,
  CARE_EFFECTS,
  LOW_NEED_THRESHOLD,
  NEED_DECAY_PER_SECOND,
  applyCare,
  bondLevelIndex,
  careFactor,
  isNeedLow,
  lowestNeed,
  moodOf,
  tickNeeds,
} from '@/systems/pet';
import type { Needs } from '@/game/types';

const full: Needs = { hunger: 100, joy: 100, energy: 100 };
const mid: Needs = { hunger: 50, joy: 50, energy: 50 };

function needsAt(value: number): Needs {
  return { hunger: value, joy: value, energy: value };
}

describe('tickNeeds', () => {
  it('does not change needs without elapsed time', () => {
    expect(tickNeeds(mid, 0)).toEqual(mid);
    expect(tickNeeds(mid, -10)).toEqual(mid);
    expect(tickNeeds(mid, Number.NaN)).toEqual(mid);
  });

  it('drops each need at its own pace', () => {
    const after = tickNeeds(full, 36);

    expect(after.hunger).toBeCloseTo(100 - NEED_DECAY_PER_SECOND.hunger * 36);
    expect(after.joy).toBeCloseTo(100 - NEED_DECAY_PER_SECOND.joy * 36);
    expect(after.energy).toBeCloseTo(100 - NEED_DECAY_PER_SECOND.energy * 36);
    expect(after.hunger).toBeCloseTo(97);
    expect(after.joy).toBeCloseTo(97.6);
    expect(after.energy).toBeCloseTo(98.2);
  });

  it('applies species decay multipliers', () => {
    const after = tickNeeds(full, 60, { hunger: 2, joy: 0.5, energy: 1 });

    expect(after.hunger).toBeCloseTo(90);
    expect(after.joy).toBeCloseTo(98);
    expect(after.energy).toBeCloseTo(97);
  });

  it('never drops below zero', () => {
    expect(tickNeeds({ hunger: 1, joy: 2, energy: 3 }, 100_000)).toEqual({
      hunger: 0,
      joy: 0,
      energy: 0,
    });
  });
});

describe('careFactor', () => {
  it('keeps full effect below the soft cap and halves it near the top', () => {
    expect(careFactor(0)).toBe(1);
    expect(careFactor(84.9)).toBe(1);
    expect(careFactor(85)).toBe(0.5);
    expect(careFactor(94.9)).toBe(0.5);
    expect(careFactor(95)).toBe(0.25);
    expect(careFactor(100)).toBe(0.25);
  });
});

describe('applyCare', () => {
  it('uses the designed base effects', () => {
    expect(applyCare(needsAt(40), 'feed').needs.hunger).toBe(65);
    expect(applyCare(needsAt(40), 'play').needs.joy).toBe(65);
    expect(applyCare(needsAt(40), 'pet').needs.joy).toBe(52);
    expect(applyCare(needsAt(40), 'sleep').needs.energy).toBe(70);

    const treat = applyCare(needsAt(40), 'treat');
    expect(treat.needs.hunger).toBe(55);
    expect(treat.needs.joy).toBe(44);
  });

  it('clamps raised needs at 100 and reports diminishing returns', () => {
    const nearFull = applyCare({ hunger: 90, joy: 50, energy: 50 }, 'feed');
    expect(nearFull.needs.hunger).toBe(100);
    expect(nearFull.gained).toBe(10);
    expect(nearFull.diminished).toBe(true);

    const normal = applyCare({ hunger: 40, joy: 50, energy: 50 }, 'feed');
    expect(normal.diminished).toBe(false);
  });

  it('gives bond only when the need was below 60', () => {
    expect(applyCare({ hunger: 30, joy: 50, energy: 50 }, 'feed').bond).toBe(3);
    expect(applyCare({ hunger: 50, joy: 50, energy: 50 }, 'feed').bond).toBe(1);
    expect(applyCare({ hunger: 70, joy: 50, energy: 50 }, 'feed').bond).toBe(0);
  });

  it('adds a bond point for the favourite action', () => {
    const favourite = applyCare({ hunger: 50, joy: 30, energy: 50 }, 'play', { petId: 'dog' });
    const plain = applyCare({ hunger: 50, joy: 30, energy: 50 }, 'feed', { petId: 'dog' });
    const midJoy = applyCare({ hunger: 50, joy: 50, energy: 50 }, 'play', { petId: 'dog' });

    expect(favourite.favorite).toBe(true);
    expect(favourite.bond).toBe(4);
    expect(plain.favorite).toBe(false);
    expect(plain.bond).toBe(1);
    expect(midJoy.bond).toBe(2);
    expect(applyCare({ hunger: 50, joy: 70, energy: 50 }, 'play', { petId: 'dog' }).bond).toBe(0);
  });

  it('gives a favourite treat a bigger effect and extra bond', () => {
    const favourite = applyCare({ hunger: 40, joy: 40, energy: 40 }, 'treat', {
      petId: 'dog',
      treatId: 'bone',
    });
    expect(favourite.needs.hunger).toBe(62);
    expect(favourite.needs.joy).toBe(48);
    expect(favourite.favorite).toBe(true);
    expect(favourite.bond).toBe(2);

    const ordinary = applyCare({ hunger: 40, joy: 40, energy: 40 }, 'treat', {
      petId: 'dog',
      treatId: 'cookie',
    });
    expect(ordinary.needs.hunger).toBe(55);
    expect(ordinary.needs.joy).toBe(44);
    expect(ordinary.favorite).toBe(false);
    expect(ordinary.bond).toBe(1);
  });

  it('keeps every care effect positive', () => {
    for (const effect of Object.values(CARE_EFFECTS)) {
      expect(effect.amount).toBeGreaterThan(0);
    }
  });
});

describe('moodOf', () => {
  it('uses a weighted mix of average and lowest need', () => {
    expect(moodOf(needsAt(80))).toBe('happy');
    expect(moodOf(needsAt(45))).toBe('okay');
    expect(moodOf(needsAt(20))).toBe('sad');
  });

  it('does not call a pet happy when one need is low', () => {
    expect(moodOf({ hunger: 30, joy: 100, energy: 100 })).toBe('okay');
    expect(moodOf({ hunger: 10, joy: 100, energy: 100 })).toBe('okay');
    expect(moodOf({ hunger: 60, joy: 100, energy: 100 })).toBe('happy');
  });

  it('treats the thresholds as inclusive', () => {
    expect(moodOf(needsAt(75))).toBe('happy');
    expect(moodOf(needsAt(40))).toBe('okay');
    expect(moodOf(needsAt(39.9))).toBe('sad');
  });
});

describe('bond levels', () => {
  it('maps bond points to levels', () => {
    expect(BOND_LEVELS).toHaveLength(5);
    expect(bondLevelIndex(-1)).toBe(0);
    expect(bondLevelIndex(Number.NaN)).toBe(0);
    expect(bondLevelIndex(0)).toBe(0);
    expect(bondLevelIndex(9)).toBe(0);
    expect(bondLevelIndex(10)).toBe(1);
    expect(bondLevelIndex(24)).toBe(1);
    expect(bondLevelIndex(25)).toBe(2);
    expect(bondLevelIndex(49)).toBe(2);
    expect(bondLevelIndex(50)).toBe(3);
    expect(bondLevelIndex(99)).toBe(3);
    expect(bondLevelIndex(100)).toBe(4);
    expect(bondLevelIndex(250)).toBe(4);
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
