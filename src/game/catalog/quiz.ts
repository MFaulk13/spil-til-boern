import { text } from '@/game/text';
import type { QuizSubject } from '@/game/types';

export type { QuizSubject };
export type QuizMode = QuizSubject;

export interface QuizOption {
  id: string;
  label: string;
}

export type QuizVisual =
  { kind: 'clock'; hour: number; minute: number } | { kind: 'coins'; coins: readonly number[] };

export interface QuizQuestion {
  id: string;
  subject: QuizSubject;
  prompt: string;
  options: QuizOption[];
  answerId: string;
  explanation: string;
  readAloud: boolean;
  speech?: string;
  visual?: QuizVisual;
}

export interface QuizBankEntry {
  prompt: string;
  options: readonly string[];
  answer: number;
  explanation: string;
  readAloud?: boolean;
  speech?: string;
}

export interface QuizSubjectInfo {
  subject: QuizSubject;
  label: string;
  hint: string;
  icon: string;
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
  };
}

function clockParts(totalMinutes: number): { hour: number; minute: number } {
  const normalized = ((totalMinutes % 720) + 720) % 720;
  return {
    hour: Math.floor(normalized / 60) || 12,
    minute: normalized % 60,
  };
}

function createClockQuestion(source: Pick<Math, 'random'>): QuizQuestion {
  const hour = 1 + Math.floor(source.random() * 12);
  const minute = pick([0, 15, 30, 45], source);
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
    visual: { kind: 'clock', hour, minute },
  };
}

function createMoneyQuestion(source: Pick<Math, 'random'>): QuizQuestion {
  const count = 2 + Math.floor(source.random() * 3);
  const coins: number[] = [];
  for (let index = 0; index < count; index += 1) {
    coins.push(pick([1, 2, 5, 10, 20], source));
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
    visual: { kind: 'coins', coins },
  };
}

export type MathQuestionType =
  'add' | 'sub' | 'table' | 'division' | 'sequence' | 'word' | 'clock' | 'money';

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
): QuizQuestion {
  switch (type) {
    case 'add': {
      const a = 2 + Math.floor(source.random() * 48);
      const b = 2 + Math.floor(source.random() * 48);
      const answer = a + b;
      return numericQuestion(
        'add',
        text.quiz.mathPrompt(a, '+', b),
        answer,
        [answer + 1, answer - 1, answer + 10, answer - 10],
        text.quiz.mathExplain(a, '+', b, answer),
        source,
      );
    }
    case 'sub': {
      const a = 12 + Math.floor(source.random() * 49);
      const b = 2 + Math.floor(source.random() * Math.min(20, a - 2));
      const answer = a - b;
      return numericQuestion(
        'sub',
        text.quiz.mathPrompt(a, '−', b),
        answer,
        [answer + 1, answer - 1, answer + 10, answer - 10],
        text.quiz.mathExplain(a, '−', b, answer),
        source,
      );
    }
    case 'table': {
      const a = 2 + Math.floor(source.random() * 9);
      const b = 2 + Math.floor(source.random() * 9);
      const answer = a * b;
      return numericQuestion(
        'table',
        text.quiz.mathTablePrompt(a, b),
        answer,
        [answer + a, answer - a, answer + b, answer - b],
        text.quiz.mathExplain(a, '×', b, answer),
        source,
      );
    }
    case 'division': {
      const divisor = 2 + Math.floor(source.random() * 9);
      const quotient = 2 + Math.floor(source.random() * 9);
      const dividend = divisor * quotient;
      return numericQuestion(
        'division',
        text.quiz.mathDivisionPrompt(dividend, divisor),
        quotient,
        [quotient + 1, quotient - 1, quotient + 2, quotient - 2],
        text.quiz.mathExplain(dividend, '÷', divisor, quotient),
        source,
      );
    }
    case 'sequence': {
      const step = 2 + Math.floor(source.random() * 9);
      const start = 1 + Math.floor(source.random() * 20);
      const sequence = [start, start + step, start + step * 2, start + step * 3];
      const answer = start + step * 4;
      return numericQuestion(
        'sequence',
        text.quiz.mathSequencePrompt(sequence),
        answer,
        [answer + step, answer - step, answer + 1, answer - 1],
        text.quiz.sequenceExplain(step, answer),
        source,
      );
    }
    case 'word': {
      const name = pick(text.quiz.names, source);
      const item = pick(text.quiz.wordItems, source);
      const variant = Math.floor(source.random() * 3);

      if (variant === 0) {
        const a = 5 + Math.floor(source.random() * 26);
        const b = 2 + Math.floor(source.random() * 19);
        const answer = a + b;
        return numericQuestion(
          'word-add',
          text.quiz.wordProblemAdd(name, item, a, b),
          answer,
          [answer + 1, answer - 1, answer + 10, answer - 10],
          text.quiz.mathExplain(a, '+', b, answer),
          source,
        );
      }

      if (variant === 1) {
        const a = 10 + Math.floor(source.random() * 31);
        const b = 2 + Math.floor(source.random() * Math.max(1, a - 2));
        const answer = a - b;
        return numericQuestion(
          'word-sub',
          text.quiz.wordProblemSub(name, item, a, b),
          answer,
          [answer + 1, answer - 1, answer + 5, answer - 5],
          text.quiz.mathExplain(a, '−', b, answer),
          source,
        );
      }

      const groups = 2 + Math.floor(source.random() * 4);
      const perGroup = 2 + Math.floor(source.random() * 5);
      const answer = groups * perGroup;
      return numericQuestion(
        'word-groups',
        text.quiz.wordProblemGroups(name, item, groups, perGroup),
        answer,
        [answer + groups, answer - groups, answer + 1, answer - 1],
        text.quiz.mathExplain(groups, '×', perGroup, answer),
        source,
      );
    }
    case 'clock':
      return createClockQuestion(source);
    case 'money':
      return createMoneyQuestion(source);
  }
}

export function createMathQuestion(source: Pick<Math, 'random'> = Math): QuizQuestion {
  return createMathQuestionOfType(pickMathType(source), source);
}

function getBank(subject: QuizSubject): readonly QuizBankEntry[] {
  switch (subject) {
    case 'danish':
      return text.quiz.danish;
    case 'english':
      return text.quiz.english;
    case 'nature':
      return text.quiz.nature;
    default:
      return text.quiz.danish;
  }
}

function createBankQuestion(
  subject: QuizSubject,
  previousId: string | undefined,
  source: Pick<Math, 'random'>,
): QuizQuestion {
  const bank = getBank(subject);
  const available = bank.filter((_entry, index) => `${subject}-${index}` !== previousId);
  const pool = available.length > 0 ? available : bank;
  const entry = pick(pool, source);
  const originalIndex = bank.indexOf(entry);
  const options = shuffle(
    entry.options.map((label, optionIndex) => ({ id: String(optionIndex), label })),
    source,
  );

  return {
    id: `${subject}-${originalIndex}`,
    subject,
    prompt: entry.prompt,
    options,
    answerId: String(entry.answer),
    explanation: entry.explanation,
    readAloud: entry.readAloud ?? true,
    speech: entry.speech,
  };
}

export function createQuizQuestion(
  subject: QuizSubject,
  previousId?: string,
  source: Pick<Math, 'random'> = Math,
): QuizQuestion {
  return subject === 'math'
    ? createMathQuestion(source)
    : createBankQuestion(subject, previousId, source);
}
