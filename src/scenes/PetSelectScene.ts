import Phaser from 'phaser';
import { PETS, type PetDefinition } from '@/game/catalog/pets';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import type { PetId } from '@/game/types';
import { audio } from '@/systems/audio';
import { currentSeasonTheme } from '@/systems/season';
import { Button } from '@/ui/Button';
import { EggView } from '@/ui/EggView';
import { applySeasonTheme } from '@/ui/SeasonDecor';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const CARD_WIDTH = 320;
const CARD_HEIGHT = 132;
const COLUMN_X = [270, 640, 1010] as const;
const ROW_Y = [252, 394, 536] as const;
const PAGE_SIZE = COLUMN_X.length * ROW_Y.length;

interface EggCard {
  pet: PetDefinition;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  check: Phaser.GameObjects.Image;
  egg: EggView;
}

export class PetSelectScene extends Phaser.Scene {
  private selected: PetId | null = null;
  private selectionIndex = -1;
  private page = 0;
  private cardLayer?: Phaser.GameObjects.Container;
  private previousButton?: Button;
  private nextButton?: Button;
  private pageText?: Phaser.GameObjects.Text;
  private readonly cards = new Map<PetId, EggCard>();
  private confirmButton?: Button;

  constructor() {
    super(SCENE_KEYS.PET_SELECT);
  }

  create(): void {
    this.selected = null;
    this.selectionIndex = -1;
    this.page = 0;
    this.cards.clear();
    this.cardLayer = undefined;
    this.previousButton = undefined;
    this.nextButton = undefined;
    this.pageText = undefined;
    const theme = currentSeasonTheme();
    drawBackdrop(this, theme);
    applySeasonTheme(this, theme, 'menu');

    this.add
      .text(64, 58, text.pets.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '56px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(66, 110, text.pets.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    new Button(this, {
      x: GAME_WIDTH - 118,
      y: 70,
      label: text.back,
      width: 176,
      height: 72,
      fontSize: 25,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.scene.start(SCENE_KEYS.CHARACTER),
    });

    this.renderPage();

    this.confirmButton = new Button(this, {
      x: GAME_WIDTH / 2,
      y: 672,
      label: text.pets.choose,
      width: 330,
      height: 84,
      fontSize: 31,
      color: COLORS.primary,
      onClick: () => this.confirmSelection(),
    });
    this.confirmButton.setEnabled(false);

    this.add
      .text(GAME_WIDTH / 2, 616, text.pets.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.selected) {
        this.confirmSelection();
        return;
      }
      this.selectIndex(0);
    });
    this.input.keyboard?.on('keydown-LEFT', () => this.moveSelection(-1, 0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.moveSelection(1, 0));
    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(0, -1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(0, 1));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENE_KEYS.CHARACTER));
  }

  private pagePets(): readonly PetDefinition[] {
    const start = this.page * PAGE_SIZE;
    return PETS.slice(start, start + PAGE_SIZE);
  }

  private pageCount(): number {
    return Math.max(1, Math.ceil(PETS.length / PAGE_SIZE));
  }

  private renderPage(): void {
    this.cardLayer?.destroy(true);
    this.cards.clear();
    this.cardLayer = this.add.container(0, 0);

    this.pagePets().forEach((pet, index) => {
      const x = COLUMN_X[index % COLUMN_X.length];
      const y = ROW_Y[Math.floor(index / COLUMN_X.length)];
      this.createEggCard(pet, x, y);
    });

    this.updatePageControls();

    if (this.selected) {
      const card = this.cards.get(this.selected);
      if (card) {
        this.drawCard(card, true);
        card.container.setScale(1.04);
      }
    }
  }

  private updatePageControls(): void {
    this.previousButton?.destroy();
    this.nextButton?.destroy();
    this.pageText?.destroy();
    this.previousButton = undefined;
    this.nextButton = undefined;
    this.pageText = undefined;

    const pages = this.pageCount();
    if (pages <= 1) {
      return;
    }

    this.previousButton = new Button(this, {
      x: 420,
      y: 672,
      label: '<',
      width: 72,
      height: 72,
      fontSize: 28,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.changePage(-1),
    });
    this.nextButton = new Button(this, {
      x: 860,
      y: 672,
      label: '>',
      width: 72,
      height: 72,
      fontSize: 28,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.changePage(1),
    });
    this.pageText = this.add
      .text(GAME_WIDTH - 118, 120, `${this.page + 1} / ${pages}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private changePage(delta: number): void {
    const pages = this.pageCount();
    this.page = (this.page + delta + pages) % pages;
    this.selectionIndex = -1;
    audio.play('pop');
    this.renderPage();
  }

  private createEggCard(pet: PetDefinition, x: number, y: number): void {
    const container = this.add.container(x, y);
    container.setSize(CARD_WIDTH, CARD_HEIGHT);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );

    const background = this.add.graphics();
    const egg = new EggView(this, -112, 56, pet, 0.5);
    const name = this.add
      .text(16, 0, pet.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const check = this.add
      .image(CARD_WIDTH / 2 - 28, -CARD_HEIGHT / 2 + 28, 'icon-check')
      .setDisplaySize(34, 34)
      .setVisible(false);

    container.add([background, egg, name, check]);
    container.on('pointerdown', () => this.select(pet.id));
    this.cardLayer?.add(container);

    const card: EggCard = { pet, container, background, check, egg };
    this.cards.set(pet.id, card);
    this.drawCard(card, false);
  }

  private moveSelection(deltaColumn: number, deltaRow: number): void {
    const pets = this.pagePets();
    const current = this.selectionIndex >= 0 ? this.selectionIndex : 0;
    const maxRow = Math.max(0, Math.ceil(pets.length / COLUMN_X.length) - 1);
    const column = Phaser.Math.Clamp((current % COLUMN_X.length) + deltaColumn, 0, 2);
    const row = Phaser.Math.Clamp(Math.floor(current / COLUMN_X.length) + deltaRow, 0, maxRow);
    const index = row * COLUMN_X.length + column;
    if (index < pets.length) {
      this.selectIndex(index);
    }
  }

  private selectIndex(index: number): void {
    const pet = this.pagePets()[index];
    if (!pet) {
      return;
    }
    this.selectionIndex = index;
    this.select(pet.id);
  }

  private select(petId: PetId): void {
    this.selected = petId;
    this.selectionIndex = this.pagePets().findIndex((pet) => pet.id === petId);
    audio.play('pop');
    for (const card of this.cards.values()) {
      const selected = card.pet.id === petId;
      this.drawCard(card, selected);
      card.container.setScale(selected ? 1.04 : 1);
    }
    this.cards.get(petId)?.egg.wobble();
    this.confirmButton?.setEnabled(true);
  }

  private drawCard(card: EggCard, selected: boolean): void {
    card.background.clear();
    card.background.fillStyle(selected ? COLORS.accent : COLORS.panel, selected ? 0.3 : 1);
    card.background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 28);
    card.background.lineStyle(
      selected ? 6 : 4,
      selected ? COLORS.accentDark : COLORS.panelLight,
      1,
    );
    card.background.strokeRoundedRect(
      -CARD_WIDTH / 2,
      -CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
      28,
    );
    card.check.setVisible(selected);
  }

  private confirmSelection(): void {
    if (!this.selected) {
      return;
    }
    this.scene.start(SCENE_KEYS.HATCH, { petId: this.selected });
  }
}
