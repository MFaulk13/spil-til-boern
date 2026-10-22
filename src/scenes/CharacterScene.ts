import Phaser from 'phaser';
import {
  ACCESSORY_STYLES,
  APPEARANCE_CATEGORIES,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SKIN_TONES,
  type AppearanceCategory,
  type ColorOption,
  type StyleOption,
} from '@/game/catalog/appearance';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import type { CharacterLook } from '@/game/types';
import { normalizeLook, randomizeLook } from '@/systems/appearance';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { CharacterView } from '@/ui/CharacterView';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const PREVIEW = { x: 330, groundY: 640, size: 330 } as const;
const PANEL = { x: 52, y: 132, width: 556, height: 536 } as const;
const TAB_X = [700, 790, 880, 970, 1060, 1150] as const;
const OPTION_X = [760, 890, 1020, 1150] as const;
const OPTION_Y = [326, 476] as const;
const TILE_SIZE = 116;

interface StyleTileOptions {
  x: number;
  y: number;
  label: string;
  selected: boolean;
  imageKey?: string;
  tint?: number;
  none?: boolean;
  onSelect: () => void;
}

export class CharacterScene extends Phaser.Scene {
  private look: CharacterLook = normalizeLook(undefined);
  private category: AppearanceCategory = 'skin';
  private preview!: CharacterView;
  private optionLayer!: Phaser.GameObjects.Container;
  private readonly tabs = new Map<AppearanceCategory, Button>();

  constructor() {
    super(SCENE_KEYS.CHARACTER);
  }

  create(): void {
    drawBackdrop(this);
    this.look = normalizeLook(save.playerLook ?? undefined);
    this.category = 'skin';

    this.createPreview();
    this.createTitle();
    this.createTabs();
    this.createFooter();

    this.optionLayer = this.add.container(0, 0).setDepth(5);
    this.renderOptions();

    this.input.keyboard?.on('keydown-ENTER', () => this.goNext());
    this.input.keyboard?.on('keydown-R', () => this.randomize());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENE_KEYS.MENU));
    APPEARANCE_CATEGORIES.forEach((category, index) => {
      this.input.keyboard?.on(
        `keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][index]}`,
        () => this.setCategory(category),
      );
    });
  }

  private createTitle(): void {
    this.add
      .text(64, 52, text.appearance.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '56px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(66, 102, text.appearance.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    new Button(this, {
      x: GAME_WIDTH - 118,
      y: 70,
      label: text.back,
      width: 170,
      height: 64,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.scene.start(SCENE_KEYS.MENU),
    });
  }

  private createPreview(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.82);
    panel.fillRoundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 38);
    panel.lineStyle(5, COLORS.accent, 0.8);
    panel.strokeRoundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 38);

    this.add.ellipse(PREVIEW.x, PREVIEW.groundY - 2, 330, 54, COLORS.lavender, 0.55);
    this.add
      .image(PREVIEW.x - 222, 250, 'icon-star')
      .setDisplaySize(44, 44)
      .setAlpha(0.55)
      .setAngle(-16);
    this.add
      .image(PREVIEW.x + 216, 210, 'icon-heart')
      .setDisplaySize(40, 40)
      .setAlpha(0.5)
      .setAngle(12);

    this.preview = new CharacterView(this, PREVIEW.x, PREVIEW.groundY, PREVIEW.size, this.look);
    this.preview.startIdle();
  }

  private createTabs(): void {
    APPEARANCE_CATEGORIES.forEach((category, index) => {
      const button = new Button(this, {
        x: TAB_X[index],
        y: 178,
        label: text.appearance.categories[category],
        width: 82,
        height: 64,
        fontSize: 17,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.setCategory(category),
      });
      this.tabs.set(category, button);
    });
    this.refreshTabs();
  }

  private refreshTabs(): void {
    for (const [category, button] of this.tabs) {
      button.setColor(category === this.category ? COLORS.accent : COLORS.panelLight);
    }
  }

  private setCategory(category: AppearanceCategory): void {
    if (this.category === category) {
      return;
    }
    this.category = category;
    this.refreshTabs();
    this.renderOptions();
  }

  private renderOptions(): void {
    this.optionLayer.removeAll(true);

    if (this.category === 'skin') {
      this.renderColorOptions(SKIN_TONES, this.look.skin, (option) => {
        this.updateLook({ skin: option.id });
      });
      return;
    }

    if (this.category === 'hair') {
      this.renderStyleOptions(HAIR_STYLES, this.look.hair, (option) =>
        this.updateLook({ hair: option.id }),
      );
      this.renderColorPalette(
        HAIR_COLORS,
        this.look.hairColor,
        text.appearance.hairColor,
        (option) => this.updateLook({ hairColor: option.id }),
      );
      return;
    }

    if (this.category === 'eyes') {
      this.renderStyleOptions(EYE_STYLES, this.look.eyes, (option) =>
        this.updateLook({ eyes: option.id }),
      );
      return;
    }

    if (this.category === 'mouth') {
      this.renderStyleOptions(MOUTH_STYLES, this.look.mouth, (option) =>
        this.updateLook({ mouth: option.id }),
      );
      return;
    }

    if (this.category === 'outfit') {
      this.renderStyleOptions(OUTFIT_STYLES, this.look.outfit, (option) =>
        this.updateLook({ outfit: option.id }),
      );
      this.renderColorPalette(
        OUTFIT_COLORS,
        this.look.outfitColor,
        text.appearance.outfitColor,
        (option) => this.updateLook({ outfitColor: option.id }),
      );
      return;
    }

    this.renderStyleOptions(ACCESSORY_STYLES, this.look.accessory ?? 'none', (option) =>
      this.updateLook({ accessory: option.id === 'none' ? null : option.id }),
    );
  }

  private renderStyleOptions(
    options: readonly StyleOption[],
    selectedId: string,
    onSelect: (option: StyleOption) => void,
  ): void {
    options.forEach((option, index) => {
      const x = OPTION_X[index % OPTION_X.length];
      const y = OPTION_Y[Math.floor(index / 3)];
      const isNone = option.id === 'none';
      let tint: number | undefined;
      if (this.category === 'hair') {
        tint = HAIR_COLORS.find((color) => color.id === this.look.hairColor)?.color;
      } else if (this.category === 'outfit') {
        tint = OUTFIT_COLORS.find((color) => color.id === this.look.outfitColor)?.color;
      }

      const tile = this.createStyleTile({
        x,
        y,
        label: option.label,
        selected: option.id === selectedId,
        imageKey: isNone ? undefined : option.assetKey,
        tint,
        none: isNone,
        onSelect: () => onSelect(option),
      });
      this.optionLayer.add(tile);
    });
  }

  private createStyleTile(options: StyleTileOptions): Phaser.GameObjects.Container {
    const tile = this.add.container(options.x, options.y);
    tile.setSize(TILE_SIZE, TILE_SIZE);
    tile.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, TILE_SIZE, TILE_SIZE),
      Phaser.Geom.Rectangle.Contains,
    );

    const background = this.add.graphics();
    background.fillStyle(
      options.selected ? COLORS.accent : COLORS.panel,
      options.selected ? 0.35 : 1,
    );
    background.fillRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 28);
    background.lineStyle(
      options.selected ? 6 : 4,
      options.selected ? COLORS.accentDark : COLORS.panelLight,
      1,
    );
    background.strokeRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 28);

    tile.add(background);

    if (options.none) {
      tile.add(
        this.add
          .text(0, -14, '–', {
            fontFamily: FONT_FAMILY,
            fontSize: '54px',
            color: COLORS.textMuted,
          })
          .setOrigin(0.5),
      );
    } else if (options.imageKey && this.textures.exists(options.imageKey)) {
      const image = this.add.image(0, -14, options.imageKey).setDisplaySize(74, 74);
      if (options.tint !== undefined) {
        image.setTint(options.tint);
      }
      tile.add(image);
    }

    tile.add(
      this.add
        .text(0, 47, options.label, {
          fontFamily: FONT_FAMILY,
          fontSize: '14px',
          color: COLORS.text,
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: TILE_SIZE - 12 },
        })
        .setOrigin(0.5),
    );

    tile.on('pointerdown', () => {
      options.onSelect();
    });

    return tile;
  }

  private renderColorOptions(
    options: readonly ColorOption[],
    selectedId: string,
    onSelect: (option: ColorOption) => void,
  ): void {
    options.forEach((option, index) => {
      const x = OPTION_X[index % OPTION_X.length];
      const y = OPTION_Y[Math.floor(index / 3)];
      this.optionLayer.add(this.createColorTile(x, y, option, option.id === selectedId, onSelect));
    });
  }

  private createColorTile(
    x: number,
    y: number,
    option: ColorOption,
    selected: boolean,
    onSelect: (option: ColorOption) => void,
  ): Phaser.GameObjects.Container {
    const tile = this.add.container(x, y);
    tile.setSize(TILE_SIZE, TILE_SIZE);
    tile.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, TILE_SIZE, TILE_SIZE),
      Phaser.Geom.Rectangle.Contains,
    );

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 1);
    background.fillRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 28);
    background.lineStyle(selected ? 6 : 4, selected ? COLORS.accentDark : COLORS.panelLight, 1);
    background.strokeRoundedRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 28);

    const circle = this.add.circle(0, -18, 40, option.color);
    circle.setStrokeStyle(4, COLORS.ink, 0.35);

    tile.add([
      background,
      circle,
      this.add
        .text(0, 50, option.label, {
          fontFamily: FONT_FAMILY,
          fontSize: '17px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    ]);

    tile.on('pointerdown', () => {
      onSelect(option);
    });

    return tile;
  }

  private renderColorPalette(
    colors: readonly ColorOption[],
    selectedId: string,
    label: string,
    onSelect: (option: ColorOption) => void,
  ): void {
    this.optionLayer.add(
      this.add
        .text(700, 562, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '22px',
          color: COLORS.textMuted,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5),
    );

    colors.forEach((color, index) => {
      const x = 770 + index * 62;
      const selected = color.id === selectedId;
      const circle = this.add
        .circle(x, 608, 25, color.color)
        .setStrokeStyle(selected ? 6 : 3, selected ? COLORS.ink : COLORS.panel, 1)
        .setInteractive();

      circle.on('pointerdown', () => {
        onSelect(color);
      });

      this.optionLayer.add(circle);
    });
  }

  private updateLook(patch: Partial<CharacterLook>): void {
    this.look = { ...this.look, ...patch };
    this.preview.setLook(this.look);
    this.renderOptions();
  }

  private randomize(): void {
    this.look = randomizeLook();
    this.preview.setLook(this.look);
    this.renderOptions();
  }

  private createFooter(): void {
    new Button(this, {
      x: 770,
      y: 680,
      label: text.random,
      width: 230,
      height: 68,
      fontSize: 24,
      color: COLORS.teal,
      onClick: () => this.randomize(),
    });

    new Button(this, {
      x: 1110,
      y: 680,
      label: text.next,
      width: 250,
      height: 68,
      fontSize: 28,
      color: COLORS.primary,
      onClick: () => this.goNext(),
    });
  }

  private goNext(): void {
    save.setPlayerLook(this.preview.currentLook);
    this.scene.start(SCENE_KEYS.PET_SELECT);
  }
}
