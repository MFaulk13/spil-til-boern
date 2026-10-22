import { describe, expect, it } from 'vitest';
import {
  ACCESSORY_STYLES,
  DEFAULT_LOOK,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
} from '@/game/catalog/appearance';
import { buildCharacterLayers, normalizeLook, randomizeLook } from '@/systems/appearance';
import type { CharacterLook } from '@/game/types';

const look: CharacterLook = {
  skin: 'tan',
  hair: 'braid',
  hairColor: 'purple',
  eyes: 'star',
  mouth: 'grin',
  outfit: 'hoodie',
  outfitColor: 'coral',
  accessory: 'glasses',
};

function source(values: number[]): { random: () => number } {
  let index = 0;
  return {
    random: () => {
      const value = values[index % values.length];
      index += 1;
      return value;
    },
  };
}

describe('normalizeLook', () => {
  it('returns the default look for missing data', () => {
    expect(normalizeLook(undefined)).toEqual(DEFAULT_LOOK);
  });

  it('replaces unknown ids with valid defaults', () => {
    const normalized = normalizeLook({
      skin: 'unknown',
      hair: 'unknown',
      hairColor: 'unknown',
      eyes: 'unknown',
      mouth: 'unknown',
      outfit: 'unknown',
      outfitColor: 'unknown',
      accessory: 'unknown',
    });

    expect(normalized.skin).toBe(DEFAULT_LOOK.skin);
    expect(normalized.hair).toBe(DEFAULT_LOOK.hair);
    expect(normalized.eyes).toBe(DEFAULT_LOOK.eyes);
    expect(normalized.mouth).toBe(DEFAULT_LOOK.mouth);
    expect(normalized.outfit).toBe(DEFAULT_LOOK.outfit);
    expect(normalized.accessory).toBeNull();
  });

  it('accepts a valid look and converts none to null', () => {
    const normalized = normalizeLook({ ...look, accessory: 'none' });

    expect(normalized).toEqual({ ...look, accessory: null });
  });
});

describe('randomizeLook', () => {
  it('only produces ids from the catalogs', () => {
    const random = randomizeLook(source([0.01, 0.42, 0.77, 0.16, 0.93, 0.35]));

    expect(SKIN_TONES.some((option) => option.id === random.skin)).toBe(true);
    expect(HAIR_STYLES.some((option) => option.id === random.hair)).toBe(true);
    expect(HAIR_COLORS.some((option) => option.id === random.hairColor)).toBe(true);
    expect(EYE_STYLES.some((option) => option.id === random.eyes)).toBe(true);
    expect(MOUTH_STYLES.some((option) => option.id === random.mouth)).toBe(true);
    expect(OUTFIT_STYLES.some((option) => option.id === random.outfit)).toBe(true);
    expect(OUTFIT_COLORS.some((option) => option.id === random.outfitColor)).toBe(true);
    expect(
      random.accessory === null ||
        ACCESSORY_STYLES.some((option) => option.id === random.accessory),
    ).toBe(true);
  });
});

describe('buildCharacterLayers', () => {
  it('builds layers in visual order with the right tints', () => {
    const layers = buildCharacterLayers(look);

    expect(layers.map((layer) => layer.assetKey)).toEqual([
      'body-base',
      'outfit-hoodie',
      'eyes-star',
      'mouth-grin',
      'hair-braid',
      'accessory-glasses',
    ]);
    expect(layers[0].tint).toBe(SKIN_TONES.find((option) => option.id === look.skin)?.color);
    expect(layers[1].tint).toBe(
      OUTFIT_COLORS.find((option) => option.id === look.outfitColor)?.color,
    );
    expect(layers[4].tint).toBe(HAIR_COLORS.find((option) => option.id === look.hairColor)?.color);
  });

  it('omits the accessory layer when there is no accessory', () => {
    const layers = buildCharacterLayers({ ...look, accessory: null });
    expect(layers).toHaveLength(5);
  });
});
