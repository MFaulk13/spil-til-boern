import type { SchoolProgress } from '@/game/types';

export const SCHOOL_ROUND_LENGTH = 5;
export const HEARTS_PER_SOLVED = 2;
export const HEARTS_PER_STAR = 1;
export const FIRST_COMPLETION_BONUS = 5;

export type StarCount = 0 | 1 | 2 | 3;

export interface SchoolRoundResult {
  stars: number;
  firstTryCorrect: number;
  totalQuestions: number;
}

export const EMPTY_SCHOOL_PROGRESS: SchoolProgress = {
  rounds: 0,
  bestStars: 0,
  firstTryCorrect: 0,
  totalQuestions: 0,
  firstCompleted: false,
};

export function clampStars(value: number): StarCount {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.floor(value), 0), 3) as StarCount;
}

export function starsFor(firstTryCorrect: number, total = SCHOOL_ROUND_LENGTH): StarCount {
  const totalQuestions = Math.max(0, Math.floor(total));
  if (totalQuestions === 0) {
    return 0;
  }
  const correct = Math.min(Math.max(Math.floor(firstTryCorrect), 0), totalQuestions);

  if (correct >= totalQuestions) {
    return 3;
  }
  if (correct >= Math.max(1, totalQuestions - 1)) {
    return 2;
  }
  if (correct >= Math.max(1, totalQuestions - 2)) {
    return 1;
  }
  return 0;
}

export function baseHeartsForSolved(solved: number): number {
  return Math.max(0, Math.floor(solved)) * HEARTS_PER_SOLVED;
}

export function heartsForRound(
  stars: number,
  firstCompletion: boolean,
  solved = SCHOOL_ROUND_LENGTH,
): number {
  return (
    baseHeartsForSolved(solved) +
    clampStars(stars) * HEARTS_PER_STAR +
    (firstCompletion ? FIRST_COMPLETION_BONUS : 0)
  );
}

export function nextSchoolProgress(
  current: SchoolProgress | undefined,
  result: SchoolRoundResult,
): { progress: SchoolProgress; firstCompletion: boolean } {
  const firstCompletion = !current?.firstCompleted;
  const progress: SchoolProgress = {
    rounds: (current?.rounds ?? 0) + 1,
    bestStars: Math.max(clampStars(current?.bestStars ?? 0), clampStars(result.stars)),
    firstTryCorrect:
      (current?.firstTryCorrect ?? 0) + Math.max(0, Math.floor(result.firstTryCorrect)),
    totalQuestions: (current?.totalQuestions ?? 0) + Math.max(0, Math.floor(result.totalQuestions)),
    firstCompleted: true,
  };
  return { progress, firstCompletion };
}
