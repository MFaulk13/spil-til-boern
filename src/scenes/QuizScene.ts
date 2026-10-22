import Phaser from 'phaser';
import {
  createQuizQuestion,
  QUIZ_HEARTS_PER_ANSWER,
  QUIZ_ROUND_LENGTH,
  type QuizMode,
  type QuizOption,
  type QuizQuestion,
} from '@/game/catalog/quiz';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

interface AnswerButton {
  option: QuizOption;
  button: Button;
}

export class QuizScene extends Phaser.Scene {
  private mode: QuizMode = 'math';
  private question?: QuizQuestion;
  private previousId?: string;
  private correctCount = 0;
  private heartsEarned = 0;
  private locked = false;
  private progressText?: Phaser.GameObjects.Text;
  private heartsText?: Phaser.GameObjects.Text;
  private questionText?: Phaser.GameObjects.Text;
  private answerLayer?: Phaser.GameObjects.Container;
  private feedbackText?: Phaser.GameObjects.Text;
  private readonly answerButtons: AnswerButton[] = [];

  constructor() {
    super(SCENE_KEYS.QUIZ);
  }

  init(data: { mode?: unknown }): void {
    this.mode = data.mode === 'reading' ? 'reading' : 'math';
  }

  create(): void {
    this.question = undefined;
    this.previousId = undefined;
    this.correctCount = 0;
    this.heartsEarned = 0;
    this.locked = false;
    this.answerButtons.length = 0;

    drawBackdrop(this);
    this.createHeader();
    this.createHeartPill();
    this.createQuestionPanel();
    this.createFeedback();
    this.nextQuestion();

    this.input.keyboard?.on('keydown-ONE', () => this.chooseIndex(0));
    this.input.keyboard?.on('keydown-TWO', () => this.chooseIndex(1));
    this.input.keyboard?.on('keydown-THREE', () => this.chooseIndex(2));
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.cameras.main.fadeIn(240, 255, 246, 229);
  }

  private createHeader(): void {
    new Button(this, {
      x: 96,
      y: 58,
      label: text.quiz.back,
      width: 180,
      height: 70,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.goBack(),
    });

    const title = this.mode === 'math' ? text.quiz.mathTitle : text.quiz.readingTitle;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.94);
    panel.fillRoundedRect(420, 14, 440, 96, 28);
    panel.lineStyle(5, COLORS.accent, 0.6);
    panel.strokeRoundedRect(420, 14, 440, 96, 28);

    this.add
      .text(GAME_WIDTH / 2, 50, title, {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.progressText = this.add
      .text(GAME_WIDTH / 2, 88, text.quiz.progress(1, QUIZ_ROUND_LENGTH), {
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
    this.heartsText = this.add
      .text(1106, 57, String(save.hearts), {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
  }

  private createQuestionPanel(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.98);
    panel.fillRoundedRect(190, 164, 900, 156, 30);
    panel.lineStyle(5, COLORS.teal, 0.7);
    panel.strokeRoundedRect(190, 164, 900, 156, 30);

    this.add
      .image(240, 196, this.mode === 'math' ? 'icon-math' : 'icon-book')
      .setDisplaySize(42, 42);

    this.questionText = this.add
      .text(300, 242, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.text,
        fontStyle: 'bold',
        align: 'left',
        wordWrap: { width: 760 },
      })
      .setOrigin(0, 0.5);

    this.answerLayer = this.add.container(0, 0).setDepth(10);
  }

  private createFeedback(): void {
    this.feedbackText = this.add
      .text(GAME_WIDTH / 2, 336, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
  }

  private nextQuestion(): void {
    if (this.correctCount >= QUIZ_ROUND_LENGTH) {
      this.showSummary();
      return;
    }

    this.locked = false;
    this.feedbackText?.setAlpha(0);
    this.answerButtons.length = 0;
    this.answerLayer?.removeAll(true);

    this.question = createQuizQuestion(this.mode, this.previousId);
    this.previousId = this.question.id;
    this.questionText?.setText(this.question.prompt);
    this.progressText?.setText(text.quiz.progress(this.correctCount + 1, QUIZ_ROUND_LENGTH));

    this.question.options.forEach((option, index) => {
      const button = new Button(this, {
        x: GAME_WIDTH / 2,
        y: 396 + index * 112,
        label: option.label,
        width: 720,
        height: 84,
        fontSize: 28,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.answer(index),
      });
      this.answerLayer?.add(button);
      this.answerButtons.push({ option, button });
    });
  }

  private chooseIndex(index: number): void {
    if (this.locked) {
      return;
    }
    const entry = this.answerButtons[index];
    if (!entry || !this.question) {
      return;
    }
    this.answer(this.answerButtons.indexOf(entry));
  }

  private answer(index: number): void {
    if (this.locked || !this.question) {
      return;
    }
    const entry = this.answerButtons[index];
    if (!entry) {
      return;
    }

    if (entry.option.id === this.question.answerId) {
      this.handleCorrect(entry);
      return;
    }

    audio.play('error');
    this.showFeedback(text.quiz.wrong, COLORS.textAccent);
    entry.button.setColor(COLORS.primaryDark);
    if (!isReducedMotion()) {
      this.tweens.add({
        targets: entry.button,
        x: { from: GAME_WIDTH / 2 - 10, to: GAME_WIDTH / 2 + 10 },
        duration: 55,
        yoyo: true,
        repeat: 3,
        onComplete: () => entry.button.setX(GAME_WIDTH / 2),
      });
    }
  }

  private handleCorrect(entry: AnswerButton): void {
    this.locked = true;
    this.correctCount += 1;
    this.heartsEarned += QUIZ_HEARTS_PER_ANSWER;
    save.addHearts(QUIZ_HEARTS_PER_ANSWER);
    this.heartsText?.setText(String(save.hearts));
    entry.button.setColor(COLORS.teal);
    audio.play('win');
    this.showFeedback(
      text.quiz.correct[Math.floor(Math.random() * text.quiz.correct.length)],
      COLORS.textAccent,
    );
    this.spawnReward(entry.button.x, entry.button.y);

    for (const answer of this.answerButtons) {
      if (answer !== entry) {
        answer.button.setAlpha(0.55);
      }
      answer.button.disableInteractive();
    }

    this.time.delayedCall(900, () => this.nextQuestion());
  }

  private showFeedback(message: string, color: string): void {
    if (!this.feedbackText) {
      return;
    }
    this.feedbackText.setText(message).setColor(color).setAlpha(1).setScale(0.9);
    if (!isReducedMotion()) {
      this.tweens.add({
        targets: this.feedbackText,
        scale: 1,
        duration: 180,
        ease: 'Back.easeOut',
      });
    }
  }

  private spawnReward(x: number, y: number): void {
    if (isReducedMotion()) {
      return;
    }
    for (let index = 0; index < QUIZ_HEARTS_PER_ANSWER; index += 1) {
      const heart = this.add
        .image(x + Phaser.Math.Between(-90, 90), y + Phaser.Math.Between(-10, 20), 'icon-heart')
        .setDisplaySize(Phaser.Math.Between(28, 40), Phaser.Math.Between(28, 40))
        .setDepth(30);

      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(70, 130),
        x: heart.x + Phaser.Math.Between(-40, 40),
        alpha: 0,
        angle: Phaser.Math.Between(-25, 25),
        duration: Phaser.Math.Between(800, 1300),
        delay: index * 80,
        ease: 'Quad.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  private showSummary(): void {
    this.answerLayer?.removeAll(true);
    this.progressText?.setText(text.quiz.summaryTitle);
    this.questionText?.setText(text.quiz.summaryBody(this.correctCount, this.heartsEarned));
    this.feedbackText?.setAlpha(0);
    audio.play('reveal');

    const panelWidth = 600;
    const panelHeight = 240;
    const panel = this.add.container(GAME_WIDTH / 2, 500).setDepth(50);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);
    background.lineStyle(6, COLORS.accent, 0.9);
    background.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);

    const again = new Button(this, {
      x: -150,
      y: panelHeight / 2 - 56,
      label: text.quiz.playAgain,
      width: 260,
      height: 76,
      fontSize: 26,
      color: COLORS.teal,
      textColor: COLORS.text,
      onClick: () => this.scene.restart({ mode: this.mode }),
    });

    const school = new Button(this, {
      x: 150,
      y: panelHeight / 2 - 56,
      label: text.quiz.toSchool,
      width: 260,
      height: 76,
      fontSize: 26,
      color: COLORS.primary,
      onClick: () => this.goBack(),
    });

    panel.add([background, again, school]);

    if (!isReducedMotion()) {
      panel.setAlpha(0).setScale(0.94).setY(520);
      this.tweens.add({
        targets: panel,
        alpha: 1,
        scale: 1,
        y: 500,
        duration: 260,
        ease: 'Back.easeOut',
      });
    }
  }

  private goBack(): void {
    this.cameras.main.fadeOut(200, 255, 246, 229);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.SCHOOL);
    });
  }
}
