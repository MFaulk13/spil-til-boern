import { describe, expect, it } from 'vitest';
import { getAsset } from '@/game/assets';
import { TALENTS, TALENT_IDS } from '@/game/catalog/talents';
import { text } from '@/game/text';
import { QUIZ_SUBJECTS, type QuizSubject, type SchoolProgress } from '@/game/types';
import { isTalentUnlocked, lockedTalents, unlockedTalents } from '@/systems/talents';

function progressFor(completed: readonly QuizSubject[]): (subject: QuizSubject) => SchoolProgress {
  return (subject) => ({
    rounds: completed.includes(subject) ? 1 : 0,
    bestStars: completed.includes(subject) ? 3 : 0,
    firstTryCorrect: completed.includes(subject) ? 5 : 0,
    totalQuestions: completed.includes(subject) ? 5 : 0,
    firstCompleted: completed.includes(subject),
  });
}

describe('talents', () => {
  it('has exactly one talent per subject', () => {
    expect(TALENTS).toHaveLength(QUIZ_SUBJECTS.length);
    expect(TALENTS.map((talent) => talent.subject)).toEqual([...QUIZ_SUBJECTS]);
    expect(new Set(TALENTS.map((talent) => talent.id))).toEqual(new Set(TALENT_IDS));
  });

  it('has labels, messages, icons and sounds', () => {
    for (const talent of TALENTS) {
      expect(text.talents[talent.id].label.length).toBeGreaterThan(0);
      expect(text.talents[talent.id].message.length).toBeGreaterThan(0);
      expect(getAsset(talent.icon)).toBeDefined();
      if (talent.notes) {
        expect(talent.notes.length).toBeGreaterThan(0);
      }
    }
  });

  it('unlocks a talent only when the subject is completed', () => {
    const none = progressFor([]);
    const math = progressFor(['math']);
    expect(unlockedTalents(none)).toHaveLength(0);
    expect(lockedTalents(none)).toHaveLength(TALENTS.length);

    const mathTalent = TALENTS.find((talent) => talent.subject === 'math');
    expect(mathTalent).toBeDefined();
    if (mathTalent) {
      expect(isTalentUnlocked(mathTalent, none)).toBe(false);
      expect(isTalentUnlocked(mathTalent, math)).toBe(true);
    }
    expect(unlockedTalents(math)).toHaveLength(1);
  });
});
