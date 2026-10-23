import { text } from '@/game/text';
import type { QuizSubject } from '@/game/types';

export type { QuizSubject };
export type QuizMode = QuizSubject;
export type QuizDifficulty = 1 | 2 | 3;
export type QuizSpeechLang = 'da-DK' | 'en-US';

export interface QuizOption {
  id: string;
  label: string;
}

export type QuizShape = 'circle' | 'square' | 'triangle' | 'rectangle';

export type QuizVisual =
  | { kind: 'clock'; hour: number; minute: number }
  | { kind: 'coins'; coins: readonly number[] }
  | { kind: 'fraction'; numerator: number; denominator: number }
  | { kind: 'shape'; shape: QuizShape }
  | { kind: 'numberLine'; from: number; to: number; step: number; mark: number };

export interface QuizQuestion {
  id: string;
  subject: QuizSubject;
  prompt: string;
  options: QuizOption[];
  answerId: string;
  explanation: string;
  readAloud: boolean;
  difficulty: QuizDifficulty;
  speech?: string;
  speechLang?: QuizSpeechLang;
  audio?: readonly number[];
  visual?: QuizVisual;
}

export interface QuizBankEntry {
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation: string;
  difficulty: QuizDifficulty;
  readAloud?: boolean;
  speech?: string;
  speechLang?: QuizSpeechLang;
  audio?: readonly number[];
}

export interface QuizSubjectInfo {
  subject: QuizSubject;
  label: string;
  hint: string;
  icon: string;
}

export interface CreateQuizQuestionOptions {
  previousId?: string;
  usedIds?: ReadonlySet<string>;
  difficulty?: QuizDifficulty;
  source?: Pick<Math, 'random'>;
  allowAudio?: boolean;
}

export const QUIZ_ROUND_LENGTH = 5;

export const QUIZ_SUBJECT_INFO: readonly QuizSubjectInfo[] = [
  {
    subject: 'math',
    label: text.school.math,
    hint: text.school.mathHint,
    icon: 'icon-math',
  },
  {
    subject: 'danish',
    label: text.school.danish,
    hint: text.school.danishHint,
    icon: 'icon-danish',
  },
  {
    subject: 'english',
    label: text.school.english,
    hint: text.school.englishHint,
    icon: 'icon-english',
  },
  {
    subject: 'nature',
    label: text.school.nature,
    hint: text.school.natureHint,
    icon: 'icon-nature',
  },
  {
    subject: 'history',
    label: text.school.history,
    hint: text.school.historyHint,
    icon: 'icon-history',
  },
  {
    subject: 'religion',
    label: text.school.religion,
    hint: text.school.religionHint,
    icon: 'icon-religion',
  },
  {
    subject: 'music',
    label: text.school.music,
    hint: text.school.musicHint,
    icon: 'icon-music',
  },
  {
    subject: 'sport',
    label: text.school.sport,
    hint: text.school.sportHint,
    icon: 'icon-sport',
  },
];

export function getQuizSubjectInfo(subject: QuizSubject): QuizSubjectInfo {
  return QUIZ_SUBJECT_INFO.find((info) => info.subject === subject) ?? QUIZ_SUBJECT_INFO[0];
}

let questionCounter = 0;

function nextId(prefix: string): string {
  questionCounter += 1;
  return `${prefix}-${questionCounter.toString(36)}`;
}

function shuffle<T>(items: readonly T[], source: Pick<Math, 'random'>): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(source.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function pick<T>(items: readonly T[], source: Pick<Math, 'random'>): T {
  return items[Math.floor(source.random() * items.length) % items.length];
}

function uniqueOptionValues(
  answer: number,
  candidates: readonly number[],
  source: Pick<Math, 'random'>,
): number[] {
  const values = new Set<number>([answer]);
  for (const candidate of candidates) {
    if (values.size >= 3) {
      break;
    }
    if (Number.isFinite(candidate) && candidate >= 0 && candidate !== answer) {
      values.add(Math.floor(candidate));
    }
  }
  let offset = 1;
  while (values.size < 3) {
    values.add(answer + offset);
    offset += 1;
  }
  return shuffle([...values], source);
}

function numericOptions(values: readonly number[]): QuizOption[] {
  return values.map((value) => ({ id: String(value), label: String(value) }));
}

function numericQuestion(
  type: string,
  prompt: string,
  answer: number,
  candidates: readonly number[],
  explanation: string,
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const values = uniqueOptionValues(answer, candidates, source);
  return {
    id: nextId(`math-${type}`),
    subject: 'math',
    prompt,
    options: numericOptions(values),
    answerId: String(answer),
    explanation,
    readAloud: true,
    difficulty,
  };
}

function clockParts(totalMinutes: number): { hour: number; minute: number } {
  const normalized = ((totalMinutes % 720) + 720) % 720;
  return {
    hour: Math.floor(normalized / 60) || 12,
    minute: normalized % 60,
  };
}

function createClockQuestion(
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const hour = 1 + Math.floor(source.random() * 12);
  const minuteChoices =
    difficulty === 1
      ? [0, 30]
      : difficulty === 2
        ? [0, 15, 30, 45]
        : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const minute = pick(minuteChoices, source);
  const total = (hour % 12) * 60 + minute;
  const values = uniqueOptionValues(
    total,
    [total + 60, total - 60, total + 15, total - 15],
    source,
  );
  const options = values.map((value) => {
    const parts = clockParts(value);
    return {
      id: String(value),
      label: text.quiz.clockLabel(parts.hour, parts.minute),
    };
  });

  return {
    id: nextId('math-clock'),
    subject: 'math',
    prompt: text.quiz.clockPrompt,
    options,
    answerId: String(total),
    explanation: text.quiz.clockExplain(hour, minute),
    readAloud: true,
    difficulty,
    visual: { kind: 'clock', hour, minute },
  };
}

function createMoneyQuestion(
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const pool = difficulty === 1 ? [1, 2, 5] : difficulty === 2 ? [1, 2, 5, 10] : [1, 2, 5, 10, 20];
  const count = (difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4) + Math.floor(source.random() * 2);
  const coins: number[] = [];
  for (let index = 0; index < count; index += 1) {
    coins.push(pick(pool, source));
  }
  const answer = coins.reduce((sum, coin) => sum + coin, 0);
  const values = uniqueOptionValues(
    answer,
    [answer + 1, answer + 5, answer - 1, answer + 10],
    source,
  );

  return {
    id: nextId('math-money'),
    subject: 'math',
    prompt: text.quiz.moneyPrompt,
    options: numericOptions(values),
    answerId: String(answer),
    explanation: text.quiz.moneyExplain(answer),
    readAloud: true,
    difficulty,
    visual: { kind: 'coins', coins },
  };
}

function fractionLabel(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

function createFractionQuestion(
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const denominators =
    difficulty === 1 ? [2, 4] : difficulty === 2 ? [2, 3, 4, 6] : [2, 3, 4, 5, 6, 8];
  const denominator = pick(denominators, source);
  const numerator = 1 + Math.floor(source.random() * (denominator - 1));
  const answer = fractionLabel(numerator, denominator);
  const candidates = shuffle(
    [
      [1, 2],
      [1, 3],
      [2, 3],
      [1, 4],
      [3, 4],
      [1, 5],
      [2, 5],
      [1, 6],
      [5, 6],
      [1, 8],
      [3, 8],
    ].filter(
      ([top, bottom]) =>
        top < bottom &&
        fractionLabel(top, bottom) !== answer &&
        top / bottom !== numerator / denominator,
    ),
    source,
  )
    .slice(0, 2)
    .map(([top, bottom]) => fractionLabel(top, bottom));
  const options = shuffle(
    [answer, ...candidates].map((label) => ({ id: label, label })),
    source,
  );

  return {
    id: nextId('math-fraction'),
    subject: 'math',
    prompt: text.quiz.fractionPrompt,
    options,
    answerId: answer,
    explanation: text.quiz.fractionExplain(numerator, denominator),
    readAloud: true,
    difficulty,
    visual: { kind: 'fraction', numerator, denominator },
  };
}

function createShapeQuestion(
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const shapes: readonly { shape: QuizShape; sides: number }[] =
    difficulty === 1
      ? [
          { shape: 'triangle', sides: 3 },
          { shape: 'square', sides: 4 },
        ]
      : difficulty === 2
        ? [
            { shape: 'triangle', sides: 3 },
            { shape: 'square', sides: 4 },
            { shape: 'rectangle', sides: 4 },
          ]
        : [
            { shape: 'triangle', sides: 3 },
            { shape: 'square', sides: 4 },
            { shape: 'rectangle', sides: 4 },
            { shape: 'circle', sides: 0 },
          ];
  const chosen = pick(shapes, source);
  const values = uniqueOptionValues(chosen.sides, [3, 4, 5, 0], source);

  return {
    id: nextId('math-shape'),
    subject: 'math',
    prompt: text.quiz.shapePrompt,
    options: numericOptions(values),
    answerId: String(chosen.sides),
    explanation: text.quiz.shapeExplain(chosen.sides),
    readAloud: true,
    difficulty,
    visual: { kind: 'shape', shape: chosen.shape },
  };
}

function createNumberLineQuestion(
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const config =
    difficulty === 1
      ? { from: 0, to: 10, step: 2 }
      : difficulty === 2
        ? { from: 0, to: 100, step: 10 }
        : { from: 0, to: 1000, step: 100 };
  const marks = config.to / config.step;
  const index = 1 + Math.floor(source.random() * Math.max(1, marks - 1));
  const mark = index * config.step;
  const values = uniqueOptionValues(
    mark,
    [mark + config.step, mark - config.step, mark + 1, mark - 1],
    source,
  );

  return {
    id: nextId('math-numberline'),
    subject: 'math',
    prompt: text.quiz.numberLinePrompt,
    options: numericOptions(values),
    answerId: String(mark),
    explanation: text.quiz.numberLineExplain(mark),
    readAloud: true,
    difficulty,
    visual: { kind: 'numberLine', ...config, mark },
  };
}

function createRoundingQuestion(
  source: Pick<Math, 'random'>,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const units: readonly number[] =
    difficulty === 1 ? [10] : difficulty === 2 ? [10, 100] : [100, 1000];
  const unit = pick(units, source);
  const value =
    unit * (2 + Math.floor(source.random() * 7)) + 1 + Math.floor(source.random() * (unit - 1));
  const answer = Math.round(value / unit) * unit;
  const values = uniqueOptionValues(
    answer,
    [answer + unit, answer - unit, answer + 1, answer - 1],
    source,
  );

  return {
    id: nextId('math-rounding'),
    subject: 'math',
    prompt: text.quiz.roundingPrompt(value, unit),
    options: numericOptions(values),
    answerId: String(answer),
    explanation: text.quiz.roundingExplain(value, answer),
    readAloud: true,
    difficulty,
  };
}

export type MathQuestionType =
  | 'add'
  | 'sub'
  | 'table'
  | 'division'
  | 'sequence'
  | 'word'
  | 'clock'
  | 'money'
  | 'fraction'
  | 'shape'
  | 'numberline'
  | 'rounding';

const MATH_TYPES: readonly MathQuestionType[] = [
  'add',
  'sub',
  'table',
  'division',
  'sequence',
  'word',
  'clock',
  'money',
  'fraction',
  'shape',
  'numberline',
  'rounding',
];

let lastMathType: MathQuestionType | null = null;

function pickMathType(source: Pick<Math, 'random'>): MathQuestionType {
  const available = MATH_TYPES.filter((type) => type !== lastMathType);
  const type = pick(available.length > 0 ? available : MATH_TYPES, source);
  lastMathType = type;
  return type;
}

export function createMathQuestionOfType(
  type: MathQuestionType,
  source: Pick<Math, 'random'> = Math,
  difficulty: QuizDifficulty = 2,
): QuizQuestion {
  switch (type) {
    case 'add': {
      const max = difficulty === 1 ? 20 : difficulty === 2 ? 49 : 99;
      const min = difficulty === 1 ? 2 : 10;
      const a = min + Math.floor(source.random() * (max - min));
      const b = min + Math.floor(source.random() * (max - min));
      const answer = a + b;
      return numericQuestion(
        'add',
        text.quiz.mathPrompt(a, '+', b),
        answer,
        [answer + 1, answer - 1, answer + 10, answer - 10],
        text.quiz.mathExplain(a, '+', b, answer),
        source,
        difficulty,
      );
    }
    case 'sub': {
      const max = difficulty === 1 ? 29 : difficulty === 2 ? 69 : 99;
      const min = difficulty === 1 ? 10 : 20;
      const a = min + Math.floor(source.random() * (max - min));
      const b = 2 + Math.floor(source.random() * Math.min(max / 3, a - 2));
      const answer = a - b;
      return numericQuestion(
        'sub',
        text.quiz.mathPrompt(a, '−', b),
        answer,
        [answer + 1, answer - 1, answer + 10, answer - 10],
        text.quiz.mathExplain(a, '−', b, answer),
        source,
        difficulty,
      );
    }
    case 'table': {
      const max = difficulty === 1 ? 5 : difficulty === 2 ? 9 : 12;
      const min = difficulty === 1 ? 2 : difficulty === 2 ? 2 : 6;
      const a = min + Math.floor(source.random() * (max - min + 1));
      const b = 2 + Math.floor(source.random() * (max - 1));
      const answer = a * b;
      return numericQuestion(
        'table',
        text.quiz.mathTablePrompt(a, b),
        answer,
        [answer + a, answer - a, answer + b, answer - b],
        text.quiz.mathExplain(a, '×', b, answer),
        source,
        difficulty,
      );
    }
    case 'division': {
      const max = difficulty === 1 ? 5 : difficulty === 2 ? 9 : 12;
      const divisor = 2 + Math.floor(source.random() * (max - 1));
      const quotient = 2 + Math.floor(source.random() * (max - 1));
      const dividend = divisor * quotient;
      return numericQuestion(
        'division',
        text.quiz.mathDivisionPrompt(dividend, divisor),
        quotient,
        [quotient + 1, quotient - 1, quotient + 2, quotient - 2],
        text.quiz.mathExplain(dividend, '÷', divisor, quotient),
        source,
        difficulty,
      );
    }
    case 'sequence': {
      const step =
        difficulty === 1 ? 2 : 2 + Math.floor(source.random() * (difficulty === 2 ? 5 : 8));
      const start = 1 + Math.floor(source.random() * (difficulty === 1 ? 10 : 20));
      const sequence = [start, start + step, start + step * 2, start + step * 3];
      const answer = start + step * 4;
      return numericQuestion(
        'sequence',
        text.quiz.mathSequencePrompt(sequence),
        answer,
        [answer + step, answer - step, answer + 1, answer - 1],
        text.quiz.sequenceExplain(step, answer),
        source,
        difficulty,
      );
    }
    case 'word': {
      const name = pick(text.quiz.names, source);
      const item = pick(text.quiz.wordItems, source);
      const variant = Math.floor(source.random() * 3);

      if (variant === 0) {
        const max = difficulty === 1 ? 15 : difficulty === 2 ? 30 : 50;
        const a = 5 + Math.floor(source.random() * max);
        const b = 2 + Math.floor(source.random() * Math.max(1, max / 2));
        const answer = a + b;
        return numericQuestion(
          'word-add',
          text.quiz.wordProblemAdd(name, item, a, b),
          answer,
          [answer + 1, answer - 1, answer + 10, answer - 10],
          text.quiz.mathExplain(a, '+', b, answer),
          source,
          difficulty,
        );
      }

      if (variant === 1) {
        const max = difficulty === 1 ? 20 : difficulty === 2 ? 40 : 60;
        const a = 10 + Math.floor(source.random() * max);
        const b = 2 + Math.floor(source.random() * Math.max(1, a - 2));
        const answer = a - b;
        return numericQuestion(
          'word-sub',
          text.quiz.wordProblemSub(name, item, a, b),
          answer,
          [answer + 1, answer - 1, answer + 5, answer - 5],
          text.quiz.mathExplain(a, '−', b, answer),
          source,
          difficulty,
        );
      }

      const groups = 2 + Math.floor(source.random() * (difficulty === 1 ? 3 : 5));
      const perGroup = 2 + Math.floor(source.random() * (difficulty === 1 ? 4 : 6));
      const answer = groups * perGroup;
      return numericQuestion(
        'word-groups',
        text.quiz.wordProblemGroups(name, item, groups, perGroup),
        answer,
        [answer + groups, answer - groups, answer + 1, answer - 1],
        text.quiz.mathExplain(groups, '×', perGroup, answer),
        source,
        difficulty,
      );
    }
    case 'clock':
      return createClockQuestion(source, difficulty);
    case 'money':
      return createMoneyQuestion(source, difficulty);
    case 'fraction':
      return createFractionQuestion(source, difficulty);
    case 'shape':
      return createShapeQuestion(source, difficulty);
    case 'numberline':
      return createNumberLineQuestion(source, difficulty);
    case 'rounding':
      return createRoundingQuestion(source, difficulty);
  }
}

export function createMathQuestion(
  source: Pick<Math, 'random'> = Math,
  difficulty: QuizDifficulty = 2,
): QuizQuestion {
  return createMathQuestionOfType(pickMathType(source), source, difficulty);
}

function getBank(subject: QuizSubject): readonly QuizBankEntry[] {
  switch (subject) {
    case 'danish':
      return text.quiz.danish;
    case 'english':
      return text.quiz.english;
    case 'nature':
      return text.quiz.nature;
    case 'history':
      return text.quiz.history;
    case 'religion':
      return text.quiz.religion;
    case 'music':
      return text.quiz.music;
    case 'sport':
      return text.quiz.sport;
    default:
      return text.quiz.danish;
  }
}

interface BankCandidate {
  entry: QuizBankEntry;
  id: string;
  difficulty: QuizDifficulty;
}

function createBankQuestion(
  subject: QuizSubject,
  options: CreateQuizQuestionOptions,
): QuizQuestion {
  const source = options.source ?? Math;
  const difficulty = options.difficulty ?? 2;
  const usedIds = options.usedIds;
  const allowAudio = options.allowAudio ?? true;
  const bank: BankCandidate[] = getBank(subject)
    .map((entry, index) => ({
      entry,
      id: `${subject}-${index}`,
      difficulty: entry.difficulty,
    }))
    .filter((candidate) => allowAudio || !candidate.entry.audio);

  const withoutUsed = bank.filter(
    (candidate) =>
      !usedIds?.has(candidate.id) &&
      (options.previousId === undefined || candidate.id !== options.previousId),
  );
  const withoutPrevious = withoutUsed.length
    ? withoutUsed
    : bank.filter(
        (candidate) => options.previousId === undefined || candidate.id !== options.previousId,
      );
  const available = withoutPrevious.length > 0 ? withoutPrevious : bank;
  const exact = available.filter((candidate) => candidate.difficulty === difficulty);
  const pool =
    exact.length > 0
      ? exact
      : [...available].sort(
          (left, right) =>
            Math.abs(left.difficulty - difficulty) - Math.abs(right.difficulty - difficulty),
        );
  const candidate = pick(pool, source);
  const entry = candidate.entry;
  const optionValues = shuffle(
    entry.options.map((label, optionIndex) => ({ id: String(optionIndex), label })),
    source,
  );

  return {
    id: candidate.id,
    subject,
    prompt: entry.prompt,
    options: optionValues,
    answerId: String(entry.answer),
    explanation: entry.explanation,
    readAloud: entry.readAloud ?? true,
    difficulty: candidate.difficulty,
    speech: entry.speech,
    speechLang: entry.speechLang,
    audio: entry.audio,
  };
}

export function createQuizQuestion(
  subject: QuizSubject,
  options: CreateQuizQuestionOptions = {},
): QuizQuestion {
  const difficulty = options.difficulty ?? 2;
  return subject === 'math'
    ? createMathQuestion(options.source ?? Math, difficulty)
    : createBankQuestion(subject, options);
}
