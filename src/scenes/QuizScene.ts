import Phaser from 'phaser';
import {
  createQuizQuestion,
  getQuizSubjectInfo,
  QUIZ_ROUND_LENGTH,
  type QuizOption,
  type QuizQuestion,
  type QuizSubject,
} from '@/game/catalog/quiz';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { isQuizSubject } from '@/game/types';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import {
  clampStars,
  FIRST_COMPLETION_BONUS,
  HEARTS_PER_SOLVED,
  HEARTS_PER_STAR,
  starsFor,
} from '@/systems/school';
import { initialAdaptiveState, nextAdaptiveState, type AdaptiveQuizState } from '@/systems/quiz';
import { isSpeechAvailable, speak, stopSpeaking } from '@/systems/speech';
import { Button } from '@/ui/Button';
import { PetView } from '@/ui/PetView';
import { drawQuizVisual } from '@/ui/QuizVisualView';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY, SUBJECT_COLORS } from '@/ui/theme';
import { setTintableTexture } from '@/ui/tint';

interface AnswerButton {
  option: QuizOption;
  button: Button;
}

const ANSWER_WIDTH = 720;
const ANSWER_HEIGHT = 92;
const ANSWER_START_Y = 420;
const ANSWER_GAP = 104;

export class QuizScene extends Phaser.Scene {
  private subject: QuizSubject = 'math';
  private question?: QuizQuestion;
  private previousId?: string;
  private solvedCount = 0;
  private firstTryCorrect = 0;
  private baseHearts = 0;
  private attemptedWrong = false;
  private locked = false;
  private summaryShown = false;
  private adaptive: AdaptiveQuizState = initialAdaptiveState(0);
  private progressText?: Phaser.GameObjects.Text;
  private heartsText?: Phaser.GameObjects.Text;
  private questionText?: Phaser.GameObjects.Text;
  private answerLayer?: Phaser.GameObjects.Container;
  private feedbackText?: Phaser.GameObjects.Text;
  private visualLayer?: Phaser.GameObjects.Container;
  private listenButton?: Button;
  private petView?: PetView;
  private readonly answerButtons: AnswerButton[] = [];
  private readonly wrongIds = new Set<string>();
  private readonly usedIds = new Set<string>();

  constructor() {
    super(SCENE_KEYS.QUIZ);
  }

  init(data: { subject?: unknown; mode?: unknown }): void {
    if (isQuizSubject(data.subject)) {
      this.subject = data.subject;
    } else if (data.mode === 'reading') {
      this.subject = 'danish';
    } else {
      this.subject = 'math';
    }
  }

  create(): void {
    this.question = undefined;
    this.previousId = undefined;
    this.solvedCount = 0;
    this.firstTryCorrect = 0;
    this.baseHearts = 0;
    this.attemptedWrong = false;
    this.locked = false;
    this.summaryShown = false;
    this.answerButtons.length = 0;
    this.wrongIds.clear();
    this.usedIds.clear();
    this.adaptive = initialAdaptiveState(save.schoolProgress(this.subject).bestStars);

    drawBackdrop(this);
    this.createHeader();
    this.createHeartPill();
    this.createQuestionPanel();
    this.createFeedback();
    this.createPet();
    this.nextQuestion();

    this.input.keyboard?.on('keydown-ONE', () => this.chooseIndex(0));
    this.input.keyboard?.on('keydown-TWO', () => this.chooseIndex(1));
    this.input.keyboard?.on('keydown-THREE', () => this.chooseIndex(2));
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopSpeaking());
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

    const info = getQuizSubjectInfo(this.subject);
    const accent = SUBJECT_COLORS[this.subject];
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.94);
    panel.fillRoundedRect(390, 14, 500, 96, 28);
    panel.lineStyle(5, accent, 0.8);
    panel.strokeRoundedRect(390, 14, 500, 96, 28);

    this.add.image(438, 62, info.icon).setDisplaySize(48, 48);
    this.add
      .text(476, 50, info.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '42px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

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
    panel.fillRoundedRect(150, 120, 980, 180, 30);
    panel.lineStyle(5, SUBJECT_COLORS[this.subject], 0.7);
    panel.strokeRoundedRect(150, 120, 980, 180, 30);

    this.add.image(218, 162, getQuizSubjectInfo(this.subject).icon).setDisplaySize(44, 44);

    this.questionText = this.add
      .text(280, 206, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: COLORS.text,
        fontStyle: 'bold',
        align: 'left',
        wordWrap: { width: 620 },
      })
      .setOrigin(0, 0.5);

    this.listenButton = new Button(this, {
      x: 1020,
      y: 158,
      label: text.quiz.listen,
      iconKey: 'icon-sound',
      iconSize: 24,
      width: 130,
      height: 54,
      fontSize: 20,
      color: COLORS.lavender,
      textColor: COLORS.textDark,
      onClick: () => this.playListen(),
    });
    this.listenButton.setVisible(false).setEnabled(false);

    this.visualLayer = this.add.container(0, 0).setDepth(5);
    this.answerLayer = this.add.container(0, 0).setDepth(10);
  }

  private createFeedback(): void {
    this.feedbackText = this.add
      .text(GAME_WIDTH / 2, 340, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 3,
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
  }

  private createPet(): void {
    const pet = save.pet;
    if (!pet) {
      return;
    }
    this.petView = new PetView(this, 1150, 610, 150, pet.id, pet.accessory);
    this.petView.startIdle();
    this.petView.setDepth(610);
  }

  private nextQuestion(): void {
    if (this.solvedCount >= QUIZ_ROUND_LENGTH) {
      this.showSummary();
      return;
    }

    this.locked = false;
    this.attemptedWrong = false;
    this.wrongIds.clear();
    this.feedbackText?.setAlpha(0);
    this.answerButtons.length = 0;
    this.answerLayer?.removeAll(true);
    this.visualLayer?.removeAll(true);
    this.listenButton?.setVisible(false).setEnabled(false);

    this.question = createQuizQuestion(this.subject, {
      previousId: this.previousId,
      usedIds: this.usedIds,
      difficulty: this.adaptive.difficulty,
      allowAudio: audio.isEnabled,
    });
    this.previousId = this.question.id;
    this.usedIds.add(this.question.id);
    this.questionText?.setText(this.question.prompt);
    this.progressText?.setText(text.quiz.progress(this.solvedCount + 1, QUIZ_ROUND_LENGTH));
    this.updateListenButton();
    this.drawVisual(this.question.visual);

    this.question.options.forEach((option, index) => {
      const fontSize = option.label.length > 30 ? 23 : option.label.length > 20 ? 26 : 30;
      const button = new Button(this, {
        x: GAME_WIDTH / 2,
        y: ANSWER_START_Y + index * ANSWER_GAP,
        label: option.label,
        width: ANSWER_WIDTH,
        height: ANSWER_HEIGHT,
        fontSize,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        wrapWidth: ANSWER_WIDTH - 56,
        lineSpacing: 2,
        onClick: () => this.answer(index),
      });
      this.answerLayer?.add(button);
      this.answerButtons.push({ option, button });
    });
  }

  private updateListenButton(): void {
    const hasNotes = Boolean(this.question?.audio?.length);
    const canSpeak = Boolean(this.question?.readAloud && isSpeechAvailable());
    const canListen = Boolean((hasNotes || canSpeak) && this.listenButton);
    this.listenButton
      ?.setLabel(this.question?.audio ? text.quiz.listenNotes : text.quiz.listen)
      .setVisible(canListen)
      .setEnabled(canListen);
  }

  private playListen(): void {
    if (!this.question) {
      return;
    }
    if (this.question.audio?.length) {
      audio.playNotes(this.question.audio);
      return;
    }
    this.readQuestion();
  }

  private readQuestion(): void {
    if (!this.question) {
      return;
    }
    speak(this.question.speech ?? this.question.prompt, this.question.speechLang ?? 'da-DK');
  }

  private drawVisual(visual: QuizQuestion['visual']): void {
    if (!visual || !this.visualLayer) {
      return;
    }
    drawQuizVisual(this, this.visualLayer, visual);
  }

  private chooseIndex(index: number): void {
    if (this.locked) {
      return;
    }
    const entry = this.answerButtons[index];
    if (!entry) {
      return;
    }
    this.answer(index);
  }

  private answer(index: number): void {
    if (this.locked || !this.question) {
      return;
    }
    const entry = this.answerButtons[index];
    if (!entry || this.wrongIds.has(entry.option.id)) {
      return;
    }

    if (entry.option.id === this.question.answerId) {
      this.handleCorrect(entry);
      return;
    }

    this.attemptedWrong = true;
    this.adaptive = nextAdaptiveState(this.adaptive, false);
    this.wrongIds.add(entry.option.id);
    audio.play('error');
    this.petView?.playNod();
    this.showFeedback(text.quiz.wrong, COLORS.textAccent);
    entry.button.setColor(COLORS.primaryDark);
    entry.button.disableInteractive();
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
    this.solvedCount += 1;
    if (!this.attemptedWrong) {
      this.firstTryCorrect += 1;
      this.adaptive = nextAdaptiveState(this.adaptive, true);
    }
    this.baseHearts += HEARTS_PER_SOLVED;
    save.addHearts(HEARTS_PER_SOLVED);
    this.heartsText?.setText(String(save.hearts));

    entry.button.setColor(COLORS.teal);
    audio.play('win');
    this.petView?.playJoy();
    const praise = text.quiz.correct[Math.floor(Math.random() * text.quiz.correct.length)];
    const explanation = this.question?.explanation ?? '';
    this.showFeedback(`${praise}\n${explanation}`, COLORS.textAccent);
    this.spawnReward(entry.button.x, entry.button.y);

    for (const answer of this.answerButtons) {
      if (answer !== entry) {
        answer.button.setAlpha(0.55);
      }
      answer.button.disableInteractive();
    }

    this.time.delayedCall(1500, () => this.nextQuestion());
  }

  private showFeedback(message: string, color: string): void {
    if (!this.feedbackText) {
      return;
    }
    this.feedbackText.setText(message).setColor(color).setAlpha(1).setScale(0.94);
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
    for (let index = 0; index < HEARTS_PER_SOLVED; index += 1) {
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
    if (this.summaryShown) {
      return;
    }
    this.summaryShown = true;
    this.answerLayer?.removeAll(true);
    this.visualLayer?.removeAll(true);
    this.listenButton?.setVisible(false).setEnabled(false);
    this.progressText?.setText(text.quiz.summaryTitle);
    this.feedbackText?.setAlpha(0);

    const stars = starsFor(this.firstTryCorrect, QUIZ_ROUND_LENGTH);
    const firstCompletion = !save.schoolProgress(this.subject).firstCompleted;
    const starBonus = clampStars(stars) * HEARTS_PER_STAR;
    const firstBonus = firstCompletion ? FIRST_COMPLETION_BONUS : 0;
    const bonusHearts = starBonus + firstBonus;
    if (bonusHearts > 0) {
      save.addHearts(bonusHearts);
    }
    save.recordSchoolRound(this.subject, {
      stars,
      firstTryCorrect: this.firstTryCorrect,
      totalQuestions: QUIZ_ROUND_LENGTH,
    });
    const heartsEarned = this.baseHearts + bonusHearts;
    this.heartsText?.setText(String(save.hearts));
    this.questionText?.setText(text.quiz.summaryBody(this.firstTryCorrect, heartsEarned, stars));
    audio.play('reveal');

    const panelWidth = 640;
    const panelHeight = 280;
    const panel = this.add.container(GAME_WIDTH / 2, 500).setDepth(50);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);
    background.lineStyle(6, COLORS.accent, 0.9);
    background.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);

    const starRow = this.add.container(0, -82);
    for (let index = 0; index < 3; index += 1) {
      const star = this.add.image((index - 1) * 64, 0, 'icon-star').setDisplaySize(54, 54);
      if (index >= stars) {
        setTintableTexture(star, 'icon-star', 0xb9aea5);
        star.setAlpha(0.55);
      }
      starRow.add(star);
    }

    const reward = this.add
      .text(0, -18, text.quiz.reward(heartsEarned), {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const again = new Button(this, {
      x: -150,
      y: 90,
      label: text.quiz.playAgain,
      width: 270,
      height: 84,
      fontSize: 27,
      color: COLORS.teal,
      textColor: COLORS.text,
      onClick: () => this.scene.restart({ subject: this.subject }),
    });

    const school = new Button(this, {
      x: 150,
      y: 90,
      label: text.quiz.toSchool,
      width: 270,
      height: 84,
      fontSize: 27,
      color: COLORS.primary,
      onClick: () => this.goBack(),
    });

    panel.add([background, starRow, reward, again, school]);

    if (firstCompletion) {
      const bonus = this.add
        .text(0, 18, text.quiz.firstTimeBonus(FIRST_COMPLETION_BONUS), {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          color: COLORS.textAccent,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      panel.add(bonus);
    }

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
    stopSpeaking();
    this.cameras.main.fadeOut(200, 255, 246, 229);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.SCHOOL);
    });
  }
}
