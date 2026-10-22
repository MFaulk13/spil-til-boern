import { text } from '@/game/text';

export type QuizMode = 'math' | 'reading';

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  answerId: string;
}

export const QUIZ_ROUND_LENGTH = 5;
export const QUIZ_HEARTS_PER_ANSWER = 3;

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

function uniqueOptions(
  answer: number,
  candidates: readonly number[],
  source: Pick<Math, 'random'>,
): QuizOption[] {
  const values = new Set<number>([answer]);
  for (const candidate of candidates) {
    if (values.size >= 3) {
      break;
    }
    if (candidate >= 0 && candidate !== answer) {
      values.add(candidate);
    }
  }
  let offset = 1;
  while (values.size < 3) {
    values.add(answer + offset);
    offset += 1;
  }
  return shuffle([...values], source).map((value) => ({
    id: String(value),
    label: String(value),
  }));
}

export function createMathQuestion(source: Pick<Math, 'random'> = Math): QuizQuestion {
  const operation = source.random() < 0.6 ? '+' : '−';
  let a: number;
  let b: number;
  let answer: number;

  if (operation === '+') {
    a = 2 + Math.floor(source.random() * 28);
    b = 2 + Math.floor(source.random() * 28);
    answer = a + b;
  } else {
    a = 12 + Math.floor(source.random() * 38);
    b = 2 + Math.floor(source.random() * Math.min(11, a - 1));
    answer = a - b;
  }

  const candidates = [answer + 1, answer - 1, answer + 10, answer - 10, answer + 2];
  return {
    id: nextId('math'),
    prompt: text.quiz.mathPrompt(a, operation, b),
    options: uniqueOptions(answer, candidates, source),
    answerId: String(answer),
  };
}

export function createReadingQuestion(
  previousId?: string,
  source: Pick<Math, 'random'> = Math,
): QuizQuestion {
  const bank = text.quiz.reading;
  const available = bank.filter((_entry, index) => `reading-${index}` !== previousId);
  const index = Math.floor(source.random() * available.length) % available.length;
  const entry = available[index];
  const originalIndex = bank.indexOf(entry);
  const options = shuffle(
    entry.options.map((label, optionIndex) => ({ id: String(optionIndex), label })),
    source,
  );
  return {
    id: `reading-${originalIndex}`,
    prompt: entry.prompt,
    options,
    answerId: String(entry.answer),
  };
}

export function createQuizQuestion(mode: QuizMode, previousId?: string): QuizQuestion {
  return mode === 'math' ? createMathQuestion() : createReadingQuestion(previousId);
}
