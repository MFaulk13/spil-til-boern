import { TALENTS, type TalentDefinition } from '@/game/catalog/talents';
import type { QuizSubject, SchoolProgress } from '@/game/types';

export type SchoolProgressLookup = (subject: QuizSubject) => SchoolProgress;

export function isTalentUnlocked(
  talent: TalentDefinition,
  getProgress: SchoolProgressLookup,
): boolean {
  return getProgress(talent.subject).firstCompleted;
}

export function unlockedTalents(getProgress: SchoolProgressLookup): TalentDefinition[] {
  return TALENTS.filter((talent) => isTalentUnlocked(talent, getProgress));
}

export function lockedTalents(getProgress: SchoolProgressLookup): TalentDefinition[] {
  return TALENTS.filter((talent) => !isTalentUnlocked(talent, getProgress));
}
