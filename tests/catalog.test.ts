import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from '@/game/assets';
import {
  ACCESSORY_STYLES,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
} from '@/game/catalog/appearance';
import { ITEMS, getItem } from '@/game/catalog/items';
import { PETS, createPetState, getPet } from '@/game/catalog/pets';
import { ROOMS } from '@/game/catalog/rooms';
import { createFullNeeds, ITEM_CATEGORIES, PET_IDS, type RoomId } from '@/game/types';

const manifestKeys = new Set(ASSET_MANIFEST.map((asset) => asset.key));

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('asset manifest', () => {
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

    expect(manifestKeys.has('body-base')).toBe(true);
    expect(manifestKeys.has('egg-base')).toBe(true);

    for (const pet of PETS) {
      expect(manifestKeys.has(pet.assetKey), `missing pet asset: ${pet.assetKey}`).toBe(true);
      const patternKey = `egg-${pet.eggPattern}`;
      expect(manifestKeys.has(patternKey), `missing egg pattern: ${patternKey}`).toBe(true);
    }

    for (const item of ITEMS) {
      expect(manifestKeys.has(item.assetKey), `missing item asset: ${item.assetKey}`).toBe(true);
    }

    for (const room of Object.values(ROOMS)) {
      expect(manifestKeys.has(room.assetKey), `missing room asset: ${room.assetKey}`).toBe(true);
    }

    for (const key of ['town-map', 'shop-room', 'park']) {
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
      expect(item.price).toBeGreaterThanOrEqual(5);
      expect(item.price).toBeLessThanOrEqual(80);
      expect(getItem(item.id)).toBe(item);
    }
  });

  it('covers every shop category', () => {
    for (const category of ITEM_CATEGORIES) {
      expect(ITEMS.some((item) => item.category === category), `empty: ${category}`).toBe(true);
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
  it('has a valid living room and bedroom with doors', () => {
    const rooms = Object.values(ROOMS);
    expect(rooms).toHaveLength(2);
    expectUnique(rooms.map((room) => room.id));

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
    }

    const targets = new Set<RoomId>(rooms.flatMap((room) => room.doors.map((door) => door.target)));
    expect(targets).toEqual(new Set<RoomId>(['living', 'bedroom']));
  });
});

describe('appearance catalog', () => {
  it('has unique ids in every category', () => {
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
  it('contains all nine pets with unique ids', () => {
    expect(PETS).toHaveLength(9);
    expectUnique(PETS.map((pet) => pet.id));
    expect(PETS.map((pet) => pet.id)).toEqual([...PET_IDS]);
  });

  it('has labels and name suggestions for every pet', () => {
    for (const pet of PETS) {
      expect(pet.label.length).toBeGreaterThan(0);
      expect(pet.names.length).toBeGreaterThanOrEqual(6);
      expect(pet.names.every((name) => name.trim().length > 0)).toBe(true);
      expect(getPet(pet.id)).toBe(pet);
    }
  });

  it('creates a pet with full needs and the current timestamp', () => {
    const state = createPetState('rabbit', 'Hoppe', 1234);

    expect(state).toMatchObject({ id: 'rabbit', name: 'Hoppe', hatchedAt: 1234 });
    expect(state.needs).toEqual(createFullNeeds());
  });
});
