import Phaser from 'phaser';
import { getPet } from '@/game/catalog/pets';
import { text } from '@/game/text';
import type { PetState } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 600;
const CARD_WIDTH = 264;
const CARD_HEIGHT = 118;
const PAGE_SIZE = 9;
const COLUMNS = [-288, 0, 288];
const ROWS = [-138, -8, 122];

export class PetPanel extends Phaser.GameObjects.Container {
  private readonly pets: readonly PetState[];
  private readonly activeUid: string | null;
  private readonly onSelect: (uid: string) => void;
  private readonly content: Phaser.GameObjects.Container;
  private page = 0;

  constructor(
    scene: Phaser.Scene,
    pets: readonly PetState[],
    activeUid: string | null,
    onSelect: (uid: string) => void,
    onClose: () => void,
    onShop: () => void,
  ) {
    super(scene, 640, 360);
    this.pets = pets;
    this.activeUid = activeUid;
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
      .text(0, -PANEL_HEIGHT / 2 + 46, text.petsPanel.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '38px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 84, text.petsPanel.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.content = scene.add.container(0, 0);

    const shop = new Button(scene, {
      x: -160,
      y: PANEL_HEIGHT / 2 - 56,
      label: text.petsPanel.shop,
      iconKey: 'icon-shop',
      iconSize: 26,
      width: 280,
      height: 72,
      fontSize: 24,
      color: COLORS.teal,
      textColor: COLORS.text,
      onClick: onShop,
    });

    const close = new Button(scene, {
      x: 160,
      y: PANEL_HEIGHT / 2 - 56,
      label: text.petsPanel.close,
      width: 240,
      height: 72,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: onClose,
    });

    this.add([backdrop, panel, blocker, title, subtitle, this.content, shop, close]);
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
    const pages = Math.max(1, Math.ceil(this.pets.length / PAGE_SIZE));
    this.page = Math.min(this.page, pages - 1);
    const visible = this.pets.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);

    if (this.pets.length === 0) {
      this.content.add(
        this.scene.add
          .text(0, -20, text.petsPanel.empty, {
            fontFamily: FONT_FAMILY,
            fontSize: '24px',
            color: COLORS.textMuted,
          })
          .setOrigin(0.5),
      );
      return;
    }

    visible.forEach((pet, index) => {
      const x = COLUMNS[index % 3];
      const y = ROWS[Math.floor(index / 3)];
      this.content.add(this.createCard(pet, x, y));
    });

    if (pages > 1) {
      const previous = new Button(this.scene, {
        x: -PANEL_WIDTH / 2 + 82,
        y: PANEL_HEIGHT / 2 - 56,
        label: '<',
        width: 64,
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
        x: PANEL_WIDTH / 2 - 82,
        y: PANEL_HEIGHT / 2 - 56,
        label: '>',
        width: 64,
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
        .text(0, PANEL_HEIGHT / 2 - 56, `${this.page + 1} / ${pages}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);
      this.content.add([previous, next, pageText]);
    }
  }

  private createCard(pet: PetState, x: number, y: number): Phaser.GameObjects.Container {
    const active = pet.uid === this.activeUid;
    const definition = getPet(pet.id);
    const card = this.scene.add.container(x, y);
    card.setSize(CARD_WIDTH, CARD_HEIGHT);
    card.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    const background = this.scene.add.graphics();
    background.fillStyle(active ? COLORS.accent : COLORS.panelLight, active ? 0.3 : 1);
    background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 24);
    background.lineStyle(active ? 6 : 3, active ? COLORS.accentDark : COLORS.panel, 1);
    background.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 24);

    const image = this.scene.textures.exists(definition.assetKey)
      ? this.scene.add.image(-74, 2, definition.assetKey).setDisplaySize(100, 100)
      : this.scene.add.image(-74, 2, 'icon-paw').setDisplaySize(70, 70);

    const name = this.scene.add
      .text(-14, -18, pet.name, {
        fontFamily: FONT_FAMILY,
        fontSize: '25px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const species = this.scene.add
      .text(-14, 18, definition.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    const status = this.scene.add
      .text(CARD_WIDTH / 2 - 18, -CARD_HEIGHT / 2 + 20, active ? text.petsPanel.active : '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    card.add([background, image, name, species, status]);
    card.on('pointerup', () => {
      if (!active) {
        this.onSelect(pet.uid);
      }
    });

    return card;
  }
}
