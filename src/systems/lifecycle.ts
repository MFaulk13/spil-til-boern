import type Phaser from 'phaser';
import { audio } from '@/systems/audio';

export function bindVisibilityPause(game: Phaser.Game): () => void {
  let paused = false;

  const handleVisibility = (): void => {
    if (document.hidden) {
      if (paused) {
        return;
      }
      paused = true;
      audio.stopMusic();
      try {
        game.loop.sleep();
      } catch {
        // The game may already be shutting down.
      }
      return;
    }

    if (!paused) {
      return;
    }
    paused = false;
    try {
      game.loop.wake();
    } catch {
      // The game may already be shutting down.
    }
    audio.unlock();
  };

  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}
