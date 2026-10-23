import { getPet } from '@/game/catalog/pets';
import type { CareAction } from '@/game/care';
import { CARE_NEEDS, clampNeed, type CareNeed, type Needs, type PetId } from '@/game/types';

export { CARE_ACTIONS } from '@/game/care';
export type { CareAction, PetCareProfile } from '@/game/care';

export type Mood = 'happy' | 'okay' | 'sad';

export interface CareEffect {
  need: CareNeed;
  amount: number;
  secondary?: {
    need: CareNeed;
    amount: number;
  };
  favoriteAmount?: number;
  favoriteSecondary?: number;
}

export const CARE_EFFECTS: Record<CareAction, CareEffect> = {
  feed: { need: 'hunger', amount: 25 },
  play: { need: 'joy', amount: 25 },
  pet: { need: 'joy', amount: 12 },
  sleep: { need: 'energy', amount: 30 },
  treat: {
    need: 'hunger',
    amount: 15,
    secondary: { need: 'joy', amount: 4 },
    favoriteAmount: 22,
    favoriteSecondary: 8,
  },
};

export const NEED_DECAY_PER_SECOND: Record<CareNeed, number> = {
  hunger: 1 / 12,
  joy: 1 / 15,
  energy: 1 / 20,
};

export const DEFAULT_DECAY_MULTIPLIERS: Record<CareNeed, number> = {
  hunger: 1,
  joy: 1,
  energy: 1,
};

export const MOOD_THRESHOLDS = {
  happy: 75,
  okay: 40,
} as const;

export const LOW_NEED_THRESHOLD = 35;
export const CARE_BOND_THRESHOLD = 60;
export const DIMINISHING_THRESHOLD = 85;
export const STRONG_DIMINISHING_THRESHOLD = 95;

export const BOND_LEVELS = [0, 10, 25, 50, 100] as const;

export interface CareContext {
  petId: PetId;
  treatId?: string | null;
}

export interface CareResult {
  needs: Needs;
  gained: number;
  bond: number;
  favorite: boolean;
  diminished: boolean;
}

export function tickNeeds(
  needs: Needs,
  elapsedSeconds: number,
  decayMultipliers: Readonly<Record<CareNeed, number>> = DEFAULT_DECAY_MULTIPLIERS,
): Needs {
  const seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  return {
    hunger: clampNeed(
      needs.hunger - NEED_DECAY_PER_SECOND.hunger * decayMultipliers.hunger * seconds,
    ),
    joy: clampNeed(needs.joy - NEED_DECAY_PER_SECOND.joy * decayMultipliers.joy * seconds),
    energy: clampNeed(
      needs.energy - NEED_DECAY_PER_SECOND.energy * decayMultipliers.energy * seconds,
    ),
  };
}

export function careFactor(current: number): number {
  if (current >= STRONG_DIMINISHING_THRESHOLD) {
    return 0.25;
  }
  if (current >= DIMINISHING_THRESHOLD) {
    return 0.5;
  }
  return 1;
}

export function applyCare(needs: Needs, action: CareAction, context?: CareContext): CareResult {
  const effect = CARE_EFFECTS[action];
  const profile = context ? getPet(context.petId).care : undefined;
  const treatId = context?.treatId ?? null;
  const favoriteTreat =
    action === 'treat' && treatId !== null && (profile?.favoriteTreats.includes(treatId) ?? false);
  const favoriteAction = profile?.favoriteAction === action;
  const favorite = favoriteAction || favoriteTreat;

  const amount = favoriteTreat ? (effect.favoriteAmount ?? effect.amount) : effect.amount;
  const before = needs[effect.need];
  const after = clampNeed(before + amount * careFactor(before));
  const gained = after - before;
  const updated: Needs = { ...needs, [effect.need]: after };

  if (effect.secondary) {
    const secondaryBefore = updated[effect.secondary.need];
    const secondaryAmount = favoriteTreat
      ? (effect.favoriteSecondary ?? effect.secondary.amount)
      : effect.secondary.amount;
    updated[effect.secondary.need] = clampNeed(
      secondaryBefore + secondaryAmount * careFactor(secondaryBefore),
    );
  }

  const baseBond = before < LOW_NEED_THRESHOLD ? 3 : before < CARE_BOND_THRESHOLD ? 1 : 0;
  const bond = gained > 0 && before < CARE_BOND_THRESHOLD ? baseBond + (favorite ? 1 : 0) : 0;

  return {
    needs: updated,
    gained,
    bond,
    favorite,
    diminished: gained > 0 && gained < amount,
  };
}

export function moodOf(needs: Needs): Mood {
  const values = CARE_NEEDS.map((need) => needs[need]);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  const lowest = Math.min(...values);
  const score = average * 0.6 + lowest * 0.4;

  if (score >= MOOD_THRESHOLDS.happy) {
    return 'happy';
  }
  if (score >= MOOD_THRESHOLDS.okay) {
    return 'okay';
  }
  return 'sad';
}

export function lowestNeed(needs: Needs): CareNeed {
  return CARE_NEEDS.reduce<CareNeed>(
    (lowest, need) => (needs[need] < needs[lowest] ? need : lowest),
    CARE_NEEDS[0],
  );
}

export function isNeedLow(needs: Needs, threshold = LOW_NEED_THRESHOLD): boolean {
  return CARE_NEEDS.some((need) => needs[need] < threshold);
}

export function bondLevelIndex(bond: number): number {
  if (!Number.isFinite(bond)) {
    return 0;
  }
  let level = 0;
  for (let index = 0; index < BOND_LEVELS.length; index += 1) {
    if (bond >= BOND_LEVELS[index]) {
      level = index;
    }
  }
  return level;
}
