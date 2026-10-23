import Phaser from 'phaser';
import '@/style.css';
import { createGameConfig } from '@/game/config';
import { audio } from '@/systems/audio';
import { bindVisibilityPause } from '@/systems/lifecycle';
import { bindMobileDisplay } from '@/systems/mobile';

const game = new Phaser.Game(createGameConfig());
const unbindVisibility = bindVisibilityPause(game);
const unbindMobileDisplay = bindMobileDisplay(game);

const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbindVisibility();
    unbindMobileDisplay();
    game.destroy(true);
  });
}
