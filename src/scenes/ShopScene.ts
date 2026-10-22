import Phaser from 'phaser';
import { itemsByCategory, type ItemDefinition } from '@/game/catalog/items';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { ITEM_CATEGORIES, type ItemCategory } from '@/game/types';
import { audio } from '@/systems/audio';
import { canAfford, itemCount, purchase } from '@/systems/economy';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { ItemCard } from '@/ui/ItemCard';
import { ConfirmDialog } from '@/ui/Modal';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const CARD_WIDTH = 270;
const CARD_HEIGHT = 145;
const COLUMN_X = [205, 495, 785, 1075] as const;
const ROW_Y = [300, 462, 624] as const;

export class ShopScene extends Phaser.Scene {
  private category: ItemCategory = 'furniture';
  private heartsText?: Phaser.GameObjects.Text;
  private grid?: Phaser.GameObjects.Container;
  private dialog?: ConfirmDialog;
  private readonly categoryButtons = new Map<ItemCategory, Button>();

  constructor() {
    super(SCENE_KEYS.SHOP);
  }

  create(): void {
    this.dialog = undefined;
    this.category = 'furniture';
    this.categoryButtons.clear();

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'shop-room');

    new Button(this, {
      x: 96,
      y: 58,
      label: text.shop.back,
      width: 160,
      height: 70,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.goBack(),
    });

    this.add
      .text(GAME_WIDTH / 2, 48, text.shop.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '54px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 92, text.shop.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '23px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.createHeartPill();
    this.createCategoryTabs();
    this.refreshGrid();
    this.cameras.main.fadeIn(240, 255, 246, 229);
  }

  private createHeartPill(): void {
    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.95);
    background.fillRoundedRect(1040, 24, 210, 68, 24);
    background.lineStyle(4, COLORS.accent, 0.6);
    background.strokeRoundedRect(1040, 24, 210, 68, 24);

    this.add.image(1074, 58, 'icon-heart').setDisplaySize(38, 38);
    this.heartsText = this.add
      .text(1100, 58, String(save.hearts), {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
  }

  private createCategoryTabs(): void {
    const labels: Record<ItemCategory, string> = {
      furniture: text.shop.categories.furniture,
      toy: text.shop.categories.toy,
      accessory: text.shop.categories.accessory,
      treat: text.shop.categories.treat,
    };

    ITEM_CATEGORIES.forEach((category, index) => {
      const button = new Button(this, {
        x: 286 + index * 236,
        y: 174,
        label: labels[category],
        width: 220,
        height: 68,
        fontSize: 25,
        color: category === this.category ? COLORS.primary : COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.selectCategory(category),
      });
      this.categoryButtons.set(category, button);
    });
  }

  private selectCategory(category: ItemCategory): void {
    if (this.category === category) {
      return;
    }
    this.category = category;
    for (const [id, button] of this.categoryButtons) {
      button.setColor(id === category ? COLORS.primary : COLORS.panelLight);
    }
    this.refreshGrid();
  }

  private refreshGrid(): void {
    this.grid?.destroy(true);
    this.grid = this.add.container(0, 0);
    this.updateHearts();

    const items = itemsByCategory(this.category);
    items.forEach((item, index) => {
      const column = index % COLUMN_X.length;
      const row = Math.floor(index / COLUMN_X.length);
      const card = new ItemCard(this, {
        x: COLUMN_X[column],
        y: ROW_Y[row] ?? ROW_Y[ROW_Y.length - 1],
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        item,
        owned: itemCount(save, item.id),
        affordable: canAfford(save, item.price),
        onClick: (selected) => this.askToBuy(selected),
      });
      this.grid?.add(card);
    });
  }

  private askToBuy(item: ItemDefinition): void {
    if (this.dialog) {
      return;
    }

    if (!canAfford(save, item.price)) {
      this.showToast(text.shop.notEnough(item.price - save.hearts));
      return;
    }

    this.dialog = new ConfirmDialog(this, {
      title: text.shop.confirmTitle(item.label),
      body: text.shop.confirmBody(item.price),
      confirmLabel: text.shop.buy,
      cancelLabel: text.shop.cancel,
      onConfirm: () => {
        this.dialog = undefined;
        this.buy(item);
      },
      onCancel: () => {
        this.dialog = undefined;
      },
    });
  }

  private buy(item: ItemDefinition): void {
    const result = purchase(save, item.id, item.price);
    if (!result.ok) {
      this.showToast(text.shop.notEnough(item.price - result.hearts));
      return;
    }

    audio.play('collect');
    this.updateHearts();
    this.refreshGrid();
    this.showToast(text.shop.bought(item.label));
  }

  private updateHearts(): void {
    this.heartsText?.setText(String(save.hearts));
  }

  private showToast(message: string): void {
    const toast = this.add
      .text(GAME_WIDTH / 2, 214, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.text,
        backgroundColor: '#fff8ee',
        padding: { x: 22, y: 12 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(900)
      .setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: 224,
      duration: 180,
      yoyo: true,
      hold: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  private goBack(): void {
    this.cameras.main.fadeOut(200, 255, 246, 229);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TOWN);
    });
  }
}
