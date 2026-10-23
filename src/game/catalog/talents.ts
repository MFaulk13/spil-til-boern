import type { QuizSubject } from '@/game/types';
import type { SfxName } from '@/systems/audio';

export const TALENT_IDS = [
  'count',
  'read',
  'hello',
  'sniff',
  'knight',
  'fold',
  'sing',
  'jump',
] as const;

export type TalentId = (typeof TALENT_IDS)[number];

export type TalentAnimation =
  'count' | 'read' | 'hello' | 'sniff' | 'bow' | 'fold' | 'sing' | 'jump';

export interface TalentDefinition {
  id: TalentId;
  subject: QuizSubject;
  icon: string;
  animation: TalentAnimation;
  sound: SfxName | null;
  notes?: readonly number[];
}

export const TALENTS: readonly TalentDefinition[] = [
  {
    id: 'count',
    subject: 'math',
    icon: 'icon-math',
    animation: 'count',
    sound: 'pop',
  },
  {
    id: 'read',
    subject: 'danish',
    icon: 'icon-danish',
    animation: 'read',
    sound: 'pop',
  },
  {
    id: 'hello',
    subject: 'english',
    icon: 'icon-english',
    animation: 'hello',
    sound: null,
  },
  {
    id: 'sniff',
    subject: 'nature',
    icon: 'icon-nature',
    animation: 'sniff',
    sound: 'sniff',
  },
  {
    id: 'knight',
    subject: 'history',
    icon: 'icon-history',
    animation: 'bow',
    sound: 'pop',
  },
  {
    id: 'fold',
    subject: 'religion',
    icon: 'icon-religion',
    animation: 'fold',
    sound: 'love',
  },
  {
    id: 'sing',
    subject: 'music',
    icon: 'icon-music',
    animation: 'sing',
    sound: 'happy',
    notes: [523.25, 659.25, 783.99],
  },
  {
    id: 'jump',
    subject: 'sport',
    icon: 'icon-sport',
    animation: 'jump',
    sound: 'play',
  },
];

export function getTalent(id: TalentId): TalentDefinition {
  return TALENTS.find((talent) => talent.id === id) ?? TALENTS[0];
}
