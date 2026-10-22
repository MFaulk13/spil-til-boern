import { describe, expect, it } from 'vitest';
import {
  createMathQuestion,
  createQuizQuestion,
  createReadingQuestion,
  QUIZ_HEARTS_PER_ANSWER,
  QUIZ_ROUND_LENGTH,
} from '@/game/catalog/quiz';

describe('quiz', () => {
  it('generates math questions with three unique answer options', () => {
    for (let index = 0; index < 100; index += 1) {
      const question = createMathQuestion();
      expect(question.prompt.length).toBeGreaterThan(0);
      expect(question.options).toHaveLength(3);
      expect(new Set(question.options.map((option) => option.id)).size).toBe(3);
      expect(question.options.some((option) => option.id === question.answerId)).toBe(true);
      for (const option of question.options) {
        expect(Number(option.label)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('builds reading questions from the question bank', () => {
    for (let index = 0; index < 20; index += 1) {
      const question = createReadingQuestion();
      expect(question.prompt.length).toBeGreaterThan(0);
      expect(question.options.length).toBeGreaterThanOrEqual(3);
      expect(question.options.some((option) => option.id === question.answerId)).toBe(true);
    }
  });

  it('can avoid repeating the previous reading question', () => {
    const first = createReadingQuestion(undefined, { random: () => 0 });
    const second = createReadingQuestion(first.id, { random: () => 0 });
    expect(second.id).not.toBe(first.id);
  });

  it('uses a positive reward and a calm round length', () => {
    expect(QUIZ_HEARTS_PER_ANSWER).toBeGreaterThan(0);
    expect(QUIZ_HEARTS_PER_ANSWER).toBeLessThanOrEqual(5);
    expect(QUIZ_ROUND_LENGTH).toBeGreaterThanOrEqual(3);
    expect(QUIZ_ROUND_LENGTH).toBeLessThanOrEqual(8);
  });

  it('creates the requested mode', () => {
    expect(createQuizQuestion('math').prompt).toContain('Hvad er');
  });
});
