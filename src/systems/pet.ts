import { CARE_NEEDS, clampNeed, type CareNeed, type Needs } from '@/game/types';

export type Mood = 'happy' | 'okay' | 'sad';

export type CareAction = 'feed' | 'play' | 'pet' | 'sleep' | 'treat';

export interface CareEffect {
  need: CareNeed;
  amount: number;
  hearts: number;
}

export const CARE_EFFECTS: Record<CareAction, CareEffect> = {
  feed: { need: 'hunger', amount: 35, hearts: 2 },
  play: { need: 'joy', amount: 30, hearts: 3 },
  pet: { need: 'joy', amount: 15, hearts: 1 },
  sleep: { need: 'energy', amount: 40, hearts: 1 },
  treat: { need: 'hunger', amount: 20, hearts: 1 },
};

export const NEED_DECAY_PER_SECOND: Record<CareNeed, number> = {
  hunger: 1 / 18,
  joy: 1 / 24,
  energy: 1 / 36,
};

export const MOOD_THRESHOLDS = {
  happy: 75,
  okay: 40,
} as const;

export const LOW_NEED_THRESHOLD = 35;

export interface CareResult {
  needs: Needs;
  gained: number;
  hearts: number;
}

export function tickNeeds(needs: Needs, elapsedSeconds: number): Needs {
  const seconds = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  return {
    hunger: clampNeed(needs.hunger - NEED_DECAY_PER_SECOND.hunger * seconds),
    joy: clampNeed(needs.joy - NEED_DECAY_PER_SECOND.joy * seconds),
    energy: clampNeed(needs.energy - NEED_DECAY_PER_SECOND.energy * seconds),
  };
}

export function applyCare(needs: Needs, action: CareAction): CareResult {
  const effect = CARE_EFFECTS[action];
  const before = needs[effect.need];
  const after = clampNeed(before + effect.amount);
  const gained = after - before;

  return {
    needs: { ...needs, [effect.need]: after },
    gained,
    hearts: gained > 0 ? effect.hearts : 0,
  };
}

export function moodOf(needs: Needs): Mood {
  const average = (needs.hunger + needs.joy + needs.energy) / 3;
  if (average >= MOOD_THRESHOLDS.happy) {
    return 'happy';
  }
  if (average >= MOOD_THRESHOLDS.okay) {
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
