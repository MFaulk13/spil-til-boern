import Phaser from 'phaser';
import { text } from '@/game/text';
import type { ProfileOverview } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import { CharacterView } from '@/ui/CharacterView';
import { PetView } from '@/ui/PetView';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const DELETE_SIZE = 64;

export interface ProfileCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  profile: ProfileOverview;
  onSelect: () => void;
  onDelete: () => void;
}

export class ProfileCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, options: ProfileCardOptions) {
    super(scene, options.x, options.y);

    const { width, height, profile } = options;
    const background = scene.add.graphics();
    this.drawBackground(background, width, height, profile.active);

    const name = scene.add
      .text(-width / 2 + 24, -height / 2 + 34, profile.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add([background, name]);
    this.add(this.createCharacter(profile, width, height));
    this.add(this.createPet(profile, width, height));

    if (profile.active) {
      const label = profile.petName
        ? `${text.profiles.lastPlayed} · ${profile.petName}`
        : text.profiles.lastPlayed;
      const badge = scene.add
        .text(0, height / 2 - 18, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '17px',
          color: COLORS.textMuted,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.add(badge);
    }

    this.add(this.createDeleteButton(scene, width, height, options.onDelete));

    this.setSize(width, height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerdown', (_pointer: Phaser.Input.Pointer, localX: number, localY: number) => {
      if (localX > width / 2 - DELETE_SIZE && localY < -height / 2 + DELETE_SIZE) {
        return;
      }
      options.onSelect();
    });

    scene.add.existing(this);
  }

  private createCharacter(
    profile: ProfileOverview,
    width: number,
    height: number,
  ): Phaser.GameObjects.GameObject {
    if (profile.look) {
      const character = new CharacterView(
        this.scene,
        -width * 0.24,
        height * 0.33,
        Math.min(140, height * 0.68),
        profile.look,
      );
      if (profile.active && !isReducedMotion()) {
        character.startIdle();
      }
      return character;
    }

    return this.scene.add
      .image(-width * 0.24, 0, 'icon-paw')
      .setDisplaySize(96, 96)
      .setAlpha(0.45)
      .setAngle(-8);
  }

  private createPet(
    profile: ProfileOverview,
    width: number,
    height: number,
  ): Phaser.GameObjects.GameObject {
    if (profile.petId) {
      const pet = new PetView(
        this.scene,
        width * 0.24,
        height * 0.26,
        88,
        profile.petId,
        profile.petAccessory,
      );
      if (profile.active && !isReducedMotion()) {
        pet.startIdle();
      }
      return pet;
    }

    const container = this.scene.add.container(width * 0.24, height * 0.08);
    container.add(
      this.scene.add
        .image(0, 0, 'icon-paw')
        .setDisplaySize(64, 64)
        .setAlpha(profile.look ? 0.45 : 0.25)
        .setAngle(8),
    );
    if (profile.look) {
      container.add(
        this.scene.add
          .text(0, 48, text.profiles.noPet, {
            fontFamily: FONT_FAMILY,
            fontSize: '17px',
            color: COLORS.textMuted,
          })
          .setOrigin(0.5),
      );
    }
    return container;
  }

  private createDeleteButton(
    scene: Phaser.Scene,
    width: number,
    height: number,
    onDelete: () => void,
  ): Phaser.GameObjects.Container {
    const button = scene.add.container(
      width / 2 - DELETE_SIZE / 2 - 8,
      -height / 2 + DELETE_SIZE / 2 + 8,
    );
    const circle = scene.add
      .circle(0, 0, DELETE_SIZE / 2, COLORS.panelLight, 0.95)
      .setStrokeStyle(3, COLORS.primaryDark, 0.35);
    const icon = scene.add.image(0, 0, 'icon-trash').setDisplaySize(28, 28);
    button.add([circle, icon]);
    button.setSize(DELETE_SIZE, DELETE_SIZE);
    button.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, DELETE_SIZE, DELETE_SIZE),
      Phaser.Geom.Rectangle.Contains,
    );
    button.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
      },
    );
    button.on('pointerup', () => onDelete());
    return button;
  }

  private drawBackground(
    graphics: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    active: boolean,
  ): void {
    graphics.fillStyle(active ? COLORS.accent : COLORS.panel, active ? 0.2 : 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 30);
    graphics.lineStyle(active ? 6 : 4, active ? COLORS.accentDark : COLORS.panelLight, 1);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 30);
  }
}
