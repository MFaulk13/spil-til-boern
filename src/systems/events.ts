import Phaser from 'phaser';
import type { CareNeed, Needs, PetId } from '@/game/types';
import type { CareAction, Mood } from '@/systems/pet';

export const GAME_EVENTS = {
  HUD_READY: 'gotar:hud-ready',
  HUD_STATE: 'gotar:hud-state',
  CARE_REQUESTED: 'gotar:care-requested',
  CARE_FEEDBACK: 'gotar:care-feedback',
  MENU_REQUESTED: 'gotar:menu-requested',
  TOWN_REQUESTED: 'gotar:town-requested',
  DECOR_REQUESTED: 'gotar:decor-requested',
  WARDROBE_REQUESTED: 'gotar:wardrobe-requested',
  PETS_REQUESTED: 'gotar:pets-requested',
  PLACEMENT_STATE: 'gotar:placement-state',
} as const;

export interface PlacementState {
  active: boolean;
}

export interface HudState {
  petId: PetId;
  petName: string;
  needs: Needs;
  hearts: number;
  mood: Mood;
  treatCount: number;
  petCount: number;
}

export interface CareFeedback {
  action: CareAction;
  hearts: number;
  need: CareNeed;
}

export const gameEvents = new Phaser.Events.EventEmitter();
