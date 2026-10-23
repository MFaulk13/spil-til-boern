export const PET_IDS = [
  'dog',
  'cat',
  'rabbit',
  'pig',
  'chicken',
  'hamster',
  'mouse',
  'hedgehog',
  'duck',
  'parrot',
  'owl',
  'frog',
  'turtle',
  'axolotl',
  'fish',
  'horse',
  'gecko',
  'penguin',
] as const;

export type PetId = (typeof PET_IDS)[number];

export const CARE_NEEDS = ['hunger', 'joy', 'energy'] as const;

export type CareNeed = (typeof CARE_NEEDS)[number];

export type Needs = Record<CareNeed, number>;

export type EggPattern = 'spots' | 'stripes' | 'waves';

export const ROOM_IDS = ['living', 'bedroom', 'kitchen', 'bathroom', 'playroom'] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export const HOME_FIXTURE_IDS = ['bowl', 'ball', 'cushion'] as const;

export type HomeFixtureId = (typeof HOME_FIXTURE_IDS)[number];

export interface HomeFixture {
  id: HomeFixtureId;
  x: number;
  y: number;
}

export const HOME_GUIDE_KEYS = ['played', 'decorated', 'town'] as const;

export type HomeGuideKey = (typeof HOME_GUIDE_KEYS)[number];

export type HomeGuide = Record<HomeGuideKey, boolean>;

export type GuideTarget = 'feed' | 'play' | 'decor' | 'town';

export const QUIZ_SUBJECTS = [
  'math',
  'danish',
  'english',
  'nature',
  'history',
  'religion',
  'music',
  'sport',
] as const;

export type QuizSubject = (typeof QUIZ_SUBJECTS)[number];

export interface SchoolProgress {
  rounds: number;
  bestStars: number;
  firstTryCorrect: number;
  totalQuestions: number;
  firstCompleted: boolean;
}

export const ITEM_CATEGORIES = ['furniture', 'toy', 'wardrobe', 'accessory', 'treat'] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const WARDROBE_SLOTS = [
  'hair',
  'hairColor',
  'eyes',
  'mouth',
  'outfit',
  'outfitColor',
  'accessory',
] as const;

export type WardrobeSlot = (typeof WARDROBE_SLOTS)[number];

export const GENDERS = ['boy', 'girl'] as const;

export type Gender = (typeof GENDERS)[number];

export function isGender(value: unknown): value is Gender {
  return typeof value === 'string' && (GENDERS as readonly string[]).includes(value);
}

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
  gender: Gender;
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
  uid: string;
  id: PetId;
  name: string;
  needs: Needs;
  bond: number;
  hatchedAt: number;
  accessory: string | null;
}

export interface PlacedFurniture {
  uid: string;
  itemId: string;
  room: RoomId;
  x: number;
  y: number;
}

export interface DeviceSettings {
  version: 1;
  sound: boolean;
  reduceMotion: boolean;
}

export interface ProfileMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface ProfileIndex {
  version: 1;
  activeProfileId: string | null;
  profiles: ProfileMeta[];
}

export interface ProfileOverview extends ProfileMeta {
  active: boolean;
  look: CharacterLook | null;
  petId: PetId | null;
  petName: string | null;
  petAccessory: string | null;
}

export interface SaveData {
  version: 5;
  player: {
    look: CharacterLook;
  } | null;
  pets: PetState[];
  activePetId: string | null;
  wallet: {
    hearts: number;
    earnedHearts: number;
  };
  inventory: Record<string, number>;
  purchases: Record<string, number>;
  home: {
    furniture: PlacedFurniture[];
  };
  school: {
    subjects: Partial<Record<QuizSubject, SchoolProgress>>;
  };
  flags: {
    tutorialDone: boolean;
    homeGuide: HomeGuide;
  };
}

export function isPetId(value: unknown): value is PetId {
  return typeof value === 'string' && (PET_IDS as readonly string[]).includes(value);
}

export function isRoomId(value: unknown): value is RoomId {
  return typeof value === 'string' && (ROOM_IDS as readonly string[]).includes(value);
}

export function isItemCategory(value: unknown): value is ItemCategory {
  return typeof value === 'string' && (ITEM_CATEGORIES as readonly string[]).includes(value);
}

export function isQuizSubject(value: unknown): value is QuizSubject {
  return typeof value === 'string' && (QUIZ_SUBJECTS as readonly string[]).includes(value);
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
