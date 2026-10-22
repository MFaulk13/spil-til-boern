import Phaser from 'phaser';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

interface LearningCard {
  title: string;
  hint: string;
  icon: string;
  color: number;
  mode: 'math' | 'reading';
  x: number;
}

const CARDS: readonly LearningCard[] = [
  {
    title: text.school.math,
    hint: text.school.mathHint,
    icon: 'icon-math',
    color: COLORS.teal,
    mode: 'math',
    x: 420,
  },
  {
    title: text.school.reading,
    hint: text.school.readingHint,
    icon: 'icon-book',
    color: COLORS.lavender,
    mode: 'reading',
    x: 860,
  },
];

export class SchoolScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super(SCENE_KEYS.SCHOOL);
  }

  create(): void {
    this.starting = false;
    drawBackdrop(this);
    this.createHeader();
    this.createHeartPill();

    for (const card of CARDS) {
      this.createCard(card);
    }

    this.add
      .text(GAME_WIDTH / 2, 636, text.school.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ONE', () => this.startQuiz('math'));
    this.input.keyboard?.on('keydown-TWO', () => this.startQuiz('reading'));
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.cameras.main.fadeIn(240, 255, 246, 229);
  }

  private createHeader(): void {
    new Button(this, {
      x: 96,
      y: 58,
      label: text.school.back,
      width: 170,
      height: 70,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.goBack(),
    });

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.94);
    panel.fillRoundedRect(420, 14, 440, 96, 28);
    panel.lineStyle(5, COLORS.accent, 0.6);
    panel.strokeRoundedRect(420, 14, 440, 96, 28);

    this.add
      .text(GAME_WIDTH / 2, 50, text.school.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 88, text.school.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
  }

  private createHeartPill(): void {
    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.95);
    background.fillRoundedRect(1046, 24, 204, 66, 24);
    background.lineStyle(4, COLORS.accent, 0.6);
    background.strokeRoundedRect(1046, 24, 204, 66, 24);

    this.add.image(1080, 57, 'icon-heart').setDisplaySize(38, 38);
    this.add
      .text(1106, 57, String(save.hearts), {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
  }

  private createCard(card: LearningCard): void {
    const width = 360;
    const height = 360;
    const container = this.add.container(card.x, 380);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.97);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 34);
    background.lineStyle(6, card.color, 0.95);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 34);
    background.fillStyle(card.color, 0.2);
    background.fillRoundedRect(-width / 2 + 16, -height / 2 + 16, width - 32, 158, 26);

    const icon = this.add.image(0, -86, card.icon).setDisplaySize(92, 92);
    const title = this.add
      .text(0, 18, card.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '36px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 70, card.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        color: COLORS.textMuted,
        align: 'center',
        wordWrap: { width: width - 50 },
      })
      .setOrigin(0.5);

    const play = new Button(this, {
      x: 0,
      y: height / 2 - 44,
      label: text.start,
      width: 200,
      height: 64,
      fontSize: 26,
      color: card.color,
      textColor: COLORS.text,
      onClick: () => this.startQuiz(card.mode),
    });

    container.add([background, icon, title, hint, play]);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerup', () => this.startQuiz(card.mode));
    container.setDepth(20);

    if (!isReducedMotion()) {
      this.tweens.add({
        targets: container,
        y: 374,
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private startQuiz(mode: 'math' | 'reading'): void {
    if (this.starting) {
      return;
    }
    this.starting = true;
    audio.play('click');
    this.scene.start(SCENE_KEYS.QUIZ, { mode });
  }

  private goBack(): void {
    this.cameras.main.fadeOut(200, 255, 246, 229);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TOWN);
    });
  }
}
