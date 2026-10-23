import Phaser from 'phaser';
import { loadMissingAssets } from '@/game/assets';
import { QUIZ_SUBJECT_INFO, type QuizSubject, type QuizSubjectInfo } from '@/game/catalog/quiz';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY, SUBJECT_COLORS } from '@/ui/theme';

const CARD_WIDTH = 280;
const CARD_HEIGHT = 196;
const CARD_POSITIONS: readonly { x: number; y: number }[] = [
  { x: 190, y: 318 },
  { x: 490, y: 318 },
  { x: 790, y: 318 },
  { x: 1090, y: 318 },
  { x: 190, y: 548 },
  { x: 490, y: 548 },
  { x: 790, y: 548 },
  { x: 1090, y: 548 },
];

const SUBJECT_KEYS: readonly QuizSubject[] = [
  'math',
  'danish',
  'english',
  'nature',
  'history',
  'religion',
  'music',
  'sport',
];

const SUBJECT_KEY_CODES = [
  Phaser.Input.Keyboard.KeyCodes.ONE,
  Phaser.Input.Keyboard.KeyCodes.TWO,
  Phaser.Input.Keyboard.KeyCodes.THREE,
  Phaser.Input.Keyboard.KeyCodes.FOUR,
  Phaser.Input.Keyboard.KeyCodes.FIVE,
  Phaser.Input.Keyboard.KeyCodes.SIX,
  Phaser.Input.Keyboard.KeyCodes.SEVEN,
  Phaser.Input.Keyboard.KeyCodes.EIGHT,
] as const;

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

    for (let index = 0; index < SUBJECT_KEYS.length; index += 1) {
      const keyCode = SUBJECT_KEY_CODES[index];
      const subject = SUBJECT_KEYS[index];
      if (keyCode !== undefined && subject) {
        this.input.keyboard?.addKey(keyCode).on('down', () => this.startQuiz(subject));
      }
    }
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.cameras.main.fadeIn(240, 255, 246, 229);
  }

  private createHeader(): void {
    new Button(this, {
      x: 96,
      y: 58,
      label: text.school.back,
      width: 176,
      height: 76,
      fontSize: 25,
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
    background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 26);
    background.lineStyle(5, color, 0.95);
    background.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 26);
    background.fillStyle(color, 0.2);
    background.fillRoundedRect(
      -CARD_WIDTH / 2 + 12,
      -CARD_HEIGHT / 2 + 12,
      CARD_WIDTH - 24,
      58,
      18,
    );

    const icon = this.add.image(-96, -58, info.icon).setDisplaySize(42, 42);
    const title = this.add
      .text(-66, -58, info.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.text,
        fontStyle: 'bold',
        wordWrap: { width: 180 },
      })
      .setOrigin(0, 0.5);

    const hint = this.add
      .text(-116, -4, info.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: COLORS.textMuted,
        wordWrap: { width: 232 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0.5);

    const stars = this.createStars(progress.bestStars);
    stars.setPosition(-116, 40);

    const accuracy =
      progress.totalQuestions > 0
        ? Math.round((progress.firstTryCorrect / progress.totalQuestions) * 100)
        : 0;
    const stats = this.add
      .text(
        -116,
        68,
        progress.rounds > 0 ? text.school.stats(progress.rounds, accuracy) : text.school.newSubject,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          color: COLORS.textMuted,
          fontStyle: 'bold',
        },
      )
      .setOrigin(0, 0.5);

    const playPill = this.add.graphics();
    playPill.fillStyle(color, 1);
    playPill.fillRoundedRect(40, 44, 84, 38, 19);
    playPill.lineStyle(3, 0xffffff, 0.28);
    playPill.strokeRoundedRect(40, 44, 84, 38, 19);
    const playText = this.add
      .text(82, 63, text.school.play, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    card.add([background, icon, title, hint, stars, stats, playPill, playText]);
    card.setSize(CARD_WIDTH, CARD_HEIGHT);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    card.on('pointerup', () => this.startQuiz(info.subject));
    card.on('pointerover', () => {
      if (!isReducedMotion()) {
        card.setScale(1.025);
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
        delay: index * 45,
        ease: 'Back.easeOut',
      });
    }
  }

  private createStars(bestStars: number): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    for (let index = 0; index < 3; index += 1) {
      const star = this.add.image(index * 28, 0, 'icon-star').setDisplaySize(24, 24);
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
