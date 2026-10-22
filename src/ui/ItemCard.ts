import Phaser from 'phaser';
import type { ItemDefinition } from '@/game/catalog/items';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export interface ItemCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  item: ItemDefinition;
  owned?: number;
  affordable?: boolean;
  selected?: boolean;
  compact?: boolean;
  showPrice?: boolean;
  onClick?: (item: ItemDefinition) => void;
}

export class ItemCard extends Phaser.GameObjects.Container {
  private readonly cardWidth: number;
  private readonly cardHeight: number;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly priceText: Phaser.GameObjects.Text;
  private readonly ownedBadge: Phaser.GameObjects.Container;
  private readonly ownedText: Phaser.GameObjects.Text;
  private affordable: boolean;
  private selected: boolean;

  constructor(scene: Phaser.Scene, options: ItemCardOptions) {
    super(scene, options.x, options.y);

    this.cardWidth = options.width;
    this.cardHeight = options.height;
    this.affordable = options.affordable ?? true;
    this.selected = options.selected ?? false;

    this.background = scene.add.graphics();

    const compact = options.compact ?? false;
    const iconArea = Math.min(this.cardWidth * 0.56, this.cardHeight * 0.48);
    const icon = scene.add
      .image(0, -this.cardHeight * 0.16, options.item.assetKey)
      .setDisplaySize(
        Math.min(iconArea, options.item.width),
        Math.min(iconArea, options.item.height),
      );
    if (options.item.width > options.item.height) {
      icon.setDisplaySize(
        iconArea,
        (iconArea * options.item.height) / options.item.width,
      );
    } else {
      icon.setDisplaySize(
        (iconArea * options.item.width) / options.item.height,
        iconArea,
      );
    }

    const label = scene.add
      .text(0, this.cardHeight * 0.2, options.item.label, {
        fontFamily: FONT_FAMILY,
        fontSize: compact ? '17px' : '23px',
        color: COLORS.text,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: this.cardWidth - 18 },
      })
      .setOrigin(0.5);

    const heart = scene.add
      .image(-18, this.cardHeight * 0.38, 'icon-heart')
      .setDisplaySize(compact ? 17 : 22, compact ? 17 : 22);
    this.priceText = scene.add
      .text(-2, this.cardHeight * 0.38, text.shop.price(options.item.price), {
        fontFamily: FONT_FAMILY,
        fontSize: compact ? '15px' : '19px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    const showPrice = options.showPrice ?? true;
    heart.setVisible(showPrice);
    this.priceText.setVisible(showPrice);

    this.ownedBadge = scene.add.container(this.cardWidth / 2 - 20, -this.cardHeight / 2 + 20);
    const badgeCircle = scene.add.graphics();
    badgeCircle.fillStyle(COLORS.teal, 1);
    badgeCircle.fillCircle(0, 0, 16);
    badgeCircle.lineStyle(3, 0xffffff, 0.7);
    badgeCircle.strokeCircle(0, 0, 16);
    this.ownedText = scene.add
      .text(0, 0, '0', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: COLORS.textDark,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.ownedBadge.add([badgeCircle, this.ownedText]);
    this.ownedBadge.setVisible((options.owned ?? 0) > 0);
    this.ownedText.setText(String(options.owned ?? 0));

    this.add([
      this.background,
      icon,
      label,
      heart,
      this.priceText,
      this.ownedBadge,
    ]);
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
      options.onClick?.(options.item);
    });

    scene.add.existing(this);
  }

  setOwned(count: number): this {
    this.ownedText.setText(String(count));
    this.ownedBadge.setVisible(count > 0);
    return this;
  }

  setAffordable(affordable: boolean): this {
    this.affordable = affordable;
    this.priceText.setColor(affordable ? COLORS.textMuted : COLORS.textAccent);
    this.drawBackground();
    return this;
  }

  setSelected(selected: boolean): this {
    this.selected = selected;
    this.drawBackground();
    return this;
  }

  private drawBackground(hover = false): void {
    const radius = 20;
    const left = -this.cardWidth / 2;
    const top = -this.cardHeight / 2;
    const fill = hover ? COLORS.panelLight : COLORS.panel;
    const stroke = this.selected ? COLORS.primary : COLORS.accent;

    this.background.clear();
    this.background.fillStyle(fill, 0.98);
    this.background.fillRoundedRect(left, top, this.cardWidth, this.cardHeight, radius);
    this.background.lineStyle(this.selected ? 7 : 4, stroke, this.selected ? 1 : 0.55);
    this.background.strokeRoundedRect(left, top, this.cardWidth, this.cardHeight, radius);

    if (!this.affordable) {
      this.background.fillStyle(COLORS.ink, 0.08);
      this.background.fillRoundedRect(left, top, this.cardWidth, this.cardHeight, radius);
    }
  }
}
