import Phaser from 'phaser';
import type { ItemDefinition } from '@/game/catalog/items';
import { text } from '@/game/text';
import { Button } from '@/ui/Button';
import { ItemCard } from '@/ui/ItemCard';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export interface InventoryEntry {
  item: ItemDefinition;
  count: number;
}

const PAGE_SIZE = 6;
const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 486;
const CARD_WIDTH = 145;
const CARD_HEIGHT = 92;

export class InventoryPanel extends Phaser.GameObjects.Container {
  private readonly entries: InventoryEntry[];
  private readonly onSelect: (item: ItemDefinition) => void;
  private readonly removeButton: Button;
  private readonly content: Phaser.GameObjects.Container;
  private page = 0;
  private selectedItemId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    entries: InventoryEntry[],
    selectedItemId: string | null,
    selectedUid: string | null,
    onSelect: (item: ItemDefinition) => void,
    onRemove: () => void,
  ) {
    super(scene, x, y);
    this.entries = entries;
    this.selectedItemId = selectedItemId;
    this.onSelect = onSelect;

    const blocker = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x000000, 0.001)
      .setInteractive();
    const background = scene.add.graphics();
    background.fillStyle(COLORS.panel, 0.97);
    background.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 30);
    background.lineStyle(5, COLORS.accent, 0.8);
    background.strokeRoundedRect(
      -PANEL_WIDTH / 2,
      -PANEL_HEIGHT / 2,
      PANEL_WIDTH,
      PANEL_HEIGHT,
      30,
    );

    const title = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 34, text.placement.inventory, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.content = scene.add.container(0, 0);
    this.removeButton = new Button(scene, {
      x: 0,
      y: PANEL_HEIGHT / 2 - 47,
      label: text.placement.remove,
      iconKey: 'icon-trash',
      iconSize: 30,
      width: 290,
      height: 68,
      fontSize: 24,
      color: COLORS.primary,
      onClick: onRemove,
    });
    this.removeButton.setEnabled(selectedUid !== null);

    this.add([blocker, background, title, this.content, this.removeButton]);
    this.setDepth(950);
    scene.add.existing(this);
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
          .text(0, -30, text.placement.empty, {
            fontFamily: FONT_FAMILY,
            fontSize: '21px',
            color: COLORS.textMuted,
            align: 'center',
            wordWrap: { width: PANEL_WIDTH - 60 },
          })
          .setOrigin(0.5),
      );
    }

    visible.forEach((entry, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const card = new ItemCard(this.scene, {
        x: column === 0 ? -80 : 80,
        y: -150 + row * 92,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        item: entry.item,
        owned: entry.count,
        selected: entry.item.id === this.selectedItemId,
        compact: true,
        showPrice: false,
        onClick: (item) => this.onSelect(item),
      });
      this.content.add(card);
    });

    if (pages > 1) {
      const previous = new Button(this.scene, {
        x: -86,
        y: 112,
        label: '<',
        width: 76,
        height: 56,
        fontSize: 26,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => {
          this.page = (this.page + pages - 1) % pages;
          this.render();
        },
      });
      const next = new Button(this.scene, {
        x: 86,
        y: 112,
        label: '>',
        width: 76,
        height: 56,
        fontSize: 26,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => {
          this.page = (this.page + 1) % pages;
          this.render();
        },
      });
      const pageText = this.scene.add
        .text(0, 112, `${this.page + 1} / ${pages}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);

      this.content.add([previous, next, pageText]);
    }
  }
}
