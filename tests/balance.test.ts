import { describe, expect, it } from 'vitest';
import { ITEMS } from '@/game/catalog/items';
import { PETS } from '@/game/catalog/pets';
import { QUIZ_ROUND_LENGTH } from '@/game/catalog/quiz';
import { createDefaultSave } from '@/systems/save';
import { heartsForRound } from '@/systems/school';
import { CARE_EFFECTS, MOOD_THRESHOLDS, NEED_DECAY_PER_SECOND } from '@/systems/pet';

describe('balance', () => {
  it('keeps every care action positive without being overwhelming', () => {
    for (const effect of Object.values(CARE_EFFECTS)) {
      expect(effect.amount).toBeGreaterThan(0);
      expect(effect.amount).toBeLessThanOrEqual(40);
      expect(effect.hearts).toBe(0);
    }
  });

  it('lets a child earn enough for the cheapest item from one quiz round', () => {
    const cheapestPrice = Math.min(
      ...ITEMS.filter((item) => item.price > 0).map((item) => item.price),
    );
    const quizHearts = heartsForRound(3, true);

    expect(quizHearts + createDefaultSave().wallet.hearts).toBeGreaterThanOrEqual(cheapestPrice);
  });

  it('makes the cheapest wardrobe item reachable after one quiz round', () => {
    const cheapestWardrobe = Math.min(
      ...ITEMS.filter((item) => item.category === 'wardrobe' && item.price > 0).map(
        (item) => item.price,
      ),
    );
    const quizHearts = heartsForRound(3, true);

    expect(quizHearts + createDefaultSave().wallet.hearts).toBeGreaterThanOrEqual(cheapestWardrobe);
  });

  it('keeps a school round rewarding without replacing the shop economy', () => {
    const firstRound = heartsForRound(3, true);
    const repeatRound = heartsForRound(3, false);

    expect(firstRound).toBeLessThanOrEqual(20);
    expect(repeatRound).toBeLessThan(firstRound);
    expect(QUIZ_ROUND_LENGTH).toBe(5);
  });

  it('prices every pet adoption within reach of a few quiz rounds', () => {
    for (const pet of PETS) {
      expect(pet.adoptionPrice).toBeGreaterThanOrEqual(20);
      expect(pet.adoptionPrice).toBeLessThanOrEqual(80);
    }
  });

  it('spreads item prices and unlocks across the whole game', () => {
    const prices = ITEMS.filter((item) => item.price > 0).map((item) => item.price);
    expect(Math.min(...prices)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...prices)).toBeLessThanOrEqual(80);

    const unlockThresholds = ITEMS.map((item) => item.requiredPurchases).filter(
      (value) => value > 0,
    );
    expect(new Set(unlockThresholds).size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...unlockThresholds)).toBeLessThanOrEqual(12);
  });

  it('keeps needs calm enough that a short break is never punishing', () => {
    expect(NEED_DECAY_PER_SECOND.hunger * 60).toBeLessThanOrEqual(4);
    expect(NEED_DECAY_PER_SECOND.joy * 60).toBeLessThanOrEqual(3);
    expect(NEED_DECAY_PER_SECOND.energy * 60).toBeLessThanOrEqual(2);
    expect(MOOD_THRESHOLDS.happy).toBeGreaterThan(MOOD_THRESHOLDS.okay);
    expect(MOOD_THRESHOLDS.okay).toBeGreaterThan(0);
  });
});
