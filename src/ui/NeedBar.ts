import Phaser from 'phaser';
import { text } from '@/game/text';
import { clampNeed, type CareNeed } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import { COLORS, FONT_FAMILY, NEED_COLORS } from '@/ui/theme';

const ICON_SIZE = 34;
const BAR_LEFT = 42;
const BAR_HEIGHT = 26;
const BAR_INSET = 3;
const RADIUS = 8;

const NEED_ICONS: Record<CareNeed, string> = {
  hunger: 'icon-hunger',
  joy: 'icon-joy',
  energy: 'icon-energy',
};

export class NeedBar extends Phaser.GameObjects.Container {
  private readonly barWidth: number;
  private readonly need: CareNeed;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly fill: Phaser.GameObjects.Graphics;
  private value: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    need: CareNeed,
    value: number,
  ) {
    super(scene, x, y);
    this.need = need;
    this.barWidth = Math.max(width - BAR_LEFT, 48);
    this.value = clampNeed(value);

    this.add(
      scene.add.image(ICON_SIZE / 2, 0, NEED_ICONS[need]).setDisplaySize(ICON_SIZE, ICON_SIZE),
    );

    this.add(
      scene.add
        .text(BAR_LEFT, -26, text.needs[need], {
          fontFamily: FONT_FAMILY,
          fontSize: '19px',
          color: COLORS.textMuted,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5),
    );

    this.background = scene.add.graphics();
    this.background.fillStyle(0xffffff, 0.82);
    this.background.fillRoundedRect(
      BAR_LEFT,
      -BAR_HEIGHT / 2,
      this.barWidth,
      BAR_HEIGHT,
      BAR_HEIGHT / 2,
    );
    this.background.lineStyle(2, COLORS.ink, 0.16);
    this.background.strokeRoundedRect(
      BAR_LEFT,
      -BAR_HEIGHT / 2,
      this.barWidth,
      BAR_HEIGHT,
      BAR_HEIGHT / 2,
    );

    this.fill = scene.add.graphics();
    this.add([this.background, this.fill]);
    this.redrawFill();

    scene.add.existing(this);
  }

  setValue(value: number): this {
    const next = clampNeed(value);
    if (Math.abs(next - this.value) < 0.05) {
      return this;
    }
    this.value = next;
    this.redrawFill();
    return this;
  }

  pulse(): this {
    if (isReducedMotion()) {
      return this;
    }
    this.scene.tweens.add({
      targets: this.fill,
      alpha: 0.4,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    return this;
  }

  private redrawFill(): void {
    const innerWidth = this.barWidth - BAR_INSET * 2;
    const innerHeight = BAR_HEIGHT - BAR_INSET * 2;
    const width = (innerWidth * this.value) / 100;

    this.fill.clear();
    if (width < 1) {
      return;
    }

    this.fill.fillStyle(NEED_COLORS[this.need], 1);
    this.fill.fillRoundedRect(
      BAR_LEFT + BAR_INSET,
      -innerHeight / 2,
      width,
      innerHeight,
      Math.min(RADIUS, width / 2),
    );
  }
}
