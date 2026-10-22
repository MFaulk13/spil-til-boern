import { describe, expect, it } from 'vitest';
import { ITEMS } from '@/game/catalog/items';
import { createDefaultSave } from '@/systems/save';
import { CARE_EFFECTS, MOOD_THRESHOLDS, NEED_DECAY_PER_SECOND } from '@/systems/pet';

describe('balance', () => {
  it('keeps every care action positive without being overwhelming', () => {
    for (const effect of Object.values(CARE_EFFECTS)) {
      expect(effect.amount).toBeGreaterThan(0);
      expect(effect.amount).toBeLessThanOrEqual(40);
      expect(effect.hearts).toBeGreaterThanOrEqual(1);
      expect(effect.hearts).toBeLessThanOrEqual(3);
    }
  });

  it('lets a child earn enough for the cheapest item quickly', () => {
    const cheapestPrice = Math.min(...ITEMS.map((item) => item.price));
    const averageCareHearts =
      Object.values(CARE_EFFECTS).reduce((total, effect) => total + effect.hearts, 0) /
      Object.values(CARE_EFFECTS).length;

    expect(averageCareHearts * 3 + createDefaultSave().wallet.hearts).toBeGreaterThanOrEqual(
      cheapestPrice,
    );
  });

  it('spreads item prices and unlocks across the whole game', () => {
    const prices = ITEMS.map((item) => item.price);
    expect(Math.min(...prices)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...prices)).toBeLessThanOrEqual(80);

    const unlockThresholds = ITEMS.map((item) => item.unlockAt).filter((value) => value > 0);
    expect(new Set(unlockThresholds).size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...unlockThresholds)).toBeLessThanOrEqual(80);
  });

  it('keeps needs calm enough that a short break is never punishing', () => {
    expect(NEED_DECAY_PER_SECOND.hunger * 60).toBeLessThanOrEqual(4);
    expect(NEED_DECAY_PER_SECOND.joy * 60).toBeLessThanOrEqual(3);
    expect(NEED_DECAY_PER_SECOND.energy * 60).toBeLessThanOrEqual(2);
    expect(MOOD_THRESHOLDS.happy).toBeGreaterThan(MOOD_THRESHOLDS.okay);
    expect(MOOD_THRESHOLDS.okay).toBeGreaterThan(0);
  });
});
