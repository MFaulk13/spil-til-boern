import Phaser from 'phaser';
import '@/style.css';
import { createGameConfig } from '@/game/config';
import { isLowMemoryMode } from '@/game/device';
import { audio } from '@/systems/audio';
import { bindVisibilityPause } from '@/systems/lifecycle';
import { bindMobileDisplay } from '@/systems/mobile';
import { needsClock } from '@/systems/needs';
import { bindPerformanceOverlay } from '@/systems/perf';
import { primeSpeech } from '@/systems/speech';

document.documentElement.classList.toggle('low-memory', isLowMemoryMode());
primeSpeech();

const game = new Phaser.Game(createGameConfig());
const unbindVisibility = bindVisibilityPause(game);
const unbindMobileDisplay = bindMobileDisplay(game);
const unbindNeedsClock = needsClock.start(game);
const unbindPerformanceOverlay = bindPerformanceOverlay(game);

const unlockAudio = () => {
  audio.unlock();
  primeSpeech();
};
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbindVisibility();
    unbindMobileDisplay();
    unbindNeedsClock();
    unbindPerformanceOverlay();
    game.destroy(true);
  });
}
