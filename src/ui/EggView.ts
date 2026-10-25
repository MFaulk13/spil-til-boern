import Phaser from 'phaser';
import type { PetDefinition } from '@/game/catalog/pets';
import { isReducedMotion } from '@/systems/motion';
import { COLORS } from '@/ui/theme';
import { setTintableTexture } from '@/ui/tint';

const EGG_WIDTH = 150;
const EGG_HEIGHT = 188;

export class EggView extends Phaser.GameObjects.Container {
  private readonly base: Phaser.GameObjects.Image;
  private readonly pattern: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly eggWidth: number;
  private readonly eggHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, pet: PetDefinition, scale = 1) {
    super(scene, x, y);
    this.eggWidth = EGG_WIDTH * scale;
    this.eggHeight = EGG_HEIGHT * scale;

    this.shadow = scene.add.ellipse(
      0,
      4,
      this.eggWidth * 0.86,
      this.eggHeight * 0.12,
      COLORS.ink,
      0.18,
    );
    this.base = scene.add
      .image(0, 0, 'egg-base')
      .setOrigin(0.5, 0.94)
      .setDisplaySize(this.eggWidth, this.eggHeight);
    setTintableTexture(this.base, 'egg-base', pet.eggTint);
    this.pattern = scene.add
      .image(0, 0, `egg-${pet.eggPattern}`)
      .setOrigin(0.5, 0.94)
      .setDisplaySize(this.eggWidth, this.eggHeight)
      .setAlpha(0.9);

    this.add([this.shadow, this.base, this.pattern]);
    scene.add.existing(this);
  }

  wobble(): void {
    if (isReducedMotion()) {
      return;
    }
    this.scene.tweens.add({
      targets: this,
      angle: { from: -7, to: 7 },
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.angle = 0;
      },
    });
  }
}
