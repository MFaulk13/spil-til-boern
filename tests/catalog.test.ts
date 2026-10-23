import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, CORE_ASSETS, LAZY_ASSETS, LAZY_SCENE_ASSET_KEYS } from '@/game/assets';
import {
  ACCESSORY_STYLES,
  DEFAULT_LOOK,
  EYE_STYLES,
  GENDER_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
} from '@/game/catalog/appearance';
import {
  categoryPurchaseCount,
  firstTreatId,
  ITEMS,
  getItem,
  isItemUnlocked,
  itemsByCategory,
  treatCount,
} from '@/game/catalog/items';
import { CARE_ACTIONS } from '@/game/care';
import { QUICK_START_EYES, QUICK_START_MOUTHS, wardrobeItemId } from '@/game/catalog/wardrobe';
import { PETS, createPetState, getPet, pickNewPetName } from '@/game/catalog/pets';
import { QUIZ_SUBJECT_INFO } from '@/game/catalog/quiz';
import { ROOMS } from '@/game/catalog/rooms';
import { isFreeWardrobeOption } from '@/systems/wardrobe';
import {
  createFullNeeds,
  ITEM_CATEGORIES,
  PET_IDS,
  ROOM_IDS,
  type RoomId,
  type WardrobeSlot,
} from '@/game/types';

const manifestKeys = new Set(ASSET_MANIFEST.map((asset) => asset.key));

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('asset manifest', () => {
  it('splits the manifest into eager core assets and lazy scene assets', () => {
    expect(CORE_ASSETS.length + LAZY_ASSETS.length).toBe(ASSET_MANIFEST.length);
    expect(LAZY_ASSETS.map((asset) => asset.key)).toEqual([...LAZY_SCENE_ASSET_KEYS]);
    expect(CORE_ASSETS.some((asset) => asset.key === 'room-living')).toBe(true);
  });

  it('has unique keys and valid sizes', () => {
    expectUnique(ASSET_MANIFEST.map((asset) => asset.key));
    for (const asset of ASSET_MANIFEST) {
      expect(asset.url.length).toBeGreaterThan(0);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
    }
  });

  it('contains every asset used by the catalogs', () => {
    const styleKeys = [
      ...GENDER_STYLES,
      ...HAIR_STYLES,
      ...EYE_STYLES,
      ...MOUTH_STYLES,
      ...OUTFIT_STYLES,
      ...ACCESSORY_STYLES,
    ]
      .map((style) => style.assetKey)
      .filter((key) => key.length > 0);

    for (const key of styleKeys) {
      expect(manifestKeys.has(key), `missing character asset: ${key}`).toBe(true);
    }

    for (const gender of GENDER_STYLES) {
      expect(
        manifestKeys.has(gender.bodyAssetKey),
        `missing body asset: ${gender.bodyAssetKey}`,
      ).toBe(true);
    }

    expect(manifestKeys.has('body-base')).toBe(true);
    expect(manifestKeys.has('egg-base')).toBe(true);

    for (const pet of PETS) {
      expect(manifestKeys.has(pet.assetKey), `missing pet asset: ${pet.assetKey}`).toBe(true);
      const patternKey = `egg-${pet.eggPattern}`;
      expect(manifestKeys.has(patternKey), `missing egg pattern: ${patternKey}`).toBe(true);
    }

    for (const item of ITEMS) {
      if (item.color !== undefined) {
        continue;
      }
      expect(manifestKeys.has(item.assetKey), `missing item asset: ${item.assetKey}`).toBe(true);
    }

    for (const room of Object.values(ROOMS)) {
      expect(manifestKeys.has(room.assetKey), `missing room asset: ${room.assetKey}`).toBe(true);
    }

    for (const info of QUIZ_SUBJECT_INFO) {
      expect(manifestKeys.has(info.icon), `missing school subject icon: ${info.icon}`).toBe(true);
    }

    for (const key of ['town-map', 'shop-room', 'school-room', 'park']) {
      expect(manifestKeys.has(key), `missing scene asset: ${key}`).toBe(true);
    }
  });
});

describe('item catalog', () => {
  it('has unique ids and valid prices', () => {
    expectUnique(ITEMS.map((item) => item.id));
    for (const item of ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(Number.isFinite(item.price)).toBe(true);
      if (item.category === 'wardrobe') {
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(item.price).toBeLessThanOrEqual(30);
      } else {
        expect(item.price).toBeGreaterThanOrEqual(5);
        expect(item.price).toBeLessThanOrEqual(80);
      }
      expect(getItem(item.id)).toBe(item);
    }
  });

  it('gates bonus items behind purchases in the same category', () => {
    for (const item of ITEMS) {
      expect(item.requiredPurchases).toBeGreaterThanOrEqual(0);
      expect(item.requiredPurchases).toBeLessThanOrEqual(12);
      expect(isItemUnlocked(item, item.requiredPurchases)).toBe(true);
      expect(isItemUnlocked(item, item.requiredPurchases - 1)).toBe(false);
    }

    expect(ITEMS.some((item) => item.requiredPurchases > 0)).toBe(true);
    expect(ITEMS.some((item) => !isItemUnlocked(item, 0))).toBe(true);
  });

  it('counts purchases per category', () => {
    const purchases = { sofa: 2, lamp: 1, ball: 3, cookie: 1 };

    expect(categoryPurchaseCount(purchases, 'furniture')).toBe(3);
    expect(categoryPurchaseCount(purchases, 'toy')).toBe(3);
    expect(categoryPurchaseCount(purchases, 'treat')).toBe(1);
    expect(categoryPurchaseCount(purchases, 'accessory')).toBe(0);
  });

  it('counts treats in the inventory', () => {
    expect(treatCount({ inventory: { cookie: 2, apple: 1, rug: 9 } })).toBe(3);
  });

  it('prefers the pet favourite treat when it is in the inventory', () => {
    expect(firstTreatId({ inventory: { cookie: 1, bone: 1 } }, ['bone'])).toBe('bone');
    expect(firstTreatId({ inventory: { cookie: 1 } }, ['bone'])).toBe('cookie');
    expect(firstTreatId({ inventory: { rug: 1 } }, ['bone'])).toBeNull();
  });

  it('covers every shop category', () => {
    for (const category of ITEM_CATEGORIES) {
      expect(
        ITEMS.some((item) => item.category === category),
        `empty: ${category}`,
      ).toBe(true);
    }
  });

  it('gives placeable items whole grid cells and leaves collectibles unplaceable', () => {
    for (const item of ITEMS) {
      if (item.placeable) {
        expect(item.gridWidth).toBeGreaterThan(0);
        expect(item.gridHeight).toBeGreaterThan(0);
        expect(item.width).toBe(item.gridWidth * 64);
        expect(item.height).toBe(item.gridHeight * 64);
      } else {
        expect(item.gridWidth).toBe(0);
        expect(item.gridHeight).toBe(0);
      }
    }
  });
});

describe('room catalog', () => {
  it('has a valid room for every RoomId with reachable doors', () => {
    const rooms = Object.values(ROOMS);
    expect(rooms).toHaveLength(ROOM_IDS.length);
    expectUnique(rooms.map((room) => room.id));
    expect(rooms.map((room) => room.id)).toEqual([...ROOM_IDS]);

    for (const room of rooms) {
      expect(room.label.length).toBeGreaterThan(0);
      expect(room.bounds.right).toBeGreaterThan(room.bounds.left);
      expect(room.bounds.bottom).toBeGreaterThan(room.bounds.top);
      expect(room.placementArea.right).toBeGreaterThan(room.placementArea.left);
      expect(room.placementArea.bottom).toBeGreaterThan(room.placementArea.top);
      expect(room.spawn.x).toBeGreaterThanOrEqual(room.bounds.left);
      expect(room.spawn.x).toBeLessThanOrEqual(room.bounds.right);
      expect(room.spawn.y).toBeGreaterThanOrEqual(room.bounds.top);
      expect(room.spawn.y).toBeLessThanOrEqual(room.bounds.bottom);
      for (const door of room.doors) {
        expect(door.label.length).toBeGreaterThan(0);
        expect(door.y + 34).toBeLessThanOrEqual(room.placementArea.top);
      }
    }

    const targets = new Set<RoomId>(rooms.flatMap((room) => room.doors.map((door) => door.target)));
    expect(targets).toEqual(new Set<RoomId>(ROOM_IDS));
  });
});

describe('wardrobe catalog', () => {
  it('maps every hair, outfit, color and accessory option to a wardrobe item', () => {
    const styleSlots: readonly (readonly [WardrobeSlot, readonly { id: string }[]])[] = [
      ['hair', HAIR_STYLES],
      ['hairColor', HAIR_COLORS],
      ['outfit', OUTFIT_STYLES],
      ['outfitColor', OUTFIT_COLORS],
      ['accessory', ACCESSORY_STYLES.filter((option) => option.id !== 'none')],
    ];

    for (const [slot, options] of styleSlots) {
      for (const option of options) {
        const item = getItem(wardrobeItemId(slot, option.id));
        expect(item, `${slot}:${option.id}`).toBeDefined();
        expect(item?.category).toBe('wardrobe');
        expect(item?.wardrobeSlot).toBe(slot);
        expect(item?.appearanceId).toBe(option.id);
      }
    }
  });

  it('has a small free starter set', () => {
    const freeCount = (slot: WardrobeSlot, options: readonly { id: string }[]): number =>
      options.filter((option) => isFreeWardrobeOption(slot, option.id)).length;

    expect(freeCount('hair', HAIR_STYLES)).toBe(3);
    expect(freeCount('hairColor', HAIR_COLORS)).toBe(4);
    expect(freeCount('outfit', OUTFIT_STYLES)).toBe(3);
    expect(freeCount('outfitColor', OUTFIT_COLORS)).toBe(4);
    expect(freeCount('accessory', ACCESSORY_STYLES)).toBe(3);
    expect(QUICK_START_EYES).toHaveLength(3);
    expect(QUICK_START_MOUTHS).toHaveLength(3);
  });

  it('keeps the default look free and in the quick start', () => {
    expect(isFreeWardrobeOption('hair', DEFAULT_LOOK.hair)).toBe(true);
    expect(isFreeWardrobeOption('hairColor', DEFAULT_LOOK.hairColor)).toBe(true);
    expect(isFreeWardrobeOption('outfit', DEFAULT_LOOK.outfit)).toBe(true);
    expect(isFreeWardrobeOption('outfitColor', DEFAULT_LOOK.outfitColor)).toBe(true);
    expect(DEFAULT_LOOK.accessory).toBeNull();
    expect(QUICK_START_EYES).toContain(DEFAULT_LOOK.eyes);
    expect(QUICK_START_MOUTHS).toContain(DEFAULT_LOOK.mouth);
  });

  it('has 47 paid wardrobe items with balanced prices', () => {
    const paid = itemsByCategory('wardrobe').filter((item) => item.price > 0);
    expect(paid).toHaveLength(47);
    expect(Math.min(...paid.map((item) => item.price))).toBeGreaterThanOrEqual(5);
    expect(Math.max(...paid.map((item) => item.price))).toBeLessThanOrEqual(30);
  });
});

describe('appearance catalog', () => {
  it('has unique ids in every category', () => {
    expectUnique(GENDER_STYLES.map((option) => option.id));
    expectUnique(SKIN_TONES.map((option) => option.id));
    expectUnique(HAIR_STYLES.map((option) => option.id));
    expectUnique(HAIR_COLORS.map((option) => option.id));
    expectUnique(EYE_STYLES.map((option) => option.id));
    expectUnique(MOUTH_STYLES.map((option) => option.id));
    expectUnique(OUTFIT_STYLES.map((option) => option.id));
    expectUnique(OUTFIT_COLORS.map((option) => option.id));
    expectUnique(ACCESSORY_STYLES.map((option) => option.id));
  });

  it('has labels and valid colors', () => {
    const colors = [...SKIN_TONES, ...HAIR_COLORS, ...OUTFIT_COLORS];
    for (const option of colors) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.color).toBeGreaterThanOrEqual(0);
      expect(option.color).toBeLessThanOrEqual(0xffffff);
    }

    const styles = [
      ...GENDER_STYLES,
      ...HAIR_STYLES,
      ...EYE_STYLES,
      ...MOUTH_STYLES,
      ...OUTFIT_STYLES,
      ...ACCESSORY_STYLES,
    ];
    for (const option of styles) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe('pet catalog', () => {
  it('contains every pet with unique ids', () => {
    expect(PETS).toHaveLength(18);
    expectUnique(PETS.map((pet) => pet.id));
    expect(PETS.map((pet) => pet.id)).toEqual([...PET_IDS]);
  });

  it('no longer offers puppy or kitten', () => {
    const ids: readonly string[] = PETS.map((pet) => pet.id);
    expect(ids).not.toContain('puppy');
    expect(ids).not.toContain('kitten');
  });

  it('offers a pet pig and a chicken', () => {
    const ids: readonly string[] = PETS.map((pet) => pet.id);
    expect(ids).toContain('pig');
    expect(ids).toContain('chicken');
  });

  it('has labels and name suggestions for every pet', () => {
    for (const pet of PETS) {
      expect(pet.label.length).toBeGreaterThan(0);
      expect(pet.names.length).toBeGreaterThanOrEqual(6);
      expect(pet.names.every((name) => name.trim().length > 0)).toBe(true);
      expect(['walk', 'hop', 'swim', 'float']).toContain(pet.motion);
      expect(pet.adoptionPrice).toBeGreaterThanOrEqual(20);
      expect(pet.adoptionPrice).toBeLessThanOrEqual(80);
      expect(getPet(pet.id)).toBe(pet);
    }
  });

  it('gives every pet a valid care profile and favourite treat', () => {
    for (const pet of PETS) {
      for (const multiplier of Object.values(pet.care.decay)) {
        expect(multiplier).toBeGreaterThanOrEqual(0.8);
        expect(multiplier).toBeLessThanOrEqual(1.3);
      }
      expect(CARE_ACTIONS).toContain(pet.care.favoriteAction);
      expect(pet.care.favoriteTreats.length).toBeGreaterThan(0);
      for (const treatId of pet.care.favoriteTreats) {
        expect(getItem(treatId)?.category).toBe('treat');
      }
    }
  });

  it('creates a pet with full needs, a uid and the current timestamp', () => {
    const state = createPetState('rabbit', 'Hoppe', 1234, 'pet-hoppe');

    expect(state).toMatchObject({
      uid: 'pet-hoppe',
      id: 'rabbit',
      name: 'Hoppe',
      hatchedAt: 1234,
    });
    expect(state.needs).toEqual(createFullNeeds());
    expect(state.accessory).toBeNull();
  });

  it('suggests an unused name when adopting the same species twice', () => {
    const first = createPetState('dog', 'Baloo', 1, 'pet-1');
    const name = pickNewPetName('dog', [first.name]);
    expect(name).not.toBe(first.name);
    expect(getPet('dog').names).toContain(name);
  });
});
