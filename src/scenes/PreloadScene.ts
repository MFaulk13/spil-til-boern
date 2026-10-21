import Phaser from 'phaser';
import playerUrl from '@/assets/images/player.svg';
import starUrl from '@/assets/images/star.svg';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const BAR_WIDTH = 480;
const BAR_HEIGHT = 26;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload(): void {
    this.createLoadingUi();

    this.load.image('player', playerUrl);
    this.load.image('star', starUrl);
  }

  create(): void {
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createLoadingUi(): void {
    const centerX = GAME_WIDTH / 2;
    const barY = GAME_HEIGHT / 2 + 30;
    const left = centerX - BAR_WIDTH / 2;

    this.add
      .text(centerX, GAME_HEIGHT / 2 - 60, text.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '96px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, GAME_HEIGHT / 2 + 90, text.loading, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const frame = this.add
      .rectangle(centerX, barY, BAR_WIDTH + 16, BAR_HEIGHT + 16, COLORS.panel)
      .setStrokeStyle(4, COLORS.accent, 0.8);

    const fill = this.add.rectangle(left, barY, 0, BAR_HEIGHT, COLORS.accent).setOrigin(0, 0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      fill.setSize(BAR_WIDTH * progress, BAR_HEIGHT);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      frame.destroy();
      fill.destroy();
    });
  }
}
