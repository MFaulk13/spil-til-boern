import Phaser from 'phaser';
import { loadMissingAssets } from '@/game/assets';
import { QUIZ_SUBJECT_INFO, type QuizSubject, type QuizSubjectInfo } from '@/game/catalog/quiz';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const CARD_WIDTH = 400;
const CARD_HEIGHT = 196;
const CARD_POSITIONS: readonly { x: number; y: number }[] = [
  { x: 410, y: 286 },
  { x: 870, y: 286 },
  { x: 410, y: 510 },
  { x: 870, y: 510 },
];

const SUBJECT_COLORS: Record<QuizSubject, number> = {
  math: COLORS.teal,
  danish: COLORS.primary,
  english: COLORS.sky,
  nature: COLORS.ground,
};

export class SchoolScene extends Phaser.Scene {
  private starting = false;

  constructor() {
    super(SCENE_KEYS.SCHOOL);
  }

  preload(): void {
    loadMissingAssets(this.load, this.textures, ['school-room']);
  }

  create(): void {
    this.starting = false;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'school-room');
    this.createHeader();
    this.createHeartPill();

    QUIZ_SUBJECT_INFO.forEach((info, index) => {
      const position = CARD_POSITIONS[index] ?? CARD_POSITIONS[0];
      this.createCard(info, position.x, position.y, index);
    });

    this.input.keyboard?.on('keydown-ONE', () => this.startQuiz('math'));
    this.input.keyboard?.on('keydown-TWO', () => this.startQuiz('danish'));
    this.input.keyboard?.on('keydown-THREE', () => this.startQuiz('english'));
    this.input.keyboard?.on('keydown-FOUR', () => this.startQuiz('nature'));
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
    panel.fillStyle(COLORS.panel, 0.96);
    panel.fillRoundedRect(360, 14, 560, 96, 28);
    panel.lineStyle(5, COLORS.accent, 0.6);
    panel.strokeRoundedRect(360, 14, 560, 96, 28);

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
    background.fillStyle(COLORS.panel, 0.96);
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

  private createCard(info: QuizSubjectInfo, x: number, y: number, index: number): void {
    const color = SUBJECT_COLORS[info.subject];
    const progress = save.schoolProgress(info.subject);
    const card = this.add.container(x, y).setDepth(20);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 30);
    background.lineStyle(6, color, 0.95);
    background.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 30);
    background.fillStyle(color, 0.2);
    background.fillRoundedRect(
      -CARD_WIDTH / 2 + 14,
      -CARD_HEIGHT / 2 + 14,
      CARD_WIDTH - 28,
      64,
      20,
    );

    const icon = this.add.image(-150, -52, info.icon).setDisplaySize(58, 58);
    const title = this.add
      .text(-108, -52, info.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const hint = this.add
      .text(-176, 4, info.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '19px',
        color: COLORS.textMuted,
        wordWrap: { width: 348 },
      })
      .setOrigin(0, 0.5);

    const stars = this.createStars(progress.bestStars);
    stars.setPosition(-176, 50);

    if (progress.bestStars > 0) {
      const best = this.add
        .text(-54, 50, text.school.bestStars(progress.bestStars), {
          fontFamily: FONT_FAMILY,
          fontSize: '17px',
          color: COLORS.textMuted,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      card.add(best);
    }

    const play = new Button(this, {
      x: 112,
      y: 50,
      label: text.school.play,
      width: 150,
      height: 64,
      fontSize: 24,
      color,
      textColor: COLORS.text,
      onClick: () => this.startQuiz(info.subject),
    });

    card.add([background, icon, title, hint, stars, play]);
    card.setSize(CARD_WIDTH, CARD_HEIGHT);
    card.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    card.on('pointerup', () => this.startQuiz(info.subject));
    card.on('pointerover', () => {
      if (!isReducedMotion()) {
        card.setScale(1.02);
      }
    });
    card.on('pointerout', () => card.setScale(1));

    if (!isReducedMotion()) {
      card.setAlpha(0).setY(y + 14);
      this.tweens.add({
        targets: card,
        alpha: 1,
        y,
        duration: 260,
        delay: index * 70,
        ease: 'Back.easeOut',
      });
    }
  }

  private createStars(bestStars: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    for (let index = 0; index < 3; index += 1) {
      const star = this.add.image(index * 38, 0, 'icon-star').setDisplaySize(32, 32);
      if (index >= bestStars) {
        star.setTint(0xb9aea5).setAlpha(0.55);
      }
      container.add(star);
    }
    return container;
  }

  private startQuiz(subject: QuizSubject): void {
    if (this.starting) {
      return;
    }
    this.starting = true;
    audio.play('click');
    this.scene.start(SCENE_KEYS.QUIZ, { subject });
  }

  private goBack(): void {
    this.cameras.main.fadeOut(200, 255, 246, 229);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TOWN);
    });
  }
}
