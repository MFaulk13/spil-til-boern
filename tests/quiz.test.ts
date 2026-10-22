import { describe, expect, it } from 'vitest';
import {
  createMathQuestion,
  createMathQuestionOfType,
  createQuizQuestion,
  QUIZ_ROUND_LENGTH,
  QUIZ_SUBJECT_INFO,
  type MathQuestionType,
} from '@/game/catalog/quiz';
import { text } from '@/game/text';
import { QUIZ_SUBJECTS } from '@/game/types';
import {
  FIRST_COMPLETION_BONUS,
  heartsForRound,
  nextSchoolProgress,
  starsFor,
} from '@/systems/school';

const MATH_TYPES: readonly MathQuestionType[] = [
  'add',
  'sub',
  'table',
  'division',
  'sequence',
  'word',
  'clock',
  'money',
];

describe('quiz', () => {
  it('has info for every subject', () => {
    expect(QUIZ_SUBJECT_INFO.map((info) => info.subject)).toEqual([...QUIZ_SUBJECTS]);
    for (const info of QUIZ_SUBJECT_INFO) {
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.hint.length).toBeGreaterThan(0);
      expect(info.icon.length).toBeGreaterThan(0);
    }
  });

  it('generates three unique options with the answer present for every subject', () => {
    for (const subject of QUIZ_SUBJECTS) {
      for (let index = 0; index < 40; index += 1) {
        const question = createQuizQuestion(subject);
        expect(question.subject).toBe(subject);
        expect(question.prompt.length).toBeGreaterThan(0);
        expect(question.options).toHaveLength(3);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(3);
        expect(question.options.some((option) => option.id === question.answerId)).toBe(true);
        expect(question.explanation.length).toBeGreaterThan(0);
      }
    }
  });

  it('generates every math question type', () => {
    for (const type of MATH_TYPES) {
      for (let index = 0; index < 30; index += 1) {
        const question = createMathQuestionOfType(type);
        expect(question.options).toHaveLength(3);
        expect(question.options.some((option) => option.id === question.answerId)).toBe(true);
        expect(Number(question.answerId)).toBeGreaterThanOrEqual(0);
      }
    }

    expect(createMathQuestionOfType('clock').visual?.kind).toBe('clock');
    expect(createMathQuestionOfType('money').visual?.kind).toBe('coins');
  });

  it('keeps division exact and subtraction non-negative', () => {
    for (let index = 0; index < 60; index += 1) {
      const division = createMathQuestionOfType('division');
      const match = /Hvad er (\d+) ÷ (\d+)\?/.exec(division.prompt);
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1]) % Number(match[2])).toBe(0);
      }

      const subtraction = createMathQuestionOfType('sub');
      expect(Number(subtraction.answerId)).toBeGreaterThanOrEqual(0);
    }
  });

  it('only reads aloud where it makes sense', () => {
    for (const subject of ['math', 'english', 'nature'] as const) {
      expect(createQuizQuestion(subject).readAloud).toBe(true);
    }

    const danish = Array.from({ length: 80 }, () => createQuizQuestion('danish'));
    expect(danish.some((question) => question.readAloud)).toBe(true);
    expect(danish.some((question) => !question.readAloud)).toBe(true);
    expect(danish.some((question) => question.speech !== undefined)).toBe(true);
  });

  it('has complete spelling prompts', () => {
    const bold = text.quiz.danish.find((entry) => entry.prompt.includes('b_ld'));
    const hus = text.quiz.danish.find((entry) => entry.prompt.includes('h_s'));

    expect(bold).toBeDefined();
    expect(hus).toBeDefined();
    expect(bold?.options[bold.answer]).toBe('o');
    expect(hus?.options[hus.answer]).toBe('u');
  });

  it('can avoid repeating the previous bank question', () => {
    const first = createQuizQuestion('danish', undefined, { random: () => 0 });
    const second = createQuizQuestion('danish', first.id, { random: () => 0 });
    expect(second.id).not.toBe(first.id);
  });

  it('creates math questions with a calm round length', () => {
    expect(QUIZ_ROUND_LENGTH).toBeGreaterThanOrEqual(3);
    expect(QUIZ_ROUND_LENGTH).toBeLessThanOrEqual(8);
    expect(createMathQuestion().prompt.length).toBeGreaterThan(0);
  });
});

describe('school rewards', () => {
  it('awards stars for first-try answers', () => {
    expect(starsFor(5, 5)).toBe(3);
    expect(starsFor(4, 5)).toBe(2);
    expect(starsFor(3, 5)).toBe(1);
    expect(starsFor(2, 5)).toBe(0);
  });

  it('adds the first-time bonus only once', () => {
    expect(heartsForRound(3, true)).toBe(18);
    expect(heartsForRound(3, false)).toBe(13);
    expect(heartsForRound(0, true)).toBe(10 + FIRST_COMPLETION_BONUS);
    expect(heartsForRound(0, false)).toBe(10);
  });

  it('tracks rounds, best stars and first completion', () => {
    const first = nextSchoolProgress(undefined, {
      stars: 2,
      firstTryCorrect: 4,
      totalQuestions: 5,
    });
    expect(first.firstCompletion).toBe(true);
    expect(first.progress).toEqual({
      rounds: 1,
      bestStars: 2,
      firstTryCorrect: 4,
      totalQuestions: 5,
      firstCompleted: true,
    });

    const second = nextSchoolProgress(first.progress, {
      stars: 3,
      firstTryCorrect: 5,
      totalQuestions: 5,
    });
    expect(second.firstCompletion).toBe(false);
    expect(second.progress.rounds).toBe(2);
    expect(second.progress.bestStars).toBe(3);
    expect(second.progress.firstTryCorrect).toBe(9);
    expect(second.progress.totalQuestions).toBe(10);
  });
});
