import {
  ACCESSORY_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  type ColorOption,
  type StyleOption,
} from '@/game/catalog/appearance';
import type { SeasonThemeId } from '@/game/catalog/seasons';
import { wardrobeItemId } from '@/game/catalog/wardrobe';
import { text } from '@/game/text';
import type { ItemCategory, WardrobeSlot } from '@/game/types';

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
  requiredPurchases: number;
  color?: number;
  wardrobeSlot?: WardrobeSlot;
  appearanceId?: string;
  season?: SeasonThemeId;
  petAccessory?: {
    y: number;
    scale: number;
  };
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
  requiredPurchases = 0,
  season?: SeasonThemeId,
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
    requiredPurchases,
    season,
  };
}

function collectible(
  id: string,
  category: 'accessory' | 'treat',
  label: string,
  price: number,
  assetKey: string,
  requiredPurchases = 0,
  season?: SeasonThemeId,
  petAccessory?: { y: number; scale: number },
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
    requiredPurchases,
    season,
    petAccessory,
  };
}

function requireStyle(options: readonly StyleOption[], id: string): StyleOption {
  const option = options.find((entry) => entry.id === id);
  if (!option) {
    throw new Error(`Unknown wardrobe style: ${id}`);
  }
  return option;
}

function requireColor(options: readonly ColorOption[], id: string): ColorOption {
  const option = options.find((entry) => entry.id === id);
  if (!option) {
    throw new Error(`Unknown wardrobe color: ${id}`);
  }
  return option;
}

function wardrobeStyle(
  slot: WardrobeSlot,
  appearanceId: string,
  label: string,
  price: number,
  assetKey: string,
): ItemDefinition {
  return {
    id: wardrobeItemId(slot, appearanceId),
    category: 'wardrobe',
    label,
    price,
    assetKey,
    width: 384,
    height: 384,
    gridWidth: 0,
    gridHeight: 0,
    placeable: false,
    requiredPurchases: 0,
    wardrobeSlot: slot,
    appearanceId,
  };
}

function wardrobeColor(
  slot: WardrobeSlot,
  appearanceId: string,
  label: string,
  price: number,
  color: number,
): ItemDefinition {
  return {
    id: wardrobeItemId(slot, appearanceId),
    category: 'wardrobe',
    label,
    price,
    assetKey: '',
    width: 96,
    height: 96,
    gridWidth: 0,
    gridHeight: 0,
    placeable: false,
    requiredPurchases: 0,
    color,
    wardrobeSlot: slot,
    appearanceId,
  };
}

const BASE_ITEMS: readonly ItemDefinition[] = [
  placeable('sofa', 'furniture', text.items.sofa, 35, 'furniture-sofa', 4, 2),
  placeable('chair', 'furniture', text.items.chair, 18, 'furniture-chair', 2, 2),
  placeable('table', 'furniture', text.items.table, 22, 'furniture-table', 2, 2),
  placeable('rug', 'furniture', text.items.rug, 15, 'furniture-rug', 3, 2),
  placeable('bed', 'furniture', text.items.bed, 45, 'furniture-bed', 4, 3),
  placeable('shelf', 'furniture', text.items.shelf, 30, 'furniture-shelf', 2, 3),
  placeable('lamp', 'furniture', text.items.lamp, 10, 'furniture-lamp', 1, 2),
  placeable('plant', 'furniture', text.items.plant, 12, 'furniture-plant', 1, 2),
  placeable('wardrobe', 'furniture', text.items.wardrobe, 40, 'furniture-wardrobe', 2, 3),
  placeable('cushion', 'furniture', text.items.cushion, 16, 'furniture-cushion', 2, 1, 2),
  placeable('mirror', 'furniture', text.items.mirror, 24, 'furniture-mirror', 1, 2, 3),
  placeable('tv', 'furniture', text.items.tv, 55, 'furniture-tv', 3, 2, 7),
  placeable('desk', 'furniture', text.items.desk, 32, 'furniture-desk', 3, 2),
  placeable('bookshelf', 'furniture', text.items.bookshelf, 38, 'furniture-bookshelf', 2, 3, 3),
  placeable('stool', 'furniture', text.items.stool, 10, 'furniture-stool', 1, 1),
  placeable('beanbag', 'furniture', text.items.beanbag, 24, 'furniture-beanbag', 2, 2, 3),
  placeable('toy-box', 'furniture', text.items.toyBox, 28, 'furniture-toy-box', 2, 2, 5),
  placeable('fish-tank', 'furniture', text.items.fishTank, 60, 'furniture-fish-tank', 3, 2, 9),
  placeable('cactus', 'furniture', text.items.cactus, 14, 'furniture-cactus', 1, 2),
  placeable('side-table', 'furniture', text.items.sideTable, 18, 'furniture-side-table', 2, 1, 2),
  placeable('armchair', 'furniture', text.items.armchair, 42, 'furniture-armchair', 2, 2),
  placeable(
    'coffee-table',
    'furniture',
    text.items.coffeeTable,
    26,
    'furniture-coffee-table',
    3,
    2,
  ),
  placeable('cabinet', 'furniture', text.items.cabinet, 44, 'furniture-cabinet', 2, 2, 7),
  placeable('round-rug', 'furniture', text.items.roundRug, 18, 'furniture-round-rug', 2, 2),
  placeable('floor-lamp', 'furniture', text.items.floorLamp, 20, 'furniture-floor-lamp', 1, 2),
  placeable('ottoman', 'furniture', text.items.ottoman, 16, 'furniture-ottoman', 2, 1),
  placeable('vanity', 'furniture', text.items.vanity, 48, 'furniture-vanity', 2, 2, 9),
  placeable('fireplace', 'furniture', text.items.fireplace, 80, 'furniture-fireplace', 3, 2, 12),
  placeable('globe', 'furniture', text.items.globe, 22, 'furniture-globe', 1, 2, 3),
  placeable('guitar', 'furniture', text.items.guitar, 30, 'furniture-guitar', 1, 2, 5),
  placeable('pet-bed', 'furniture', text.items.petBed, 20, 'furniture-pet-bed', 2, 1, 2),
  placeable(
    'rocking-chair',
    'furniture',
    text.items.rockingChair,
    50,
    'furniture-rocking-chair',
    2,
    2,
    12,
  ),
  placeable(
    'pumpkin',
    'furniture',
    text.items.pumpkin,
    18,
    'furniture-pumpkin',
    1,
    1,
    0,
    'halloween',
  ),
  placeable(
    'christmas-tree',
    'furniture',
    text.items.christmasTree,
    60,
    'furniture-christmas-tree',
    2,
    3,
    0,
    'christmas',
  ),
  placeable(
    'bonfire',
    'furniture',
    text.items.bonfire,
    30,
    'furniture-bonfire',
    2,
    2,
    0,
    'sankthans',
  ),
  placeable('ball', 'toy', text.items.ball, 8, 'toy-ball', 1, 1),
  placeable('teddy', 'toy', text.items.teddy, 14, 'toy-teddy', 1, 2),
  placeable('scratching-post', 'toy', text.items.scratchingPost, 26, 'toy-scratching-post', 2, 3),
  placeable('frisbee', 'toy', text.items.frisbee, 9, 'toy-frisbee', 1, 1, 2),
  placeable('blocks', 'toy', text.items.blocks, 20, 'toy-blocks', 2, 1, 3),
  placeable('train-set', 'toy', text.items.trainSet, 22, 'toy-train-set', 2, 1, 6),
  placeable('puzzle', 'toy', text.items.puzzle, 12, 'toy-puzzle', 1, 1),
  placeable('yarn-ball', 'toy', text.items.yarnBall, 8, 'toy-yarn-ball', 1, 1),
  placeable('dollhouse', 'toy', text.items.dollhouse, 50, 'toy-dollhouse', 2, 2, 6),
  placeable('kite', 'toy', text.items.kite, 10, 'toy-kite', 1, 2, 2),
  placeable('robot', 'toy', text.items.robot, 24, 'toy-robot', 1, 2, 3),
  placeable('skateboard', 'toy', text.items.skateboard, 18, 'toy-skateboard', 2, 1),
  placeable('bunny', 'toy', text.items.bunny, 15, 'toy-bunny', 1, 2),
  placeable('crayons', 'toy', text.items.crayons, 14, 'toy-crayons', 2, 1),
  placeable('xylophone', 'toy', text.items.xylophone, 20, 'toy-xylophone', 2, 1, 4),
  placeable('car', 'toy', text.items.car, 10, 'toy-car', 1, 1),
  placeable('tea-set', 'toy', text.items.teaSet, 18, 'toy-tea-set', 2, 1, 4),
  placeable('easter-eggs', 'toy', text.items.easterEggs, 12, 'toy-easter-eggs', 1, 1, 0, 'easter'),
  placeable('beach-ball', 'toy', text.items.beachBall, 10, 'toy-beach-ball', 1, 1, 0, 'summer'),
  collectible('bow', 'accessory', text.items.bow, 10, 'accessory-bow-item'),
  collectible('crown', 'accessory', text.items.crown, 25, 'accessory-crown'),
  collectible('bandana', 'accessory', text.items.bandana, 15, 'accessory-bandana'),
  collectible('hat', 'accessory', text.items.hat, 18, 'accessory-hat', 2),
  collectible('scarf', 'accessory', text.items.scarf, 22, 'accessory-scarf', 4),
  collectible(
    'santa-hat',
    'accessory',
    text.items.santaHat,
    20,
    'accessory-santa-hat',
    0,
    'christmas',
    {
      y: -0.64,
      scale: 0.4,
    },
  ),
  collectible(
    'bunny-ears',
    'accessory',
    text.items.bunnyEars,
    18,
    'accessory-bunny-ears',
    0,
    'easter',
    {
      y: -0.58,
      scale: 0.42,
    },
  ),
  collectible(
    'flower-wreath',
    'accessory',
    text.items.flowerWreath,
    18,
    'accessory-flower-wreath',
    0,
    'spring',
    { y: -0.54, scale: 0.42 },
  ),
  collectible(
    'autumn-scarf',
    'accessory',
    text.items.autumnScarf,
    20,
    'accessory-autumn-scarf',
    0,
    'autumn',
  ),
  collectible('cookie', 'treat', text.items.cookie, 5, 'treat-cookie'),
  collectible('carrot', 'treat', text.items.carrot, 6, 'treat-carrot'),
  collectible('apple', 'treat', text.items.apple, 6, 'treat-apple'),
  collectible('fish-treat', 'treat', text.items.fishTreat, 7, 'treat-fish', 6),
  collectible('banana', 'treat', text.items.banana, 5, 'treat-banana'),
  collectible('strawberry', 'treat', text.items.strawberry, 6, 'treat-strawberry'),
  collectible('cheese', 'treat', text.items.cheese, 6, 'treat-cheese'),
  collectible('bone', 'treat', text.items.bone, 7, 'treat-bone'),
  collectible('cupcake', 'treat', text.items.cupcake, 8, 'treat-cupcake', 2),
  collectible('watermelon', 'treat', text.items.watermelon, 7, 'treat-watermelon'),
  collectible('broccoli', 'treat', text.items.broccoli, 5, 'treat-broccoli'),
  collectible('donut', 'treat', text.items.donut, 8, 'treat-donut', 4),
];

const HAIR_PRICES: readonly (readonly [string, number])[] = [
  ['short', 0],
  ['long', 0],
  ['curly', 0],
  ['bun', 10],
  ['braid', 10],
  ['ponytail', 10],
  ['pigtails', 10],
  ['bob', 12],
  ['wavy', 12],
  ['afro', 14],
  ['mohawk', 16],
];

const HAIR_COLOR_PRICES: readonly (readonly [string, number])[] = [
  ['brown', 0],
  ['black', 0],
  ['blonde', 0],
  ['red', 0],
  ['blue', 6],
  ['purple', 6],
  ['orange', 6],
  ['pink', 6],
  ['mint', 6],
  ['silver', 6],
];

const OUTFIT_PRICES: readonly (readonly [string, number])[] = [
  ['tshirt', 0],
  ['dress', 0],
  ['overalls', 0],
  ['tank', 12],
  ['hoodie', 14],
  ['shirt', 14],
  ['sweater', 14],
  ['pajamas', 14],
  ['apron', 14],
  ['raincoat', 16],
  ['jacket', 16],
  ['vest', 16],
  ['poncho', 18],
  ['tracksuit', 18],
  ['kimono', 20],
  ['princess', 22],
  ['superhero', 22],
];

const OUTFIT_COLOR_PRICES: readonly (readonly [string, number])[] = [
  ['teal', 0],
  ['coral', 0],
  ['yellow', 0],
  ['blue', 0],
  ['pink', 6],
  ['green', 6],
  ['orange', 6],
  ['mint', 6],
  ['lavender', 6],
  ['navy', 6],
];

const ACCESSORY_PRICES: readonly (readonly [string, number])[] = [
  ['glasses', 0],
  ['cap', 0],
  ['bow', 10],
  ['headphones', 14],
  ['scarf', 12],
  ['beanie', 10],
  ['flower', 10],
  ['crown', 20],
  ['earrings', 12],
  ['starGlasses', 14],
  ['mask', 12],
  ['necklace', 14],
  ['backpack', 16],
  ['catEars', 14],
  ['sunhat', 16],
];

const HAIR_ITEMS = HAIR_PRICES.map(([appearanceId, price]) => {
  const style = requireStyle(HAIR_STYLES, appearanceId);
  return wardrobeStyle('hair', appearanceId, style.label, price, style.assetKey);
});

const HAIR_COLOR_ITEMS = HAIR_COLOR_PRICES.map(([appearanceId, price]) => {
  const color = requireColor(HAIR_COLORS, appearanceId);
  return wardrobeColor('hairColor', appearanceId, color.label, price, color.color);
});

const OUTFIT_ITEMS = OUTFIT_PRICES.map(([appearanceId, price]) => {
  const style = requireStyle(OUTFIT_STYLES, appearanceId);
  return wardrobeStyle('outfit', appearanceId, style.label, price, style.assetKey);
});

const OUTFIT_COLOR_ITEMS = OUTFIT_COLOR_PRICES.map(([appearanceId, price]) => {
  const color = requireColor(OUTFIT_COLORS, appearanceId);
  return wardrobeColor('outfitColor', appearanceId, color.label, price, color.color);
});

const ACCESSORY_ITEMS = ACCESSORY_PRICES.map(([appearanceId, price]) => {
  const style = requireStyle(ACCESSORY_STYLES, appearanceId);
  return wardrobeStyle('accessory', appearanceId, style.label, price, style.assetKey);
});

export const ITEMS: readonly ItemDefinition[] = [
  ...BASE_ITEMS,
  ...OUTFIT_ITEMS,
  ...HAIR_ITEMS,
  ...OUTFIT_COLOR_ITEMS,
  ...HAIR_COLOR_ITEMS,
  ...ACCESSORY_ITEMS,
];

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): ItemDefinition | undefined {
  return ITEMS_BY_ID.get(id);
}

export function itemsByCategory(category: ItemCategory): readonly ItemDefinition[] {
  return ITEMS.filter((item) => item.category === category);
}

export function categoryPurchaseCount(
  purchases: Readonly<Record<string, number>>,
  category: ItemCategory,
): number {
  return itemsByCategory(category).reduce(
    (total, item) => total + Math.max(0, Math.floor(purchases[item.id] ?? 0)),
    0,
  );
}

export function isItemUnlocked(item: ItemDefinition, categoryPurchases: number): boolean {
  return Number.isFinite(categoryPurchases) && categoryPurchases >= item.requiredPurchases;
}

export function firstTreatId(
  store: {
    readonly inventory: Readonly<Record<string, number>>;
  },
  preferredIds: readonly string[] = [],
): string | null {
  for (const itemId of preferredIds) {
    const item = getItem(itemId);
    if (item?.category === 'treat' && (store.inventory[item.id] ?? 0) > 0) {
      return item.id;
    }
  }
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

export function isItemInSeason(item: ItemDefinition, themeId: SeasonThemeId): boolean {
  return item.season === themeId;
}

export const PLACEABLE_ITEMS = ITEMS.filter((item) => item.placeable);
