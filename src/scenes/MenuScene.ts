import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, REGISTRY_KEYS, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const DECORATIVE_STARS = [
  { x: 170, y: 150, size: 56, alpha: 0.55 },
  { x: 1120, y: 130, size: 64, alpha: 0.5 },
  { x: 920, y: 210, size: 40, alpha: 0.4 },
  { x: 360, y: 250, size: 36, alpha: 0.35 },
] as const;

export class MenuScene extends Phaser.Scene {
  private soundButton?: Button;

  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    this.createBackground();

    for (const star of DECORATIVE_STARS) {
      this.add
        .image(star.x, star.y, 'star')
        .setDisplaySize(star.size, star.size)
        .setAlpha(star.alpha);
    }

    this.tweens.add({
      targets: this.add.image(1035, 512, 'player').setDisplaySize(168, 168),
      y: 496,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.add.image(245, 512, 'star').setDisplaySize(132, 132),
      angle: 360,
      duration: 9000,
      repeat: -1,
      ease: 'Linear',
    });

    this.add
      .text(GAME_WIDTH / 2, 170, text.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '132px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 10, '#000000', 18, true, true);

    this.add
      .text(GAME_WIDTH / 2, 268, text.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '36px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    new Button(this, {
      x: GAME_WIDTH / 2,
      y: 404,
      label: text.start,
      width: 340,
      height: 108,
      fontSize: 48,
      onClick: () => this.startGame(),
    });

    this.soundButton = new Button(this, {
      x: GAME_WIDTH / 2,
      y: 522,
      label: this.soundLabel(),
      width: 230,
      height: 72,
      fontSize: 28,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.toggleSound(),
    });

    const best = save.bestScore;
    if (best > 0) {
      this.add
        .text(GAME_WIDTH / 2, 600, text.best(best), {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: COLORS.textAccent,
        })
        .setOrigin(0.5);
    }

    this.add
      .text(GAME_WIDTH / 2, 672, text.help, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.registry.set(REGISTRY_KEYS.BEST, best);

    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    audio.unlock();
    this.scene.start(SCENE_KEYS.GAME);
  }

  private toggleSound(): void {
    audio.setEnabled(!audio.isEnabled);
    save.setSoundEnabled(audio.isEnabled);
    this.soundButton?.setLabel(this.soundLabel());
  }

  private soundLabel(): string {
    return audio.isEnabled ? text.soundOn : text.soundOff;
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1,
    );
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    graphics.fillStyle(0xffffff, 0.04);
    graphics.fillCircle(180, 620, 240);
    graphics.fillCircle(1120, 650, 300);
    graphics.fillStyle(COLORS.accent, 0.04);
    graphics.fillCircle(640, 360, 360);
  }
}
