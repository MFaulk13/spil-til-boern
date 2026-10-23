import Phaser from 'phaser';
import { getPet } from '@/game/catalog/pets';
import { getQuizSubjectInfo } from '@/game/catalog/quiz';
import { TALENTS, type TalentDefinition, type TalentId } from '@/game/catalog/talents';
import { text } from '@/game/text';
import type { PetState } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY, SUBJECT_COLORS } from '@/ui/theme';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 600;
const CARD_WIDTH = 264;
const CARD_HEIGHT = 108;
const PAGE_SIZE = 9;
const COLUMNS = [-288, 0, 288];
const ROWS = [-91, 30, 151];
const TALENT_COLUMNS = [-315, -105, 105, 315];
const TALENT_ROWS = [-50, 82];
const TALENT_CARD_WIDTH = 196;
const TALENT_CARD_HEIGHT = 112;

export type PetPanelMode = 'pets' | 'talents';

export class PetPanel extends Phaser.GameObjects.Container {
  private readonly pets: readonly PetState[];
  private readonly activeUid: string | null;
  private readonly unlockedTalentIds: ReadonlySet<TalentId>;
  private readonly onSelect: (uid: string) => void;
  private readonly onTalent: (talent: TalentDefinition) => void;
  private readonly content: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly subtitleText: Phaser.GameObjects.Text;
  private readonly petsTab: Button;
  private readonly talentsTab: Button;
  private mode: PetPanelMode;
  private page = 0;

  constructor(
    scene: Phaser.Scene,
    pets: readonly PetState[],
    activeUid: string | null,
    unlockedTalentIds: ReadonlySet<TalentId>,
    onSelect: (uid: string) => void,
    onTalent: (talent: TalentDefinition) => void,
    onClose: () => void,
    onShop: () => void,
    initialMode: PetPanelMode = 'pets',
  ) {
    super(scene, 640, 360);
    this.pets = pets;
    this.activeUid = activeUid;
    this.unlockedTalentIds = unlockedTalentIds;
    this.onSelect = onSelect;
    this.onTalent = onTalent;
    this.mode = initialMode;

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

    this.titleText = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 42, text.petsPanel.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '36px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.subtitleText = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 78, text.petsPanel.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.petsTab = new Button(scene, {
      x: -105,
      y: -PANEL_HEIGHT / 2 + 120,
      label: text.petsPanel.petsTab,
      width: 180,
      height: 56,
      fontSize: 21,
      color: COLORS.accent,
      textColor: COLORS.text,
      onClick: () => this.setMode('pets'),
    });

    this.talentsTab = new Button(scene, {
      x: 105,
      y: -PANEL_HEIGHT / 2 + 120,
      label: text.petsPanel.talentsTab,
      width: 180,
      height: 56,
      fontSize: 21,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.setMode('talents'),
    });

    this.content = scene.add.container(0, 0);

    const shop = new Button(scene, {
      x: -160,
      y: PANEL_HEIGHT / 2 - 50,
      label: text.petsPanel.shop,
      iconKey: 'icon-shop',
      iconSize: 26,
      width: 290,
      height: 80,
      fontSize: 25,
      color: COLORS.teal,
      textColor: COLORS.text,
      onClick: onShop,
    });

    const close = new Button(scene, {
      x: 160,
      y: PANEL_HEIGHT / 2 - 50,
      label: text.petsPanel.close,
      width: 250,
      height: 80,
      fontSize: 25,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: onClose,
    });

    this.add([
      backdrop,
      panel,
      blocker,
      this.titleText,
      this.subtitleText,
      this.petsTab,
      this.talentsTab,
      this.content,
      shop,
      close,
    ]);
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

  private setMode(mode: PetPanelMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.page = 0;
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    const showingTalents = this.mode === 'talents';
    this.titleText.setText(showingTalents ? text.petsPanel.talentsTitle : text.petsPanel.title);
    this.subtitleText.setText(
      showingTalents ? text.petsPanel.talentsSubtitle : text.petsPanel.subtitle,
    );
    this.petsTab.setColor(showingTalents ? COLORS.panelLight : COLORS.accent);
    this.talentsTab.setColor(showingTalents ? COLORS.accent : COLORS.panelLight);

    if (showingTalents) {
      this.renderTalents();
      return;
    }

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
        width: 72,
        height: 72,
        fontSize: 28,
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
        width: 72,
        height: 72,
        fontSize: 28,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => {
          this.page = (this.page + 1) % pages;
          this.render();
        },
      });
      const pageText = this.scene.add
        .text(0, PANEL_HEIGHT / 2 - 50, `${this.page + 1} / ${pages}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);
      this.content.add([previous, next, pageText]);
    }
  }

  private renderTalents(): void {
    TALENTS.forEach((talent, index) => {
      const x = TALENT_COLUMNS[index % 4];
      const y = TALENT_ROWS[Math.floor(index / 4)];
      this.content.add(this.createTalentCard(talent, x, y));
    });

    if (this.unlockedTalentIds.size === 0) {
      const hint = this.scene.add
        .text(0, 178, text.petsPanel.talentEmpty, {
          fontFamily: FONT_FAMILY,
          fontSize: '17px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);
      this.content.add(hint);
    }
  }

  private createCard(pet: PetState, x: number, y: number): Phaser.GameObjects.Container {
    const active = pet.uid === this.activeUid;
    const definition = getPet(pet.id);
    const card = this.scene.add.container(x, y);
    card.setSize(CARD_WIDTH, CARD_HEIGHT);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT),
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
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    const status = this.scene.add
      .text(CARD_WIDTH / 2 - 18, -CARD_HEIGHT / 2 + 20, active ? text.petsPanel.active : '', {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
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

  private createTalentCard(
    talent: TalentDefinition,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const unlocked = this.unlockedTalentIds.has(talent.id);
    const color = SUBJECT_COLORS[talent.subject];
    const info = getQuizSubjectInfo(talent.subject);
    const card = this.scene.add.container(x, y);
    card.setSize(TALENT_CARD_WIDTH, TALENT_CARD_HEIGHT);
    card.setInteractive(
      new Phaser.Geom.Rectangle(
        -TALENT_CARD_WIDTH / 2,
        -TALENT_CARD_HEIGHT / 2,
        TALENT_CARD_WIDTH,
        TALENT_CARD_HEIGHT,
      ),
      Phaser.Geom.Rectangle.Contains,
    );

    const background = this.scene.add.graphics();
    background.fillStyle(unlocked ? COLORS.panelLight : 0xe9e1d8, unlocked ? 0.98 : 0.9);
    background.fillRoundedRect(
      -TALENT_CARD_WIDTH / 2,
      -TALENT_CARD_HEIGHT / 2,
      TALENT_CARD_WIDTH,
      TALENT_CARD_HEIGHT,
      20,
    );
    background.lineStyle(4, unlocked ? color : 0xb9aea5, unlocked ? 0.95 : 0.5);
    background.strokeRoundedRect(
      -TALENT_CARD_WIDTH / 2,
      -TALENT_CARD_HEIGHT / 2,
      TALENT_CARD_WIDTH,
      TALENT_CARD_HEIGHT,
      20,
    );

    const icon = this.scene.add
      .image(-68, -16, talent.icon)
      .setDisplaySize(40, 40)
      .setAlpha(unlocked ? 1 : 0.45);
    const label = this.scene.add
      .text(-40, -24, text.talents[talent.id].label, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: unlocked ? COLORS.text : COLORS.textMuted,
        fontStyle: 'bold',
        wordWrap: { width: 142 },
        lineSpacing: 1,
      })
      .setOrigin(0, 0.5);
    const subject = this.scene.add
      .text(-40, 6, info.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    card.add([background, icon, label, subject]);

    if (unlocked) {
      const use = this.scene.add
        .text(0, 32, text.petsPanel.talentUse, {
          fontFamily: FONT_FAMILY,
          fontSize: '15px',
          color: COLORS.textAccent,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      card.add(use);
    } else {
      const lockedLabel = this.scene.add
        .text(0, 32, text.petsPanel.talentLocked, {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);
      card.add(lockedLabel);
    }

    if (unlocked) {
      card.on('pointerup', () => this.onTalent(talent));
    }

    return card;
  }
}
