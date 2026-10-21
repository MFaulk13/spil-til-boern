import Phaser from 'phaser';
import { MIN_TOUCH_TARGET } from '@/game/constants';
import { audio } from '@/systems/audio';
import { BUTTON_SIZE, COLORS, FONT_FAMILY } from '@/ui/theme';

export interface ButtonOptions {
  x: number;
  y: number;
  label: string;
  onClick?: () => void;
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
}

export class Button extends Phaser.GameObjects.Container {
  onClick?: () => void;

  private readonly background: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly baseColor: number;
  private readonly buttonWidth: number;
  private readonly buttonHeight: number;
  private pressed = false;

  constructor(scene: Phaser.Scene, options: ButtonOptions) {
    super(scene, options.x, options.y);

    this.buttonWidth = Math.max(options.width ?? BUTTON_SIZE.width, MIN_TOUCH_TARGET);
    this.buttonHeight = Math.max(options.height ?? BUTTON_SIZE.height, MIN_TOUCH_TARGET);
    this.baseColor = options.color ?? COLORS.primary;
    this.onClick = options.onClick;

    const shadow = scene.add.graphics();
    shadow.fillStyle(COLORS.backgroundBottom, 0.4);
    shadow.fillRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2 + 8,
      this.buttonWidth,
      this.buttonHeight,
      this.buttonHeight / 2,
    );

    this.background = scene.add.graphics();
    this.drawBackground(this.baseColor);

    this.labelText = scene.add
      .text(0, 0, options.label, {
        fontFamily: FONT_FAMILY,
        fontSize: `${options.fontSize ?? 40}px`,
        color: options.textColor ?? COLORS.textDark,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([shadow, this.background, this.labelText]);
    this.setSize(this.buttonWidth, this.buttonHeight);
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.buttonWidth / 2,
        -this.buttonHeight / 2,
        this.buttonWidth,
        this.buttonHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerdown', this.handlePointerDown, this);
    this.on('pointerover', this.handlePointerOver, this);
    this.on('pointerout', this.handlePointerOut, this);
    this.on('pointerup', this.handlePointerUp, this);

    scene.add.existing(this);
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  private handlePointerDown(): void {
    this.pressed = true;
    audio.unlock();
    this.scene.tweens.add({
      targets: this,
      scale: 0.95,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private handlePointerOver(): void {
    if (!this.pressed) {
      this.drawBackground(this.brighten(this.baseColor));
    }
  }

  private handlePointerOut(): void {
    this.pressed = false;
    this.drawBackground(this.baseColor);
  }

  private handlePointerUp(): void {
    if (!this.pressed) {
      return;
    }
    this.pressed = false;
    this.drawBackground(this.baseColor);
    audio.play('click');
    this.onClick?.();
  }

  private drawBackground(color: number): void {
    const radius = this.buttonHeight / 2;
    const left = -this.buttonWidth / 2;
    const top = -this.buttonHeight / 2;

    this.background.clear();
    this.background.fillStyle(color, 1);
    this.background.fillRoundedRect(left, top, this.buttonWidth, this.buttonHeight, radius);
    this.background.lineStyle(4, 0xffffff, 0.22);
    this.background.strokeRoundedRect(left, top, this.buttonWidth, this.buttonHeight, radius);
  }

  private brighten(color: number): number {
    return Phaser.Display.Color.IntegerToColor(color).brighten(14).color;
  }
}
