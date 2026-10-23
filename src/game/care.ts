import type { CareNeed } from '@/game/types';

export const CARE_ACTIONS = ['feed', 'play', 'pet', 'sleep', 'treat'] as const;

export type CareAction = (typeof CARE_ACTIONS)[number];

export interface PetCareProfile {
  decay: Record<CareNeed, number>;
  favoriteAction: CareAction;
  favoriteTreats: readonly string[];
}
