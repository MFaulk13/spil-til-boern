import { describe, expect, it } from 'vitest';
import { itemsByCategory } from '@/game/catalog/items';
import { TOY_PLAYS, getToyPlay, ownedToys } from '@/game/catalog/toys';
import type { PlacedFurniture } from '@/game/types';

const FURNITURE: PlacedFurniture = {
  uid: 'placed-1',
  itemId: 'sofa',
  room: 'living',
  x: 10,
  y: 20,
};

describe('toy play catalog', () => {
  it('gives every toy an explicit play style and a calm reward', () => {
    for (const item of itemsByCategory('toy')) {
      const play = getToyPlay(item.id);
      expect(TOY_PLAYS[item.id]).toBeDefined();
      expect(play.joy).toBeGreaterThan(0);
      expect(play.joy).toBeLessThanOrEqual(30);
      expect(['fetch', 'cuddle', 'build', 'music', 'create', 'scratch']).toContain(play.style);
    }
  });

  it('covers several different ways to play', () => {
    const styles = new Set(Object.values(TOY_PLAYS).map((play) => play.style));
    expect(styles.size).toBeGreaterThanOrEqual(5);
  });
});

describe('owned toys', () => {
  it('combines toys in the bag with toys placed at home', () => {
    const toys = ownedToys({
      inventory: { ball: 2, teddy: 1, cookie: 5, sofa: 1 },
      furniture: [FURNITURE],
    });

    expect(toys.map((toy) => toy.item.id)).toEqual(['ball', 'teddy']);
    expect(toys.find((toy) => toy.item.id === 'ball')?.count).toBe(2);
  });

  it('counts a placed toy as owned even when the bag is empty', () => {
    const toys = ownedToys({
      inventory: {},
      furniture: [{ ...FURNITURE, itemId: 'puzzle' }],
    });

    expect(toys).toHaveLength(1);
    expect(toys[0].item.id).toBe('puzzle');
    expect(toys[0].count).toBe(1);
  });

  it('ignores items that are not toys', () => {
    const toys = ownedToys({
      inventory: { sofa: 2, cookie: 3, crown: 1 },
      furniture: [],
    });

    expect(toys).toEqual([]);
  });
});
