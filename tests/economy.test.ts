import { describe, expect, it } from 'vitest';
import { canAfford, itemCount, purchase, rewardCare, useItem } from '@/systems/economy';
import { createMemoryStorage, SaveManager } from '@/systems/save';

function createStore(hearts = 20): SaveManager {
  const store = new SaveManager(createMemoryStorage());
  const difference = hearts - store.hearts;
  if (difference > 0) {
    store.addHearts(difference);
  } else if (difference < 0) {
    store.spendHearts(-difference);
  }
  return store;
}

describe('economy', () => {
  it('reports whether an item is affordable', () => {
    const store = createStore(10);

    expect(canAfford(store, 10)).toBe(true);
    expect(canAfford(store, 11)).toBe(false);
    expect(canAfford(store, -1)).toBe(false);
    expect(canAfford(store, Number.NaN)).toBe(false);
  });

  it('buys an item and deducts hearts', () => {
    const store = createStore(20);
    const result = purchase(store, 'treat', 5);

    expect(result).toEqual({ ok: true, hearts: 15 });
    expect(itemCount(store, 'treat')).toBe(1);
  });

  it('stacks repeat purchases in the inventory', () => {
    const store = createStore(20);

    purchase(store, 'treat', 5);
    purchase(store, 'treat', 5);

    expect(itemCount(store, 'treat')).toBe(2);
    expect(store.hearts).toBe(10);
  });

  it('refuses purchases that cost more than the wallet holds', () => {
    const store = createStore(10);
    const before = store.hearts;

    const result = purchase(store, 'rug', 80);

    expect(result).toEqual({ ok: false, reason: 'insufficient-hearts', hearts: before });
    expect(store.hearts).toBe(before);
    expect(itemCount(store, 'rug')).toBe(0);
  });

  it('rejects invalid items and prices', () => {
    const store = createStore(20);

    expect(purchase(store, '   ', 10)).toMatchObject({ ok: false, reason: 'invalid-item' });
    expect(purchase(store, 'rug', -5)).toMatchObject({ ok: false, reason: 'invalid-price' });
    expect(purchase(store, 'rug', Number.NaN)).toMatchObject({
      ok: false,
      reason: 'invalid-price',
    });
    expect(store.hearts).toBe(20);
  });

  it('allows free items without deducting hearts', () => {
    const store = createStore(0);

    expect(purchase(store, 'gift', 0)).toEqual({ ok: true, hearts: 0 });
    expect(itemCount(store, 'gift')).toBe(1);
  });

  it('consumes items that exist and ignores missing ones', () => {
    const store = createStore(20);
    purchase(store, 'treat', 5);

    expect(useItem(store, 'treat')).toBe(true);
    expect(itemCount(store, 'treat')).toBe(0);
    expect(useItem(store, 'treat')).toBe(false);
  });

  it('rewards care hearts only for positive amounts', () => {
    const store = createStore(0);
    const before = store.hearts;

    expect(rewardCare(store, 3)).toBe(3);
    expect(store.hearts).toBe(before + 3);
    expect(rewardCare(store, 0)).toBe(0);
    expect(rewardCare(store, -2)).toBe(0);
  });
});
