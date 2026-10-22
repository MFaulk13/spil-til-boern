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
  findColor,
  findStyle,
  type ColorOption,
  type StyleOption,
} from '@/game/catalog/appearance';
import { isGender, type CharacterLook } from '@/game/types';

export interface CharacterLayer {
  assetKey: string;
  tint?: number;
}

function pickStyle(
  options: readonly StyleOption[],
  value: unknown,
  fallback: StyleOption,
): StyleOption {
  if (typeof value !== 'string') {
    return fallback;
  }
  return options.find((option) => option.id === value) ?? fallback;
}

function pickColor(
  options: readonly ColorOption[],
  value: unknown,
  fallback: ColorOption,
): ColorOption {
  if (typeof value !== 'string') {
    return fallback;
  }
  return options.find((option) => option.id === value) ?? fallback;
}

export function normalizeLook(value: unknown): CharacterLook {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  const gender = isGender(record.gender) ? record.gender : DEFAULT_LOOK.gender;
  const skin = pickColor(SKIN_TONES, record.skin, findColor(SKIN_TONES, DEFAULT_LOOK.skin));
  const hair = pickStyle(HAIR_STYLES, record.hair, findStyle(HAIR_STYLES, DEFAULT_LOOK.hair));
  const hairColor = pickColor(
    HAIR_COLORS,
    record.hairColor,
    findColor(HAIR_COLORS, DEFAULT_LOOK.hairColor),
  );
  const eyes = pickStyle(EYE_STYLES, record.eyes, findStyle(EYE_STYLES, DEFAULT_LOOK.eyes));
  const mouth = pickStyle(MOUTH_STYLES, record.mouth, findStyle(MOUTH_STYLES, DEFAULT_LOOK.mouth));
  const outfit = pickStyle(
    OUTFIT_STYLES,
    record.outfit,
    findStyle(OUTFIT_STYLES, DEFAULT_LOOK.outfit),
  );
  const outfitColor = pickColor(
    OUTFIT_COLORS,
    record.outfitColor,
    findColor(OUTFIT_COLORS, DEFAULT_LOOK.outfitColor),
  );

  const accessoryValue = record.accessory;
  const accessory =
    typeof accessoryValue === 'string' && accessoryValue !== 'none'
      ? (ACCESSORY_STYLES.find((option) => option.id === accessoryValue)?.id ?? null)
      : null;

  return {
    gender,
    skin: skin.id,
    hair: hair.id,
    hairColor: hairColor.id,
    eyes: eyes.id,
    mouth: mouth.id,
    outfit: outfit.id,
    outfitColor: outfitColor.id,
    accessory,
  };
}

interface RandomSource {
  random(): number;
}

function pick<T>(options: readonly T[], source: RandomSource): T {
  return options[Math.floor(source.random() * options.length) % options.length];
}

export function randomizeLook(source: RandomSource = Math): CharacterLook {
  const accessory = source.random() < 0.5 ? 'none' : pick(ACCESSORY_STYLES, source).id;
  return {
    gender: pick(GENDER_STYLES, source).id,
    skin: pick(SKIN_TONES, source).id,
    hair: pick(HAIR_STYLES, source).id,
    hairColor: pick(HAIR_COLORS, source).id,
    eyes: pick(EYE_STYLES, source).id,
    mouth: pick(MOUTH_STYLES, source).id,
    outfit: pick(OUTFIT_STYLES, source).id,
    outfitColor: pick(OUTFIT_COLORS, source).id,
    accessory: accessory === 'none' ? null : accessory,
  };
}

export function buildCharacterLayers(look: CharacterLook): CharacterLayer[] {
  const gender = GENDER_STYLES.find((option) => option.id === look.gender) ?? GENDER_STYLES[0];
  const skin = findColor(SKIN_TONES, look.skin);
  const hair = findStyle(HAIR_STYLES, look.hair);
  const hairColor = findColor(HAIR_COLORS, look.hairColor);
  const eyes = findStyle(EYE_STYLES, look.eyes);
  const mouth = findStyle(MOUTH_STYLES, look.mouth);
  const outfit = findStyle(OUTFIT_STYLES, look.outfit);
  const outfitColor = findColor(OUTFIT_COLORS, look.outfitColor);
  const accessory =
    look.accessory === null
      ? undefined
      : ACCESSORY_STYLES.find((option) => option.id === look.accessory);

  const layers: CharacterLayer[] = [
    { assetKey: gender.bodyAssetKey, tint: skin.color },
    { assetKey: outfit.assetKey, tint: outfitColor.color },
    { assetKey: eyes.assetKey },
    { assetKey: mouth.assetKey },
    { assetKey: hair.assetKey, tint: hairColor.color },
  ];

  if (accessory && accessory.assetKey) {
    layers.push({ assetKey: accessory.assetKey });
  }

  return layers;
}
