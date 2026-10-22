import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export interface ConfirmDialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 380;

export class ConfirmDialog extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, options: ConfirmDialogOptions) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const backdrop = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.ink, 0.55)
      .setInteractive()
      .on('pointerdown', () => this.close(options.onCancel));

    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panel, 1);
    panel.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);
    panel.lineStyle(6, COLORS.accent, 0.95);
    panel.strokeRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);

    const blocker = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x000000, 0.001)
      .setInteractive();

    const title = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 72, options.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '48px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = scene.add
      .text(0, -18, options.body, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.textMuted,
        align: 'center',
        wordWrap: { width: PANEL_WIDTH - 120 },
      })
      .setOrigin(0.5);

    const confirm = new Button(scene, {
      x: -170,
      y: PANEL_HEIGHT / 2 - 88,
      label: options.confirmLabel,
      width: 280,
      height: 84,
      fontSize: 32,
      color: COLORS.primary,
      onClick: () => this.close(options.onConfirm),
    });

    const cancel = new Button(scene, {
      x: 170,
      y: PANEL_HEIGHT / 2 - 88,
      label: options.cancelLabel,
      width: 280,
      height: 84,
      fontSize: 32,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.close(options.onCancel),
    });

    this.add([backdrop, panel, blocker, title, body, confirm, cancel]);
    this.setDepth(1000);
    this.setAlpha(0).setScale(0.94);
    scene.add.existing(this);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
    });
  }

  private close(callback?: () => void): void {
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
