import Phaser from 'phaser';
import { getItem } from '@/game/catalog/items';
import { getPet } from '@/game/catalog/pets';
import type { CareNeed, PetId } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import type { Mood } from '@/systems/pet';
import { COLORS } from '@/ui/theme';

const SAD_TINT = 0xc7d8e6;
const HAPPY_TINT = 0xfff4d6;

export class PetView extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly size: number;
  private petId: PetId;
  private accessoryId: string | null;
  private idleTween?: Phaser.Tweens.Tween;
  private secondaryIdleTween?: Phaser.Tweens.Tween;
  private image?: Phaser.GameObjects.Image;
  private accessoryImage?: Phaser.GameObjects.Image;
  private bubble?: Phaser.GameObjects.Container;
  private expression?: Phaser.GameObjects.Container;
  private mood: Mood = 'okay';
  private lowNeed: CareNeed | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    size: number,
    petId: PetId,
    accessoryId: string | null = null,
  ) {
    super(scene, x, y);
    this.size = size;
    this.petId = petId;
    this.accessoryId = accessoryId;

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

  setAccessory(accessoryId: string | null): this {
    if (this.accessoryId === accessoryId) {
      return this;
    }
    this.accessoryId = accessoryId;
    this.rebuildAccessory();
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
    this.rebuildExpression();
    this.startIdle();
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
    this.secondaryIdleTween?.remove();
    this.idleTween = undefined;
    this.secondaryIdleTween = undefined;
    this.content.y = 0;
    this.content.angle = 0;

    if (isReducedMotion()) {
      return;
    }

    const motion = getPet(this.petId).motion;
    const profile = {
      walk: { offset: -7, duration: 1200 },
      hop: { offset: -12, duration: 720 },
      swim: { offset: -5, duration: 1500 },
      float: { offset: -10, duration: 1900 },
    }[motion];
    const sadFactor = this.mood === 'sad' ? 1.7 : 1;

    this.idleTween = this.scene.tweens.add({
      targets: this.content,
      y: profile.offset,
      duration: profile.duration * sadFactor,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (motion === 'swim' || motion === 'float') {
      this.secondaryIdleTween = this.scene.tweens.add({
        targets: this.content,
        angle: motion === 'swim' ? 3 : -2,
        duration: profile.duration * 1.3,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  stopIdle(): void {
    this.idleTween?.remove();
    this.secondaryIdleTween?.remove();
    this.idleTween = undefined;
    this.secondaryIdleTween = undefined;
    this.content.y = 0;
    this.content.angle = 0;
  }

  playHop(): void {
    if (isReducedMotion()) {
      return;
    }
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
    if (isReducedMotion()) {
      return;
    }
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
    if (isReducedMotion()) {
      return;
    }
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
    if (isReducedMotion()) {
      return;
    }
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
    this.accessoryImage = undefined;
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
    this.rebuildAccessory();
    this.applyMoodTint();
  }

  private rebuildAccessory(): void {
    this.accessoryImage?.destroy();
    this.accessoryImage = undefined;

    if (!this.accessoryId) {
      return;
    }
    const item = getItem(this.accessoryId);
    if (!item || item.category !== 'accessory' || !this.scene.textures.exists(item.assetKey)) {
      return;
    }

    const size = this.size * 0.36;
    this.accessoryImage = this.scene.add
      .image(0, -this.size * 0.34, item.assetKey)
      .setDisplaySize(size, size)
      .setAngle(-6);
    this.content.add(this.accessoryImage);
  }

  private applyMoodTint(): void {
    if (!this.image) {
      return;
    }
    if (this.mood === 'sad') {
      this.image.setTint(SAD_TINT);
      return;
    }
    if (this.mood === 'happy') {
      this.image.setTint(HAPPY_TINT);
      return;
    }
    this.image.clearTint();
  }

  private rebuildExpression(): void {
    this.expression?.destroy(true);
    this.expression = undefined;

    if (this.mood === 'okay') {
      return;
    }

    const radius = Math.max(20, this.size * 0.15);
    const expression = this.scene.add.container(this.size * 0.34, -this.size * 0.62);

    const background = this.scene.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillCircle(0, 0, radius);
    background.lineStyle(4, this.mood === 'happy' ? COLORS.primary : COLORS.sky, 0.95);
    background.strokeCircle(0, 0, radius);

    const face = this.scene.add.graphics();
    face.lineStyle(3, COLORS.ink, 0.85);
    if (this.mood === 'happy') {
      face.beginPath();
      face.arc(-radius * 0.34, -radius * 0.08, radius * 0.2, Math.PI * 1.1, Math.PI * 1.9);
      face.strokePath();
      face.beginPath();
      face.arc(radius * 0.34, -radius * 0.08, radius * 0.2, Math.PI * 1.1, Math.PI * 1.9);
      face.strokePath();
      face.beginPath();
      face.arc(0, radius * 0.08, radius * 0.42, Math.PI * 0.15, Math.PI * 0.85);
      face.strokePath();
      face.fillStyle(COLORS.primary, 0.45);
      face.fillCircle(-radius * 0.62, radius * 0.22, radius * 0.13);
      face.fillCircle(radius * 0.62, radius * 0.22, radius * 0.13);
    } else {
      face.beginPath();
      face.arc(-radius * 0.32, radius * 0.02, radius * 0.18, Math.PI * 1.15, Math.PI * 1.85);
      face.strokePath();
      face.beginPath();
      face.arc(radius * 0.32, radius * 0.02, radius * 0.18, Math.PI * 1.15, Math.PI * 1.85);
      face.strokePath();
      face.beginPath();
      face.arc(0, radius * 0.62, radius * 0.4, Math.PI * 1.2, Math.PI * 1.8);
      face.strokePath();
      face.fillStyle(COLORS.sky, 1);
      face.fillEllipse(-radius * 0.42, radius * 0.28, radius * 0.16, radius * 0.26);
    }

    expression.add([background, face]);
    this.add(expression);
    this.expression = expression;

    if (isReducedMotion()) {
      return;
    }
    expression.setScale(0.6).setAlpha(0);
    this.scene.tweens.add({
      targets: expression,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
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

    if (isReducedMotion()) {
      return;
    }
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
