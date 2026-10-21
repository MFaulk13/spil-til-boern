import Phaser from 'phaser';
import '@/style.css';
import { createGameConfig } from '@/game/config';
import { audio } from '@/systems/audio';

const game = new Phaser.Game(createGameConfig());

const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
