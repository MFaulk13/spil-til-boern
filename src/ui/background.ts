import Phaser from 'phaser';
import type { SeasonThemeDefinition } from '@/game/catalog/seasons';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { currentSeasonTheme } from '@/systems/season';

export function drawBackdrop(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition = currentSeasonTheme(),
): void {
  const graphics = scene.add.graphics();
  graphics.fillGradientStyle(
    theme.palette.top,
    theme.palette.top,
    theme.palette.bottom,
    theme.palette.bottom,
    1,
  );
  graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  graphics.fillStyle(0xffffff, 0.18);
  graphics.fillCircle(120, 640, 210);
  graphics.fillCircle(1180, 110, 180);
  graphics.fillStyle(theme.palette.accent, 0.12);
  graphics.fillCircle(660, 60, 220);
  graphics.fillStyle(theme.palette.wash, 0.12);
  graphics.fillCircle(132, 120, 120);
}
