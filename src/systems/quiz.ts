import type { QuizDifficulty } from '@/game/catalog/quiz';

export interface AdaptiveQuizState {
  difficulty: QuizDifficulty;
  streak: number;
}

export function clampDifficulty(value: number): QuizDifficulty {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(3, Math.max(1, Math.floor(value))) as QuizDifficulty;
}

export function startDifficulty(bestStars: number): QuizDifficulty {
  return clampDifficulty(bestStars >= 2 ? 2 : 1);
}

export function initialAdaptiveState(bestStars: number): AdaptiveQuizState {
  return {
    difficulty: startDifficulty(bestStars),
    streak: 0,
  };
}

export function nextAdaptiveState(
  state: AdaptiveQuizState,
  firstTryCorrect: boolean,
): AdaptiveQuizState {
  if (firstTryCorrect) {
    const streak = state.streak + 1;
    if (streak >= 2 && state.difficulty < 3) {
      return { difficulty: clampDifficulty(state.difficulty + 1), streak: 0 };
    }
    return { difficulty: state.difficulty, streak };
  }

  return {
    difficulty: clampDifficulty(state.difficulty - 1),
    streak: 0,
  };
}
