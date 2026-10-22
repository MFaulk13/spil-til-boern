import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { COLORS } from '@/ui/theme';

export function drawBackdrop(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.fillGradientStyle(
    COLORS.backgroundTop,
    COLORS.backgroundTop,
    COLORS.backgroundBottom,
    COLORS.backgroundBottom,
    1,
  );
  graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillCircle(120, 640, 210);
  graphics.fillCircle(1180, 110, 180);
  graphics.fillStyle(COLORS.lavender, 0.14);
  graphics.fillCircle(660, 60, 220);
  graphics.fillStyle(COLORS.teal, 0.12);
  graphics.fillCircle(132, 120, 120);
}
