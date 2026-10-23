import { getItem } from '@/game/catalog/items';
import { getToyPlay } from '@/game/catalog/toys';
import {
  clampNeed,
  type CareNeed,
  type GuideTarget,
  type HomeFixtureId,
  type HomeGuide,
  type Needs,
} from '@/game/types';
import { isNeedLow, lowestNeed, type CareAction } from '@/systems/pet';

export type HomeFixtureAction = Extract<CareAction, 'feed' | 'play' | 'sleep'>;

export type HomeInteractionKind = 'play' | 'sleep' | 'cuddle';

export interface HomeInteraction {
  kind: HomeInteractionKind;
  need: CareNeed;
  amount: number;
}

export interface HomeInteractionResult {
  needs: Needs;
  need: CareNeed;
  gained: number;
}

export type HomeGuideTask = 'feed' | 'play' | 'decorate' | 'town';

export interface HomeGuideState extends HomeGuide {
  fed: boolean;
}

const TOY_JOY_FACTOR = 0.7;
const MIN_TOY_JOY = 8;
const PET_BED_ENERGY = 15;
const CUSHION_ENERGY = 12;
const CUDDLE_JOY = 8;

const CUDDLE_ITEMS = new Set(['sofa', 'armchair', 'beanbag', 'ottoman', 'rocking-chair']);

export function interactionForFixture(fixture: HomeFixtureId): HomeFixtureAction {
  switch (fixture) {
    case 'bowl':
      return 'feed';
    case 'ball':
      return 'play';
    case 'cushion':
      return 'sleep';
  }
}

export function homeJoyForToy(itemId: string): number {
  const play = getToyPlay(itemId);
  return Math.max(MIN_TOY_JOY, Math.round(play.joy * TOY_JOY_FACTOR));
}

export function interactionForItem(itemId: string): HomeInteraction | null {
  const item = getItem(itemId);
  if (!item) {
    return null;
  }

  if (item.category === 'toy') {
    return { kind: 'play', need: 'joy', amount: homeJoyForToy(item.id) };
  }

  if (item.id === 'pet-bed' || item.id === 'bed') {
    return { kind: 'sleep', need: 'energy', amount: PET_BED_ENERGY };
  }

  if (item.id === 'cushion') {
    return { kind: 'sleep', need: 'energy', amount: CUSHION_ENERGY };
  }

  if (CUDDLE_ITEMS.has(item.id)) {
    return { kind: 'cuddle', need: 'joy', amount: CUDDLE_JOY };
  }

  return null;
}

export function applyHomeInteraction(
  needs: Needs,
  interaction: HomeInteraction,
): HomeInteractionResult {
  const before = needs[interaction.need];
  const after = clampNeed(before + interaction.amount);
  return {
    needs: { ...needs, [interaction.need]: after },
    need: interaction.need,
    gained: after - before,
  };
}

export function wishForNeeds(needs: Needs): { need: CareNeed; action: CareAction } | null {
  if (!isNeedLow(needs)) {
    return null;
  }

  const need = lowestNeed(needs);
  const action: CareAction = need === 'hunger' ? 'feed' : need === 'joy' ? 'play' : 'sleep';
  return { need, action };
}

export function homeGuideState(tutorialDone: boolean, guide: HomeGuide): HomeGuideState {
  return { fed: tutorialDone, ...guide };
}

export function nextGuideTask(state: HomeGuideState): HomeGuideTask | null {
  if (!state.fed) {
    return 'feed';
  }
  if (!state.played) {
    return 'play';
  }
  if (!state.town) {
    return 'town';
  }
  if (!state.decorated) {
    return 'decorate';
  }
  return null;
}

export function guideTarget(task: HomeGuideTask): GuideTarget {
  switch (task) {
    case 'feed':
      return 'feed';
    case 'play':
      return 'play';
    case 'decorate':
      return 'decor';
    case 'town':
      return 'town';
  }
}
