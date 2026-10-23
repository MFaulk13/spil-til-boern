import type Phaser from 'phaser';
import { getPet } from '@/game/catalog/pets';
import { tickNeeds } from '@/systems/pet';
import { save, type SaveManager } from '@/systems/save';

const POST_STEP_EVENT = 'poststep';
const MAX_STEP_MS = 500;
const PERSIST_INTERVAL_MS = 10_000;

export class NeedsClock {
  private persistElapsed = 0;
  private dirty = false;
  private started = false;

  constructor(private readonly store: SaveManager = save) {}

  advance(seconds: number): void {
    const pet = this.store.pet;
    if (!pet) {
      return;
    }
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return;
    }

    this.store.updateNeeds(tickNeeds(pet.needs, seconds, getPet(pet.id).care.decay), false);
    this.dirty = true;
  }

  start(game: Phaser.Game): () => void {
    if (this.started) {
      return () => undefined;
    }
    this.started = true;

    const onStep = (_time: number, delta: number): void => {
      const step = Math.min(Math.max(delta, 0), MAX_STEP_MS);
      this.advance(step / 1000);

      this.persistElapsed += step;
      if (this.dirty && this.persistElapsed >= PERSIST_INTERVAL_MS) {
        this.persistElapsed = 0;
        this.dirty = false;
        this.store.persistNeeds();
      }
    };

    const onPageHide = (): void => {
      this.store.persistNeeds();
    };

    game.events.on(POST_STEP_EVENT, onStep);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      if (!this.started) {
        return;
      }
      this.started = false;
      game.events.off(POST_STEP_EVENT, onStep);
      window.removeEventListener('pagehide', onPageHide);
      this.store.persistNeeds();
    };
  }
}

export const needsClock = new NeedsClock();
