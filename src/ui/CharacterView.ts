import Phaser from 'phaser';
import type { CharacterLook } from '@/game/types';
import { buildCharacterLayers, normalizeLook } from '@/systems/appearance';
import { COLORS } from '@/ui/theme';

export class CharacterView extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly size: number;
  private look: CharacterLook;
  private idleTween?: Phaser.Tweens.Tween;
  private walkTween?: Phaser.Tweens.Tween;
  private walking = false;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, look: unknown) {
    super(scene, x, y);
    this.size = size;
    this.look = normalizeLook(look);

    this.shadow = scene.add.ellipse(0, -4, size * 0.62, size * 0.12, COLORS.ink, 0.16);
    this.content = scene.add.container(0, 0);
    this.add([this.shadow, this.content]);
    this.rebuild();

    scene.add.existing(this);
  }

  get currentLook(): CharacterLook {
    return this.look;
  }

  setLook(look: unknown): this {
    this.look = normalizeLook(look);
    this.rebuild();
    return this;
  }

  setFacingRight(right: boolean): this {
    this.content.scaleX = right ? 1 : -1;
    return this;
  }

  startIdle(): void {
    this.idleTween?.remove();
    this.content.y = 0;
    this.idleTween = this.scene.tweens.add({
      targets: this.content,
      y: -6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopIdle(): void {
    this.idleTween?.remove();
    this.idleTween = undefined;
    this.content.y = 0;
  }

  setWalking(walking: boolean): void {
    if (this.walking === walking) {
      return;
    }
    this.walking = walking;

    if (walking) {
      this.stopIdle();
      this.walkTween?.remove();
      this.walkTween = this.scene.tweens.add({
        targets: this.content,
        y: -5,
        duration: 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return;
    }

    this.walkTween?.remove();
    this.walkTween = undefined;
    this.startIdle();
  }

  private rebuild(): void {
    this.content.removeAll(true);

    for (const layer of buildCharacterLayers(this.look)) {
      if (!this.scene.textures.exists(layer.assetKey)) {
        continue;
      }
      const image = this.scene.add
        .image(0, 0, layer.assetKey)
        .setOrigin(0.5, 0.95)
        .setDisplaySize(this.size, this.size);
      if (layer.tint !== undefined) {
        image.setTint(layer.tint);
      }
      this.content.add(image);
    }
  }
}
