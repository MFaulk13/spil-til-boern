import Phaser from 'phaser';
import type { ItemDefinition } from '@/game/catalog/items';
import type { OwnedToy } from '@/game/catalog/toys';
import { text } from '@/game/text';
import { isReducedMotion } from '@/systems/motion';
import { Button } from '@/ui/Button';
import { ItemCard } from '@/ui/ItemCard';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const PANEL_WIDTH = 840;
const PANEL_HEIGHT = 580;
const CARD_WIDTH = 224;
const CARD_HEIGHT = 128;
const PAGE_SIZE = 6;
const COLUMNS = [-254, 0, 254];
const ROWS = [-92, 52];

export class ToyPanel extends Phaser.GameObjects.Container {
  private readonly entries: readonly OwnedToy[];
  private readonly onSelect: (item: ItemDefinition) => void;
  private readonly content: Phaser.GameObjects.Container;
  private page = 0;

  constructor(
    scene: Phaser.Scene,
    entries: readonly OwnedToy[],
    onSelect: (item: ItemDefinition) => void,
    onClose: () => void,
  ) {
    super(scene, 640, 360);
    this.entries = entries;
    this.onSelect = onSelect;

    const backdrop = scene.add
      .rectangle(0, 0, 1280, 720, COLORS.ink, 0.55)
      .setInteractive()
      .on('pointerdown', () => onClose());

    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panel, 0.99);
    panel.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);
    panel.lineStyle(6, COLORS.accent, 0.9);
    panel.strokeRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);

    const blocker = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x000000, 0.001)
      .setInteractive();

    const title = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 44, text.park.toysTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '38px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 84, text.park.toysSubtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.content = scene.add.container(0, 0);

    const close = new Button(scene, {
      x: 0,
      y: PANEL_HEIGHT / 2 - 54,
      label: text.park.close,
      width: 220,
      height: 70,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: onClose,
    });

    this.add([backdrop, panel, blocker, title, subtitle, this.content, close]);
    this.setDepth(1000);
    scene.add.existing(this);

    if (!isReducedMotion()) {
      this.setAlpha(0).setScale(0.96);
      scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }

    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const pages = Math.max(1, Math.ceil(this.entries.length / PAGE_SIZE));
    this.page = Math.min(this.page, pages - 1);
    const visible = this.entries.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);

    if (this.entries.length === 0) {
      this.content.add(
        this.scene.add
          .text(0, -20, text.park.toysEmpty, {
            fontFamily: FONT_FAMILY,
            fontSize: '24px',
            color: COLORS.textMuted,
          })
          .setOrigin(0.5),
      );
      return;
    }

    visible.forEach((entry, index) => {
      const card = new ItemCard(this.scene, {
        x: COLUMNS[index % 3],
        y: ROWS[Math.floor(index / 3)],
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        item: entry.item,
        owned: entry.count,
        compact: true,
        showPrice: false,
        onClick: (item) => this.onSelect(item),
      });
      this.content.add(card);
    });

    if (pages > 1) {
      const previous = new Button(this.scene, {
        x: -PANEL_WIDTH / 2 + 78,
        y: PANEL_HEIGHT / 2 - 54,
        label: '<',
        width: 66,
        height: 60,
        fontSize: 26,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => {
          this.page = (this.page + pages - 1) % pages;
          this.render();
        },
      });
      const next = new Button(this.scene, {
        x: PANEL_WIDTH / 2 - 78,
        y: PANEL_HEIGHT / 2 - 54,
        label: '>',
        width: 66,
        height: 60,
        fontSize: 26,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => {
          this.page = (this.page + 1) % pages;
          this.render();
        },
      });
      const pageText = this.scene.add
        .text(0, PANEL_HEIGHT / 2 - 104, `${this.page + 1} / ${pages}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);
      this.content.add([previous, next, pageText]);
    }
  }
}
