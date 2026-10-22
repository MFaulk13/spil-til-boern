import Phaser from 'phaser';
import { getPet } from '@/game/catalog/pets';
import type { CareNeed, PetId } from '@/game/types';
import type { Mood } from '@/systems/pet';
import { COLORS } from '@/ui/theme';

const SAD_TINT = 0xc7d8e6;

export class PetView extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly size: number;
  private petId: PetId;
  private idleTween?: Phaser.Tweens.Tween;
  private image?: Phaser.GameObjects.Image;
  private bubble?: Phaser.GameObjects.Container;
  private mood: Mood = 'happy';
  private lowNeed: CareNeed | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, petId: PetId) {
    super(scene, x, y);
    this.size = size;
    this.petId = petId;

    this.shadow = scene.add.ellipse(0, -2, size * 0.7, size * 0.14, COLORS.ink, 0.16);
    this.content = scene.add.container(0, 0);
    this.add([this.shadow, this.content]);
    this.rebuild();

    scene.add.existing(this);
  }

  setPet(petId: PetId): this {
    this.petId = petId;
    this.rebuild();
    return this;
  }

  setFacingRight(right: boolean): this {
    this.content.scaleX = right ? 1 : -1;
    return this;
  }

  setMood(mood: Mood): this {
    if (this.mood === mood) {
      return this;
    }
    this.mood = mood;
    this.applyMoodTint();
    return this;
  }

  showNeedBubble(need: CareNeed | null): this {
    if (this.lowNeed === need) {
      return this;
    }
    this.lowNeed = need;
    this.rebuildBubble();
    return this;
  }

  startIdle(): void {
    this.idleTween?.remove();
    this.content.y = 0;
    this.idleTween = this.scene.tweens.add({
      targets: this.content,
      y: -7,
      duration: this.mood === 'sad' ? 1900 : 1200,
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

  playHop(): void {
    this.idleTween?.pause();
    this.scene.tweens.add({
      targets: this.content,
      y: -34,
      duration: 170,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.idleTween?.resume(),
    });
  }

  playNod(): void {
    this.idleTween?.pause();
    this.scene.tweens.add({
      targets: this.content,
      scaleY: 0.88,
      duration: 140,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.content.scaleY = 1;
        this.idleTween?.resume();
      },
    });
  }

  playJoy(): void {
    this.idleTween?.pause();
    this.scene.tweens.add({
      targets: this.content,
      y: -38,
      duration: 170,
      yoyo: true,
      repeat: 1,
      hold: 60,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.content.y = 0;
        this.idleTween?.resume();
      },
    });
  }

  playSleep(): void {
    this.idleTween?.pause();
    this.scene.tweens.add({
      targets: this.content,
      y: 10,
      scaleY: 0.9,
      duration: 240,
      yoyo: true,
      hold: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.content.scaleY = 1;
        this.idleTween?.resume();
      },
    });
  }

  private rebuild(): void {
    this.content.removeAll(true);
    const pet = getPet(this.petId);
    if (!this.scene.textures.exists(pet.assetKey)) {
      this.image = undefined;
      return;
    }

    this.image = this.scene.add
      .image(0, 0, pet.assetKey)
      .setOrigin(0.5, 0.86)
      .setDisplaySize(this.size, this.size);
    this.content.add(this.image);
    this.applyMoodTint();
  }

  private applyMoodTint(): void {
    if (!this.image) {
      return;
    }
    if (this.mood === 'sad') {
      this.image.setTint(SAD_TINT);
    } else {
      this.image.clearTint();
    }
  }

  private rebuildBubble(): void {
    this.bubble?.destroy(true);
    this.bubble = undefined;

    if (!this.lowNeed) {
      return;
    }

    const bubble = this.scene.add.container(0, -this.size * 0.86 - 44);
    const width = 140;
    const height = 70;

    const background = this.scene.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 22);
    background.lineStyle(4, COLORS.primary, 0.9);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 22);
    background.fillStyle(COLORS.panel, 0.98);
    background.fillTriangle(-12, height / 2 - 2, 12, height / 2 - 2, 0, height / 2 + 18);

    const face = this.scene.add.graphics();
    face.fillStyle(0xfff1dd, 1);
    face.fillCircle(-30, 0, 21);
    face.lineStyle(3, COLORS.ink, 0.55);
    face.strokeCircle(-30, 0, 21);
    face.fillStyle(COLORS.ink, 0.8);
    face.fillCircle(-38, -6, 3);
    face.fillCircle(-22, -6, 3);
    face.lineStyle(3, COLORS.ink, 0.7);
    face.beginPath();
    face.moveTo(-40, 8);
    face.lineTo(-30, 1);
    face.lineTo(-20, 8);
    face.strokePath();

    bubble.add([background, face]);

    bubble.add(this.scene.add.image(34, 0, `icon-${this.lowNeed}`).setDisplaySize(44, 44));

    this.add(bubble);
    this.bubble = bubble;

    bubble.setScale(0.85).setAlpha(0);
    this.scene.tweens.add({
      targets: bubble,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
    });
  }
}
