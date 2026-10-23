import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST } from '@/game/assets';
import {
  FAVORITE_BADGE_ID,
  FAVORITE_GOAL_ID,
  getParkActivity,
  getParkBadge,
  getParkGoal,
  getParkGoalLabel,
  META_BADGE_ID,
  PARK_ACTIVITIES,
  PARK_ACTIVITY_BADGE_IDS,
  PARK_BADGE_IDS,
  PARK_GOALS,
  PET_PARK_PREFERENCES,
} from '@/game/catalog/park';
import { PETS } from '@/game/catalog/pets';
import type { ParkState } from '@/game/types';
import {
  createGoalSet,
  ensureParkGoals,
  goalActivity,
  hasAllParkBadges,
  recordParkActivity,
} from '@/systems/park';

function emptyPark(): ParkState {
  return { badges: [], goals: [], tutorialDone: true };
}

const fakeRng = (): number => 0.5;

describe('park catalog', () => {
  it('gives every pet a favorite park activity with valid assets', () => {
    const assetKeys = new Set(ASSET_MANIFEST.map((asset) => asset.key));
    for (const pet of PETS) {
      const preference = PET_PARK_PREFERENCES[pet.id];
      expect(preference.favorites.length).toBeGreaterThan(0);
      for (const activityId of preference.favorites) {
        const activity = getParkActivity(activityId);
        expect(activity).toBeDefined();
        if (activity) {
          expect(assetKeys.has(activity.iconKey)).toBe(true);
        }
      }
    }
  });

  it('links every goal to a valid badge and activity', () => {
    for (const goal of PARK_GOALS) {
      expect(getParkBadge(goal.badgeId)).toBeDefined();
      if (goal.activity !== 'favorite') {
        expect(getParkActivity(goal.activity)).toBeDefined();
      }
    }
    expect(new Set(PARK_GOALS.map((goal) => goal.id)).size).toBe(PARK_GOALS.length);
    expect(new Set(PARK_BADGE_IDS).size).toBe(PARK_BADGE_IDS.length);
  });

  it('keeps every park icon in the asset manifest', () => {
    const assetKeys = new Set(ASSET_MANIFEST.map((asset) => asset.key));
    for (const activity of Object.values(PARK_ACTIVITIES)) {
      expect(assetKeys.has(activity.iconKey)).toBe(true);
    }
    for (const badgeId of PARK_BADGE_IDS) {
      const badge = getParkBadge(badgeId);
      expect(badge).toBeDefined();
      expect(assetKeys.has(badge?.iconKey ?? '')).toBe(true);
    }
  });

  it('keeps joy rewards calm', () => {
    for (const activity of Object.values(PARK_ACTIVITIES)) {
      expect(activity.joy).toBeGreaterThan(0);
      expect(activity.joy).toBeLessThanOrEqual(20);
    }
  });

  it('uses the pet name in the favorite goal label', () => {
    const goal = getParkGoal(FAVORITE_GOAL_ID);
    expect(goal).toBeDefined();
    if (!goal) {
      return;
    }
    const label = getParkGoalLabel(goal, 'dog', 'Baloo', true);
    expect(label).toContain('Baloo');
    expect(label).toContain('hente bolden');
  });
});

describe('park goals', () => {
  it('always includes the favorite goal and distinct activities', () => {
    const goals = createGoalSet(emptyPark(), {
      petId: 'dog',
      hasToys: true,
      rng: fakeRng,
    });

    expect(goals).toHaveLength(3);
    expect(goals.map((goal) => goal.goalId)).toContain(FAVORITE_GOAL_ID);
    const activities = goals.map((goal) => {
      const definition = getParkGoal(goal.goalId);
      return definition ? goalActivity(definition, { petId: 'dog', hasToys: true }) : null;
    });
    expect(new Set(activities).size).toBe(activities.length);
  });

  it('avoids toy goals and falls back when the pet has no toys', () => {
    const goals = createGoalSet(emptyPark(), {
      petId: 'hamster',
      hasToys: false,
      rng: fakeRng,
    });
    const activityIds = goals.map((goal) => {
      const definition = getParkGoal(goal.goalId);
      return definition ? goalActivity(definition, { petId: 'hamster', hasToys: false }) : null;
    });

    expect(activityIds).not.toContain('toys');
    expect(activityIds).toContain('flowers');
  });

  it('does not repeat completed badges in a new goal set', () => {
    const state = emptyPark();
    state.badges = ['ball-master', 'bubble-rider'];
    const goals = createGoalSet(state, { petId: 'dog', hasToys: true, rng: fakeRng });

    expect(goals.map((goal) => goal.goalId)).not.toContain('ball-twice');
    expect(goals.map((goal) => goal.goalId)).not.toContain('bubbles-six');
  });

  it('generates a new set when all current goals are complete', () => {
    const state: ParkState = {
      badges: [],
      goals: [
        { goalId: 'ball-twice', progress: 2 },
        { goalId: 'bubbles-six', progress: 6 },
        { goalId: 'ducks-visit', progress: 1 },
      ],
      tutorialDone: true,
    };
    const next = ensureParkGoals(state, { petId: 'dog', hasToys: true, rng: fakeRng });

    expect(next.goals).toHaveLength(3);
    expect(next.goals.every((goal) => goal.progress === 0)).toBe(true);
  });

  it('clears goals when every badge is earned', () => {
    const state: ParkState = {
      badges: [...PARK_BADGE_IDS],
      goals: [{ goalId: 'ball-twice', progress: 2 }],
      tutorialDone: true,
    };
    const next = ensureParkGoals(state, { petId: 'dog', hasToys: true, rng: fakeRng });

    expect(hasAllParkBadges(next)).toBe(true);
    expect(next.goals).toEqual([]);
  });
});

describe('park progress', () => {
  it('awards a badge once and caps progress at the target', () => {
    const state: ParkState = {
      badges: [],
      goals: [{ goalId: 'ball-twice', progress: 0 }],
      tutorialDone: true,
    };
    const first = recordParkActivity(state, 'ball', {
      petId: 'dog',
      hasToys: true,
    });
    expect(first.state.goals[0]?.progress).toBe(1);
    expect(first.awardedBadges).toEqual([]);

    const second = recordParkActivity(first.state, 'ball', {
      petId: 'dog',
      hasToys: true,
    });
    expect(second.state.goals[0]?.progress).toBe(2);
    expect(second.completedGoals.map((goal) => goal.goalId)).toEqual(['ball-twice']);
    expect(second.awardedBadges.map((badge) => badge.id)).toEqual(['ball-master']);

    const third = recordParkActivity(second.state, 'ball', {
      petId: 'dog',
      hasToys: true,
    });
    expect(third.state.goals[0]?.progress).toBe(2);
    expect(third.awardedBadges).toEqual([]);
  });

  it('completes the pet favorite goal for the matching activity', () => {
    const state: ParkState = {
      badges: [],
      goals: [{ goalId: FAVORITE_GOAL_ID, progress: 0 }],
      tutorialDone: true,
    };
    const result = recordParkActivity(state, 'ball', { petId: 'dog', hasToys: true });

    expect(result.favoriteMatched).toBe(true);
    expect(result.completedGoals.map((goal) => goal.goalId)).toEqual([FAVORITE_GOAL_ID]);
    expect(result.awardedBadges.map((badge) => badge.id)).toEqual([FAVORITE_BADGE_ID]);
  });

  it('awards the meta badge when the seven activity badges are collected', () => {
    const remainingBadge = 'relaxer';
    const badges = PARK_ACTIVITY_BADGE_IDS.filter((badgeId) => badgeId !== remainingBadge);
    const state: ParkState = {
      badges,
      goals: [{ goalId: 'bench-rest', progress: 0 }],
      tutorialDone: true,
    };
    const result = recordParkActivity(state, 'bench', { petId: 'owl', hasToys: true });

    expect(result.awardedBadges.map((badge) => badge.id)).toEqual([
      remainingBadge,
      META_BADGE_ID,
    ]);
    expect(hasAllParkBadges(result.state)).toBe(true);
  });

  it('ignores activities that are not part of a goal', () => {
    const state: ParkState = {
      badges: [],
      goals: [{ goalId: 'ball-twice', progress: 1 }],
      tutorialDone: true,
    };
    const result = recordParkActivity(state, 'flowers', { petId: 'dog', hasToys: true });

    expect(result.state.goals[0]?.progress).toBe(1);
    expect(result.awardedBadges).toEqual([]);
  });
});
