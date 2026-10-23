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

export interface LookPool {
  hair?: readonly string[];
  hairColor?: readonly string[];
  eyes?: readonly string[];
  mouth?: readonly string[];
  outfit?: readonly string[];
  outfitColor?: readonly string[];
  accessories?: readonly string[];
}

function pick<T>(options: readonly T[], source: RandomSource): T {
  return options[Math.floor(source.random() * options.length) % options.length];
}

function pickId<T extends { id: string }>(
  options: readonly T[],
  allowed: readonly string[] | undefined,
  source: RandomSource,
): string {
  const ids = allowed && allowed.length > 0 ? allowed : options.map((option) => option.id);
  return pick(ids, source);
}

export function randomizeLook(source: RandomSource = Math, pool?: LookPool): CharacterLook {
  const accessoryOptions =
    pool?.accessories ??
    ACCESSORY_STYLES.filter((option) => option.id !== 'none').map((option) => option.id);
  const accessory =
    accessoryOptions.length === 0 || source.random() < 0.5 ? null : pick(accessoryOptions, source);

  return {
    gender: pick(GENDER_STYLES, source).id,
    skin: pick(SKIN_TONES, source).id,
    hair: pickId(HAIR_STYLES, pool?.hair, source),
    hairColor: pickId(HAIR_COLORS, pool?.hairColor, source),
    eyes: pickId(EYE_STYLES, pool?.eyes, source),
    mouth: pickId(MOUTH_STYLES, pool?.mouth, source),
    outfit: pickId(OUTFIT_STYLES, pool?.outfit, source),
    outfitColor: pickId(OUTFIT_COLORS, pool?.outfitColor, source),
    accessory,
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
