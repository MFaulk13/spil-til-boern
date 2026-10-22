import Phaser from 'phaser';
import { CORE_ASSETS } from '@/game/assets';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const BAR_WIDTH = 500;
const BAR_HEIGHT = 24;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload(): void {
    this.createLoadingUi();

    for (const asset of CORE_ASSETS) {
      this.load.svg(asset.key, asset.url, { width: asset.width, height: asset.height });
    }
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createLoadingUi(): void {
    const centerX = GAME_WIDTH / 2;
    const barY = GAME_HEIGHT / 2 + 50;
    const left = centerX - BAR_WIDTH / 2;

    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(centerX, GAME_HEIGHT / 2 - 90, text.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '120px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 8, '#ffffff', 0, true, true);

    this.add
      .text(centerX, GAME_HEIGHT / 2 + 92, text.loading, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const frame = this.add
      .rectangle(centerX, barY, BAR_WIDTH + 18, BAR_HEIGHT + 18, COLORS.panel)
      .setStrokeStyle(5, COLORS.accent, 1);

    const fill = this.add.rectangle(left, barY, 0, BAR_HEIGHT, COLORS.teal).setOrigin(0, 0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      fill.setSize(BAR_WIDTH * progress, BAR_HEIGHT);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      frame.destroy();
      fill.destroy();
    });
  }
}
