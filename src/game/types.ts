export const PET_IDS = [
  'dog',
  'puppy',
  'cat',
  'kitten',
  'rabbit',
  'horse',
  'fish',
  'turtle',
  'axolotl',
] as const;

export type PetId = (typeof PET_IDS)[number];

export const CARE_NEEDS = ['hunger', 'joy', 'energy'] as const;

export type CareNeed = (typeof CARE_NEEDS)[number];

export type Needs = Record<CareNeed, number>;

export type EggPattern = 'spots' | 'stripes' | 'waves';

export type RoomId = 'living' | 'bedroom';

export const ITEM_CATEGORIES = ['furniture', 'toy', 'accessory', 'treat'] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface Point {
  x: number;
  y: number;
}

export interface WorldRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CharacterLook {
  skin: string;
  hair: string;
  hairColor: string;
  eyes: string;
  mouth: string;
  outfit: string;
  outfitColor: string;
  accessory: string | null;
}

export interface PetState {
  id: PetId;
  name: string;
  needs: Needs;
  bond: number;
  hatchedAt: number;
}

export interface PlacedFurniture {
  uid: string;
  itemId: string;
  room: RoomId;
  x: number;
  y: number;
}

export interface SaveData {
  version: 2;
  settings: {
    sound: boolean;
  };
  player: {
    look: CharacterLook;
  } | null;
  pet: PetState | null;
  wallet: {
    hearts: number;
  };
  inventory: Record<string, number>;
  home: {
    furniture: PlacedFurniture[];
  };
  flags: {
    tutorialDone: boolean;
  };
}

export function isPetId(value: unknown): value is PetId {
  return typeof value === 'string' && (PET_IDS as readonly string[]).includes(value);
}

export function isRoomId(value: unknown): value is RoomId {
  return value === 'living' || value === 'bedroom';
}

export function isItemCategory(value: unknown): value is ItemCategory {
  return typeof value === 'string' && (ITEM_CATEGORIES as readonly string[]).includes(value);
}

export function createFullNeeds(): Needs {
  return { hunger: 100, joy: 100, energy: 100 };
}

export function clampNeeds(needs: Needs): Needs {
  return {
    hunger: clampNeed(needs.hunger),
    joy: clampNeed(needs.joy),
    energy: clampNeed(needs.energy),
  };
}

export function clampNeed(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}
