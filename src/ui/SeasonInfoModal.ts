import Phaser from 'phaser';
import type { SeasonThemeDefinition } from '@/game/catalog/seasons';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { text } from '@/game/text';
import { isReducedMotion } from '@/systems/motion';
import { speak, stopSpeaking } from '@/systems/speech';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export interface SeasonInfoModalOptions {
  theme: SeasonThemeDefinition;
  onClose?: () => void;
}

const PANEL_WIDTH = 790;
const PANEL_HEIGHT = 440;

export class SeasonInfoModal extends Phaser.GameObjects.Container {
  private keyHandler?: (event: KeyboardEvent) => void;
  private closing = false;

  constructor(scene: Phaser.Scene, options: SeasonInfoModalOptions) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const backdrop = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.55)
      .setInteractive()
      .on('pointerdown', () => this.close(options.onClose));

    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panel, 1);
    panel.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);
    panel.lineStyle(6, options.theme.palette.accent, 0.95);
    panel.strokeRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);

    const blocker = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x000000, 0.001)
      .setInteractive();

    const icon = scene.add
      .image(0, -PANEL_HEIGHT / 2 + 74, options.theme.decorKey)
      .setDisplaySize(92, 92);

    const seasonLabel = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 142, text.seasons.current(options.theme.label), {
        fontFamily: FONT_FAMILY,
        fontSize: '23px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const title = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 186, options.theme.greeting, {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = scene.add
      .text(0, 14, options.theme.info, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.textMuted,
        align: 'center',
        wordWrap: { width: PANEL_WIDTH - 110 },
      })
      .setOrigin(0.5);

    const read = new Button(scene, {
      x: -170,
      y: PANEL_HEIGHT / 2 - 86,
      label: text.seasons.read,
      iconKey: 'icon-sound',
      iconSize: 30,
      width: 300,
      height: 92,
      fontSize: 28,
      color: options.theme.palette.accent,
      textColor: COLORS.textDark,
      onClick: () => speak(`${options.theme.greeting} ${options.theme.info}`),
    });

    const close = new Button(scene, {
      x: 170,
      y: PANEL_HEIGHT / 2 - 86,
      label: text.seasons.close,
      width: 260,
      height: 92,
      fontSize: 28,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.close(options.onClose),
    });

    this.add([backdrop, panel, blocker, icon, seasonLabel, title, body, read, close]);
    this.setDepth(1000);
    scene.add.existing(this);

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        this.close(options.onClose);
      } else if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        speak(`${options.theme.greeting} ${options.theme.info}`);
      }
    };
    this.keyHandler = handleKey;
    scene.input.keyboard?.on('keydown', handleKey);

    if (!isReducedMotion()) {
      this.setAlpha(0).setScale(0.94);
      scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration: 180,
        ease: 'Back.easeOut',
      });
    }
  }

  private close(callback?: () => void): void {
    if (this.closing) {
      return;
    }
    this.closing = true;

    if (this.keyHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }
    stopSpeaking();

    if (isReducedMotion()) {
      this.destroy(true);
      callback?.();
      return;
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.96,
      duration: 120,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy(true);
        callback?.();
      },
    });
  }
}
