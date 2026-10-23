import {
  currentFavoriteActivity,
  FAVORITE_BADGE_ID,
  FAVORITE_GOAL_ID,
  getParkBadge,
  getParkGoal,
  isParkBadgeId,
  META_BADGE_ID,
  PARK_ACTIVITY_BADGE_IDS,
  PARK_BADGE_IDS,
  PARK_BADGES,
  PARK_GOALS,
  type ParkActivityId,
  type ParkBadgeDefinition,
  type ParkGoalDefinition,
} from '@/game/catalog/park';
import type { ParkGoalProgress, ParkState, PetId } from '@/game/types';

export interface ParkOptions {
  petId: PetId;
  hasToys: boolean;
  rng?: () => number;
}

export interface ParkActivityResult {
  state: ParkState;
  completedGoals: readonly ParkGoalProgress[];
  awardedBadges: readonly ParkBadgeDefinition[];
  favoriteMatched: boolean;
}

export function clonePark(state: ParkState): ParkState {
  return {
    badges: [...state.badges],
    goals: state.goals.map((goal) => ({ ...goal })),
    tutorialDone: state.tutorialDone,
  };
}

export function isGoalComplete(goal: ParkGoalDefinition, progress: number): boolean {
  return progress >= goal.target;
}

export function goalActivity(
  goal: ParkGoalDefinition,
  options: Pick<ParkOptions, 'petId' | 'hasToys'>,
): ParkActivityId {
  if (goal.activity !== 'favorite') {
    return goal.activity;
  }
  return currentFavoriteActivity(options.petId, options.hasToys);
}

export function hasAllParkBadges(state: ParkState): boolean {
  return PARK_BADGE_IDS.every((badgeId) => state.badges.includes(badgeId));
}

export function earnedBadgeCount(state: ParkState): number {
  return PARK_BADGE_IDS.filter((badgeId) => state.badges.includes(badgeId)).length;
}

function orderedBadges(earned: ReadonlySet<string>): string[] {
  return PARK_BADGES.map((badge) => badge.id).filter((badgeId) => earned.has(badgeId));
}

function syncBadges(state: ParkState): ParkState {
  const earned = new Set(state.badges.filter(isParkBadgeId));
  const hasAllActivities = PARK_ACTIVITY_BADGE_IDS.every((badgeId) => earned.has(badgeId));

  if (hasAllActivities) {
    earned.add(META_BADGE_ID);
  } else {
    earned.delete(META_BADGE_ID);
  }

  return {
    ...state,
    badges: orderedBadges(earned),
    goals: state.goals.map((goal) => ({ ...goal })),
  };
}

function sanitizeGoals(state: ParkState, options: Pick<ParkOptions, 'hasToys'>): ParkState {
  const seen = new Set<string>();
  const goals: ParkGoalProgress[] = [];

  for (const entry of state.goals) {
    const goal = getParkGoal(entry.goalId);
    if (!goal || seen.has(goal.id) || goals.length >= 3) {
      continue;
    }
    if (goal.activity === 'toys' && !options.hasToys && entry.progress < goal.target) {
      continue;
    }
    seen.add(goal.id);
    goals.push({
      goalId: goal.id,
      progress: Math.min(goal.target, Math.max(0, Math.floor(entry.progress))),
    });
  }

  return { ...state, goals };
}

function awardCompletedGoals(state: ParkState): ParkState {
  const earned = new Set(state.badges.filter(isParkBadgeId));
  for (const entry of state.goals) {
    const goal = getParkGoal(entry.goalId);
    if (goal && isGoalComplete(goal, entry.progress)) {
      earned.add(goal.badgeId);
    }
  }

  const hasAllActivities = PARK_ACTIVITY_BADGE_IDS.every((badgeId) => earned.has(badgeId));
  if (hasAllActivities) {
    earned.add(META_BADGE_ID);
  }

  return { ...state, badges: orderedBadges(earned) };
}

function shuffled<T>(values: readonly T[], rng: () => number): T[] {
  const entries = [...values];
  for (let index = entries.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const value = entries[index];
    entries[index] = entries[swapIndex];
    entries[swapIndex] = value;
  }
  return entries;
}

export function createGoalSet(state: ParkState, options: ParkOptions): ParkGoalProgress[] {
  const earned = new Set(state.badges.filter(isParkBadgeId));
  if (PARK_ACTIVITY_BADGE_IDS.every((badgeId) => earned.has(badgeId))) {
    return [];
  }

  const rng = options.rng ?? Math.random;
  const goals: ParkGoalProgress[] = [];
  const usedActivities = new Set<ParkActivityId>();

  const favoriteGoal = getParkGoal(FAVORITE_GOAL_ID);
  if (favoriteGoal && !earned.has(FAVORITE_BADGE_ID)) {
    const favorite = currentFavoriteActivity(options.petId, options.hasToys);
    goals.push({ goalId: favoriteGoal.id, progress: 0 });
    usedActivities.add(favorite);
  }

  const candidates = shuffled(
    PARK_GOALS.filter(
      (goal) =>
        goal.id !== FAVORITE_GOAL_ID &&
        !earned.has(goal.badgeId) &&
        (goal.activity !== 'toys' || options.hasToys) &&
        !usedActivities.has(goal.activity as ParkActivityId),
    ),
    rng,
  );

  for (const goal of candidates) {
    if (goals.length >= 3) {
      break;
    }
    if (usedActivities.has(goal.activity as ParkActivityId)) {
      continue;
    }
    usedActivities.add(goal.activity as ParkActivityId);
    goals.push({ goalId: goal.id, progress: 0 });
  }

  return goals;
}

export function ensureParkGoals(state: ParkState, options: ParkOptions): ParkState {
  let next = syncBadges(state);
  next = sanitizeGoals(next, options);
  next = awardCompletedGoals(next);

  if (hasAllParkBadges(next)) {
    return next.goals.length === 0 ? next : { ...next, goals: [] };
  }

  const allComplete =
    next.goals.length > 0 &&
    next.goals.every((entry) => {
      const goal = getParkGoal(entry.goalId);
      return goal ? isGoalComplete(goal, entry.progress) : false;
    });

  if (next.goals.length === 0 || allComplete) {
    return { ...next, goals: createGoalSet(next, options) };
  }

  return next;
}

function awardBadge(
  earned: Set<string>,
  awarded: Map<string, ParkBadgeDefinition>,
  badgeId: string,
): void {
  if (earned.has(badgeId)) {
    return;
  }
  const badge = getParkBadge(badgeId);
  if (!badge) {
    return;
  }
  earned.add(badgeId);
  awarded.set(badge.id, badge);
}

export function recordParkActivity(
  state: ParkState,
  activity: ParkActivityId,
  options: ParkOptions,
  amount = 1,
): ParkActivityResult {
  let next = syncBadges(state);
  next = sanitizeGoals(next, options);

  const favorite = currentFavoriteActivity(options.petId, options.hasToys);
  const earned = new Set(next.badges.filter(isParkBadgeId));
  const awarded = new Map<string, ParkBadgeDefinition>();
  const completedGoals: ParkGoalProgress[] = [];
  const goals = next.goals.map((entry) => ({ ...entry }));

  for (const entry of goals) {
    const goal = getParkGoal(entry.goalId);
    if (!goal || isGoalComplete(goal, entry.progress)) {
      continue;
    }
    const targetActivity = goalActivity(goal, options);
    if (targetActivity !== activity) {
      continue;
    }

    const progress = Math.min(goal.target, entry.progress + Math.max(1, Math.floor(amount)));
    entry.progress = progress;
    if (isGoalComplete(goal, progress)) {
      completedGoals.push({ ...entry });
      awardBadge(earned, awarded, goal.badgeId);
    }
  }

  const hasAllActivities = PARK_ACTIVITY_BADGE_IDS.every((badgeId) => earned.has(badgeId));
  if (hasAllActivities) {
    awardBadge(earned, awarded, META_BADGE_ID);
  }

  next = {
    ...next,
    badges: orderedBadges(earned),
    goals,
  };

  return {
    state: next,
    completedGoals,
    awardedBadges: [...awarded.values()],
    favoriteMatched: favorite === activity,
  };
}
