import { getItem, itemsByCategory, type ItemDefinition } from '@/game/catalog/items';
import type { PlacedFurniture } from '@/game/types';

export type ToyPlayStyle = 'fetch' | 'cuddle' | 'build' | 'music' | 'create' | 'scratch';

export interface ToyPlayDefinition {
  style: ToyPlayStyle;
  joy: number;
}

export interface OwnedToy {
  item: ItemDefinition;
  count: number;
}

const DEFAULT_PLAY: ToyPlayDefinition = { style: 'cuddle', joy: 20 };

export const TOY_PLAYS: Readonly<Record<string, ToyPlayDefinition>> = {
  ball: { style: 'fetch', joy: 20 },
  frisbee: { style: 'fetch', joy: 22 },
  'yarn-ball': { style: 'fetch', joy: 20 },
  car: { style: 'fetch', joy: 18 },
  skateboard: { style: 'fetch', joy: 24 },
  kite: { style: 'fetch', joy: 24 },
  teddy: { style: 'cuddle', joy: 24 },
  bunny: { style: 'cuddle', joy: 22 },
  dollhouse: { style: 'cuddle', joy: 26 },
  'tea-set': { style: 'cuddle', joy: 22 },
  blocks: { style: 'build', joy: 24 },
  puzzle: { style: 'build', joy: 22 },
  'train-set': { style: 'build', joy: 24 },
  robot: { style: 'build', joy: 22 },
  xylophone: { style: 'music', joy: 24 },
  crayons: { style: 'create', joy: 22 },
  'scratching-post': { style: 'scratch', joy: 22 },
  'easter-eggs': { style: 'fetch', joy: 20 },
  'beach-ball': { style: 'fetch', joy: 24 },
};

export function getToyPlay(itemId: string): ToyPlayDefinition {
  return TOY_PLAYS[itemId] ?? DEFAULT_PLAY;
}

export function ownedToys(store: {
  readonly inventory: Readonly<Record<string, number>>;
  readonly furniture: readonly PlacedFurniture[];
}): OwnedToy[] {
  const counts = new Map<string, number>();

  for (const item of itemsByCategory('toy')) {
    const inBag = Math.floor(store.inventory[item.id] ?? 0);
    if (inBag > 0) {
      counts.set(item.id, inBag);
    }
  }

  for (const placed of store.furniture) {
    const item = getItem(placed.itemId);
    if (item?.category !== 'toy') {
      continue;
    }
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  }

  return itemsByCategory('toy')
    .filter((item) => (counts.get(item.id) ?? 0) > 0)
    .map((item) => ({ item, count: counts.get(item.id) ?? 0 }));
}
