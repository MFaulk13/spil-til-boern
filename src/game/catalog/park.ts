import { text } from '@/game/text';
import type { PetId } from '@/game/types';

export const PARK_ACTIVITY_IDS = [
  'ball',
  'toys',
  'bubbles',
  'pond',
  'flowers',
  'bench',
] as const;

export type ParkActivityId = (typeof PARK_ACTIVITY_IDS)[number];

export interface ParkActivityDefinition {
  id: ParkActivityId;
  label: string;
  iconKey: string;
  favoriteVerb: string;
  joy: number;
}

export const PARK_ACTIVITIES: Record<ParkActivityId, ParkActivityDefinition> = {
  ball: {
    id: 'ball',
    label: text.park.stations.ball,
    iconKey: 'toy-ball',
    favoriteVerb: text.park.favoriteVerbs.ball,
    joy: 12,
  },
  toys: {
    id: 'toys',
    label: text.park.stations.toys,
    iconKey: 'furniture-toy-box',
    favoriteVerb: text.park.favoriteVerbs.toys,
    joy: 10,
  },
  bubbles: {
    id: 'bubbles',
    label: text.park.stations.bubbles,
    iconKey: 'icon-bubbles',
    favoriteVerb: text.park.favoriteVerbs.bubbles,
    joy: 2,
  },
  pond: {
    id: 'pond',
    label: text.park.stations.pond,
    iconKey: 'pet-duck',
    favoriteVerb: text.park.favoriteVerbs.pond,
    joy: 8,
  },
  flowers: {
    id: 'flowers',
    label: text.park.stations.flowers,
    iconKey: 'icon-flower',
    favoriteVerb: text.park.favoriteVerbs.flowers,
    joy: 6,
  },
  bench: {
    id: 'bench',
    label: text.park.stations.bench,
    iconKey: 'icon-bench',
    favoriteVerb: text.park.favoriteVerbs.bench,
    joy: 4,
  },
};

export const PARK_ACTIVITY_ORDER: readonly ParkActivityId[] = PARK_ACTIVITY_IDS;

export type ParkGoalActivity = ParkActivityId | 'favorite';

export interface ParkGoalDefinition {
  id: string;
  activity: ParkGoalActivity;
  target: number;
  badgeId: string;
  label: string;
}

export const FAVORITE_GOAL_ID = 'favorite-play';
export const FAVORITE_BADGE_ID = 'best-friend';
export const META_BADGE_ID = 'park-hero';

export const PARK_BADGES = [
  {
    id: 'ball-master',
    label: text.park.badges.ballMaster,
    iconKey: 'toy-ball',
    hint: text.park.badgeHints.ballMaster,
    color: 0xff8b7d,
  },
  {
    id: 'bubble-rider',
    label: text.park.badges.bubbleRider,
    iconKey: 'icon-bubbles',
    hint: text.park.badgeHints.bubbleRider,
    color: 0xa8d8f0,
  },
  {
    id: 'duck-friend',
    label: text.park.badges.duckFriend,
    iconKey: 'pet-duck',
    hint: text.park.badgeHints.duckFriend,
    color: 0xffc94d,
  },
  {
    id: 'toy-expert',
    label: text.park.badges.toyExpert,
    iconKey: 'furniture-toy-box',
    hint: text.park.badgeHints.toyExpert,
    color: 0x62c9b8,
  },
  {
    id: 'flower-finder',
    label: text.park.badges.flowerFinder,
    iconKey: 'icon-flower',
    hint: text.park.badgeHints.flowerFinder,
    color: 0xc9b2e8,
  },
  {
    id: 'relaxer',
    label: text.park.badges.relaxer,
    iconKey: 'icon-bench',
    hint: text.park.badgeHints.relaxer,
    color: 0x8fd18a,
  },
  {
    id: FAVORITE_BADGE_ID,
    label: text.park.badges.bestFriend,
    iconKey: 'icon-paw',
    hint: text.park.badgeHints.bestFriend,
    color: 0xff9f70,
  },
  {
    id: META_BADGE_ID,
    label: text.park.badges.parkHero,
    iconKey: 'icon-star',
    hint: text.park.badgeHints.parkHero,
    color: 0xffd166,
  },
] as const;

export type ParkBadgeDefinition = (typeof PARK_BADGES)[number];
export type ParkBadgeId = ParkBadgeDefinition['id'];

export const PARK_BADGE_IDS: readonly string[] = PARK_BADGES.map((badge) => badge.id);
export const PARK_ACTIVITY_BADGE_IDS: readonly string[] = PARK_BADGES.filter(
  (badge) => badge.id !== META_BADGE_ID,
).map((badge) => badge.id);

export const PARK_GOALS = [
  {
    id: 'ball-twice',
    activity: 'ball',
    target: 2,
    badgeId: 'ball-master',
    label: text.park.goals.ball,
  },
  {
    id: 'bubbles-six',
    activity: 'bubbles',
    target: 6,
    badgeId: 'bubble-rider',
    label: text.park.goals.bubbles,
  },
  {
    id: 'ducks-visit',
    activity: 'pond',
    target: 1,
    badgeId: 'duck-friend',
    label: text.park.goals.ducks,
  },
  {
    id: 'toy-play',
    activity: 'toys',
    target: 1,
    badgeId: 'toy-expert',
    label: text.park.goals.toys,
  },
  {
    id: 'flowers-find',
    activity: 'flowers',
    target: 1,
    badgeId: 'flower-finder',
    label: text.park.goals.flowers,
  },
  {
    id: 'bench-rest',
    activity: 'bench',
    target: 1,
    badgeId: 'relaxer',
    label: text.park.goals.bench,
  },
  {
    id: FAVORITE_GOAL_ID,
    activity: 'favorite',
    target: 1,
    badgeId: FAVORITE_BADGE_ID,
    label: '',
  },
] as const;

export type ParkGoalId = (typeof PARK_GOALS)[number]['id'];

export type ParkReaction =
  | 'fetch'
  | 'chase'
  | 'run'
  | 'sing'
  | 'swim'
  | 'splash'
  | 'hop'
  | 'dig'
  | 'peck'
  | 'hide'
  | 'sniff'
  | 'rest'
  | 'sun';

export type ParkParticle = 'hearts' | 'notes' | 'water' | 'leaves' | 'dirt' | 'sparkles' | 'zzz';

export interface PetParkPreference {
  favorites: readonly ParkActivityId[];
  reaction: ParkReaction;
  particle: ParkParticle;
}

export const PET_PARK_PREFERENCES: Record<PetId, PetParkPreference> = {
  dog: { favorites: ['ball', 'flowers'], reaction: 'fetch', particle: 'sparkles' },
  cat: { favorites: ['bubbles', 'bench'], reaction: 'chase', particle: 'sparkles' },
  rabbit: { favorites: ['flowers', 'toys'], reaction: 'hop', particle: 'leaves' },
  pig: { favorites: ['flowers', 'pond'], reaction: 'dig', particle: 'dirt' },
  chicken: { favorites: ['flowers', 'bench'], reaction: 'peck', particle: 'leaves' },
  hamster: { favorites: ['toys', 'flowers'], reaction: 'run', particle: 'sparkles' },
  mouse: { favorites: ['flowers', 'toys'], reaction: 'hide', particle: 'leaves' },
  hedgehog: { favorites: ['flowers', 'bench'], reaction: 'sniff', particle: 'leaves' },
  duck: { favorites: ['pond', 'toys'], reaction: 'swim', particle: 'water' },
  parrot: { favorites: ['toys', 'bench'], reaction: 'sing', particle: 'notes' },
  owl: { favorites: ['bench', 'flowers'], reaction: 'rest', particle: 'zzz' },
  frog: { favorites: ['pond', 'flowers'], reaction: 'splash', particle: 'water' },
  turtle: { favorites: ['bench', 'pond'], reaction: 'sun', particle: 'zzz' },
  axolotl: { favorites: ['pond', 'bubbles'], reaction: 'splash', particle: 'water' },
  fish: { favorites: ['pond', 'bubbles'], reaction: 'swim', particle: 'water' },
  horse: { favorites: ['ball', 'flowers'], reaction: 'run', particle: 'sparkles' },
  gecko: { favorites: ['bench', 'flowers'], reaction: 'sun', particle: 'sparkles' },
  penguin: { favorites: ['pond', 'toys'], reaction: 'splash', particle: 'water' },
};

export function getParkActivity(id: string): ParkActivityDefinition | undefined {
  return PARK_ACTIVITIES[id as ParkActivityId];
}

export function getParkGoal(id: string): ParkGoalDefinition | undefined {
  return PARK_GOALS.find((goal) => goal.id === id);
}

export function getParkBadge(id: string): ParkBadgeDefinition | undefined {
  return PARK_BADGES.find((badge) => badge.id === id);
}

export function isParkActivityId(value: unknown): value is ParkActivityId {
  return typeof value === 'string' && (PARK_ACTIVITY_IDS as readonly string[]).includes(value);
}

export function isParkBadgeId(value: unknown): value is string {
  return typeof value === 'string' && PARK_BADGE_IDS.includes(value);
}

export function isParkGoalId(value: unknown): value is string {
  return typeof value === 'string' && PARK_GOALS.some((goal) => goal.id === value);
}

export function getPetParkPreference(petId: PetId): PetParkPreference {
  return PET_PARK_PREFERENCES[petId];
}

export function currentFavoriteActivity(petId: PetId, hasToys: boolean): ParkActivityId {
  const preference = getPetParkPreference(petId);
  return preference.favorites.find((activity) => activity !== 'toys' || hasToys) ?? 'ball';
}

export function getParkGoalLabel(
  goal: ParkGoalDefinition,
  petId: PetId,
  petName: string,
  hasToys: boolean,
): string {
  if (goal.activity !== 'favorite') {
    return goal.label;
  }
  const activity = getParkActivity(currentFavoriteActivity(petId, hasToys));
  return text.park.goals.favorite(petName, activity?.favoriteVerb ?? 'lege');
}
