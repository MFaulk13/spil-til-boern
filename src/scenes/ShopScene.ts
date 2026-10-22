import Phaser from 'phaser';
import { loadMissingAssets } from '@/game/assets';
import {
  categoryPurchaseCount,
  isItemUnlocked,
  itemsByCategory,
  type ItemDefinition,
} from '@/game/catalog/items';
import { PETS, type PetDefinition } from '@/game/catalog/pets';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { ITEM_CATEGORIES, type ItemCategory } from '@/game/types';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { canAfford, itemCount, purchase } from '@/systems/economy';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { ItemCard } from '@/ui/ItemCard';
import { ConfirmDialog } from '@/ui/Modal';
import { PetCard } from '@/ui/PetCard';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

type ShopTab = ItemCategory | 'pet';

const CARD_WIDTH = 270;
const CARD_HEIGHT = 145;
const COLUMN_X = [205, 495, 785, 1075] as const;
const ROW_Y = [300, 462, 624] as const;

export class ShopScene extends Phaser.Scene {
  private category: ShopTab = 'furniture';
  private heartsText?: Phaser.GameObjects.Text;
  private grid?: Phaser.GameObjects.Container;
  private dialog?: ConfirmDialog;
  private page = 0;
  private readonly categoryButtons = new Map<ShopTab, Button>();

  constructor() {
    super(SCENE_KEYS.SHOP);
  }

  preload(): void {
    loadMissingAssets(this.load, this.textures, ['shop-room']);
  }

  create(): void {
    this.dialog = undefined;
    this.category = 'furniture';
    this.page = 0;
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
    this.setupKeyboard();
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

  private setupKeyboard(): void {
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ONE', () => this.selectCategory('furniture'));
    keyboard?.on('keydown-TWO', () => this.selectCategory('toy'));
    keyboard?.on('keydown-THREE', () => this.selectCategory('accessory'));
    keyboard?.on('keydown-FOUR', () => this.selectCategory('treat'));
    keyboard?.on('keydown-FIVE', () => this.selectCategory('pet'));
    keyboard?.on('keydown-ESC', () => {
      if (!this.dialog) {
        this.goBack();
      }
    });
  }

  private createCategoryTabs(): void {
    const labels: Record<ShopTab, string> = {
      furniture: text.shop.categories.furniture,
      toy: text.shop.categories.toy,
      accessory: text.shop.categories.accessory,
      treat: text.shop.categories.treat,
      pet: text.shop.categories.pet,
    };
    const tabs: readonly ShopTab[] = [...ITEM_CATEGORIES, 'pet'];

    tabs.forEach((category, index) => {
      const button = new Button(this, {
        x: 230 + index * 205,
        y: 174,
        label: labels[category],
        width: 190,
        height: 68,
        fontSize: 23,
        color: category === this.category ? COLORS.primary : COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.selectCategory(category),
      });
      this.categoryButtons.set(category, button);
    });
  }

  private selectCategory(category: ShopTab): void {
    if (this.dialog || this.category === category) {
      return;
    }
    this.category = category;
    this.page = 0;
    for (const [id, button] of this.categoryButtons) {
      button.setColor(id === category ? COLORS.primary : COLORS.panelLight);
    }
    this.refreshGrid();
  }

  private refreshGrid(): void {
    this.grid?.destroy(true);
    this.grid = this.add.container(0, 0);
    this.updateHearts();

    if (this.category === 'pet') {
      this.renderPetCards();
      return;
    }

    const category = this.category;
    const items = itemsByCategory(category);
    const purchased = categoryPurchaseCount(save.purchases, category);
    const pageSize = COLUMN_X.length * ROW_Y.length;
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    this.page = Math.min(this.page, pages - 1);
    const visible = items.slice(this.page * pageSize, (this.page + 1) * pageSize);

    visible.forEach((item, index) => {
      const column = index % COLUMN_X.length;
      const row = Math.floor(index / COLUMN_X.length);
      const unlocked = isItemUnlocked(item, purchased);
      const card = new ItemCard(this, {
        x: COLUMN_X[column],
        y: ROW_Y[row] ?? ROW_Y[ROW_Y.length - 1],
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        item,
        owned: itemCount(save, item.id),
        affordable: canAfford(save, item.price),
        locked: !unlocked,
        lockLabel: unlocked
          ? undefined
          : text.shop.locked(item.requiredPurchases - purchased, text.shop.categories[category]),
        onClick: (selected) => this.askToBuy(selected),
      });
      this.grid?.add(card);
    });

    this.renderPageControls(pages);
  }

  private renderPetCards(): void {
    const pageSize = COLUMN_X.length * ROW_Y.length;
    const pages = Math.max(1, Math.ceil(PETS.length / pageSize));
    this.page = Math.min(this.page, pages - 1);
    const visible = PETS.slice(this.page * pageSize, (this.page + 1) * pageSize);

    visible.forEach((pet, index) => {
      const column = index % COLUMN_X.length;
      const row = Math.floor(index / COLUMN_X.length);
      const owned = save.pets.filter((entry) => entry.id === pet.id).length;
      const card = new PetCard(this, {
        x: COLUMN_X[column],
        y: ROW_Y[row] ?? ROW_Y[ROW_Y.length - 1],
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pet,
        price: pet.adoptionPrice,
        owned,
        affordable: canAfford(save, pet.adoptionPrice),
        onClick: (selected) => this.askToBuyEgg(selected),
      });
      this.grid?.add(card);
    });

    this.renderPageControls(pages);
  }

  private renderPageControls(pages: number): void {
    if (pages <= 1 || !this.grid) {
      return;
    }

    const previous = new Button(this, {
      x: 42,
      y: 462,
      label: '<',
      width: 60,
      height: 64,
      fontSize: 26,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => {
        this.page = (this.page + pages - 1) % pages;
        this.refreshGrid();
      },
    });
    const next = new Button(this, {
      x: GAME_WIDTH - 42,
      y: 462,
      label: '>',
      width: 60,
      height: 64,
      fontSize: 26,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => {
        this.page = (this.page + 1) % pages;
        this.refreshGrid();
      },
    });
    const label = this.add
      .text(GAME_WIDTH / 2, 212, `${this.page + 1} / ${pages}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.grid.add([previous, next, label]);
  }

  private askToBuy(item: ItemDefinition): void {
    if (this.dialog) {
      return;
    }

    const purchased = categoryPurchaseCount(save.purchases, item.category);
    if (!isItemUnlocked(item, purchased)) {
      audio.play('error');
      this.showToast(
        text.shop.locked(item.requiredPurchases - purchased, text.shop.categories[item.category]),
      );
      return;
    }

    if (!canAfford(save, item.price)) {
      audio.play('error');
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
      audio.play('error');
      this.showToast(text.shop.notEnough(item.price - result.hearts));
      return;
    }

    audio.play('unlock');
    if (item.category === 'accessory' && save.pet) {
      save.setPetAccessory(item.id);
    }
    this.updateHearts();
    this.refreshGrid();
    this.showToast(
      item.category === 'accessory' && save.pet
        ? text.shop.boughtAndWorn(item.label)
        : text.shop.bought(item.label),
    );
  }

  private askToBuyEgg(pet: PetDefinition): void {
    if (this.dialog) {
      return;
    }

    if (!canAfford(save, pet.adoptionPrice)) {
      audio.play('error');
      this.showToast(text.shop.notEnough(pet.adoptionPrice - save.hearts));
      return;
    }

    this.dialog = new ConfirmDialog(this, {
      title: text.shop.adoptTitle(pet.label),
      body: text.shop.adoptBody(pet.adoptionPrice),
      confirmLabel: text.shop.adopt,
      cancelLabel: text.shop.cancel,
      onConfirm: () => {
        this.dialog = undefined;
        this.buyEgg(pet);
      },
      onCancel: () => {
        this.dialog = undefined;
      },
    });
  }

  private buyEgg(pet: PetDefinition): void {
    this.scene.start(SCENE_KEYS.HATCH, {
      petId: pet.id,
      price: pet.adoptionPrice,
      origin: 'shop',
    });
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

    if (isReducedMotion()) {
      toast.setAlpha(1).setY(224);
      this.time.delayedCall(1600, () => toast.destroy());
      return;
    }
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
