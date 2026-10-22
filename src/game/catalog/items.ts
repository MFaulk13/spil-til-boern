import { text } from '@/game/text';
import type { ItemCategory } from '@/game/types';

export interface ItemDefinition {
  id: string;
  category: ItemCategory;
  label: string;
  price: number;
  assetKey: string;
  width: number;
  height: number;
  gridWidth: number;
  gridHeight: number;
  placeable: boolean;
  unlockAt: number;
}

const CELL = 64;

function placeable(
  id: string,
  category: 'furniture' | 'toy',
  label: string,
  price: number,
  assetKey: string,
  gridWidth: number,
  gridHeight: number,
  unlockAt = 0,
): ItemDefinition {
  return {
    id,
    category,
    label,
    price,
    assetKey,
    width: gridWidth * CELL,
    height: gridHeight * CELL,
    gridWidth,
    gridHeight,
    placeable: true,
    unlockAt,
  };
}

function collectible(
  id: string,
  category: 'accessory' | 'treat',
  label: string,
  price: number,
  assetKey: string,
  unlockAt = 0,
): ItemDefinition {
  return {
    id,
    category,
    label,
    price,
    assetKey,
    width: 96,
    height: 96,
    gridWidth: 0,
    gridHeight: 0,
    placeable: false,
    unlockAt,
  };
}

export const ITEMS: readonly ItemDefinition[] = [
  placeable('sofa', 'furniture', text.items.sofa, 35, 'furniture-sofa', 4, 2),
  placeable('chair', 'furniture', text.items.chair, 18, 'furniture-chair', 2, 2),
  placeable('table', 'furniture', text.items.table, 22, 'furniture-table', 2, 2),
  placeable('rug', 'furniture', text.items.rug, 15, 'furniture-rug', 3, 2),
  placeable('bed', 'furniture', text.items.bed, 45, 'furniture-bed', 4, 3),
  placeable('shelf', 'furniture', text.items.shelf, 30, 'furniture-shelf', 2, 3),
  placeable('lamp', 'furniture', text.items.lamp, 10, 'furniture-lamp', 1, 2),
  placeable('plant', 'furniture', text.items.plant, 12, 'furniture-plant', 1, 2),
  placeable('wardrobe', 'furniture', text.items.wardrobe, 40, 'furniture-wardrobe', 2, 3),
  placeable('cushion', 'furniture', text.items.cushion, 16, 'furniture-cushion', 2, 1, 20),
  placeable('mirror', 'furniture', text.items.mirror, 24, 'furniture-mirror', 1, 2, 30),
  placeable('tv', 'furniture', text.items.tv, 55, 'furniture-tv', 3, 2, 40),
  placeable('ball', 'toy', text.items.ball, 8, 'toy-ball', 1, 1),
  placeable('teddy', 'toy', text.items.teddy, 14, 'toy-teddy', 1, 2),
  placeable('scratching-post', 'toy', text.items.scratchingPost, 26, 'toy-scratching-post', 2, 3),
  placeable('frisbee', 'toy', text.items.frisbee, 9, 'toy-frisbee', 1, 1, 15),
  placeable('blocks', 'toy', text.items.blocks, 20, 'toy-blocks', 2, 1, 25),
  collectible('bow', 'accessory', text.items.bow, 10, 'accessory-bow-item'),
  collectible('crown', 'accessory', text.items.crown, 25, 'accessory-crown'),
  collectible('bandana', 'accessory', text.items.bandana, 15, 'accessory-bandana'),
  collectible('hat', 'accessory', text.items.hat, 18, 'accessory-hat', 35),
  collectible('scarf', 'accessory', text.items.scarf, 22, 'accessory-scarf', 50),
  collectible('cookie', 'treat', text.items.cookie, 5, 'treat-cookie'),
  collectible('carrot', 'treat', text.items.carrot, 6, 'treat-carrot'),
  collectible('apple', 'treat', text.items.apple, 6, 'treat-apple'),
  collectible('fish-treat', 'treat', text.items.fishTreat, 7, 'treat-fish', 60),
];

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS_BY_ID.get(id);
}

export function itemsByCategory(category: ItemCategory): readonly ItemDefinition[] {
  return ITEMS.filter((item) => item.category === category);
}

export function isItemUnlocked(item: ItemDefinition, earnedHearts: number): boolean {
  return Number.isFinite(earnedHearts) && earnedHearts >= item.unlockAt;
}

export function firstTreatId(store: {
  readonly inventory: Readonly<Record<string, number>>;
}): string | null {
  for (const item of itemsByCategory('treat')) {
    if ((store.inventory[item.id] ?? 0) > 0) {
      return item.id;
    }
  }
  return null;
}

export function treatCount(store: {
  readonly inventory: Readonly<Record<string, number>>;
}): number {
  return itemsByCategory('treat').reduce(
    (total, item) => total + (store.inventory[item.id] ?? 0),
    0,
  );
}

export const PLACEABLE_ITEMS = ITEMS.filter((item) => item.placeable);
