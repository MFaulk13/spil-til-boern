import Phaser from 'phaser';
import type { PetDefinition } from '@/game/catalog/pets';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { EggView } from '@/ui/EggView';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export interface PetCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  pet: PetDefinition;
  price: number;
  owned: number;
  affordable: boolean;
  onClick: (pet: PetDefinition) => void;
}

export class PetCard extends Phaser.GameObjects.Container {
  private readonly cardWidth: number;
  private readonly cardHeight: number;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly affordable: boolean;

  constructor(scene: Phaser.Scene, options: PetCardOptions) {
    super(scene, options.x, options.y);
    this.cardWidth = options.width;
    this.cardHeight = options.height;
    this.affordable = options.affordable;
    this.background = scene.add.graphics();

    const egg = new EggView(scene, -this.cardWidth * 0.21, this.cardHeight * 0.3, options.pet, 0.6);

    const label = scene.add
      .text(-this.cardWidth * 0.5 + 128, -22, options.pet.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '25px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const heart = scene.add
      .image(-this.cardWidth * 0.5 + 132, 24, 'icon-heart')
      .setDisplaySize(20, 20);
    const price = scene.add
      .text(-this.cardWidth * 0.5 + 148, 24, text.shop.price(options.price), {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: options.affordable ? COLORS.textMuted : COLORS.textAccent,
      })
      .setOrigin(0, 0.5);

    const owned = scene.add
      .text(this.cardWidth * 0.5 - 18, -this.cardHeight * 0.5 + 20, `× ${options.owned}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: COLORS.text,
        fontStyle: 'bold',
        backgroundColor: '#d8f1ec',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(1, 0.5)
      .setVisible(options.owned > 0);

    const action = scene.add
      .text(this.cardWidth * 0.5 - 18, this.cardHeight * 0.5 - 22, text.shop.adopt, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setVisible(options.affordable);

    this.add([this.background, egg, label, heart, price, owned, action]);
    this.drawBackground();
    this.setSize(this.cardWidth, this.cardHeight);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.cardWidth, this.cardHeight),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerover', () => this.drawBackground(true));
    this.on('pointerout', () => this.drawBackground(false));
    this.on('pointerup', () => {
      audio.play('click');
      options.onClick(options.pet);
    });

    scene.add.existing(this);
  }

  private drawBackground(hover = false): void {
    const radius = 24;
    const left = -this.cardWidth / 2;
    const top = -this.cardHeight / 2;
    this.background.clear();
    this.background.fillStyle(hover ? COLORS.panelLight : COLORS.panel, 0.98);
    this.background.fillRoundedRect(left, top, this.cardWidth, this.cardHeight, radius);
    this.background.lineStyle(4, COLORS.teal, hover ? 0.9 : 0.5);
    this.background.strokeRoundedRect(left, top, this.cardWidth, this.cardHeight, radius);
    if (!this.affordable) {
      this.background.fillStyle(COLORS.ink, 0.08);
      this.background.fillRoundedRect(left, top, this.cardWidth, this.cardHeight, radius);
    }
  }
}
