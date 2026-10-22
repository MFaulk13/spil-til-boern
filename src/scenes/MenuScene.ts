import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { CharacterView } from '@/ui/CharacterView';
import { ConfirmDialog } from '@/ui/Modal';
import { PetView } from '@/ui/PetView';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const DECORATIONS = [
  { x: 112, y: 118, size: 54, angle: -12 },
  { x: 1160, y: 92, size: 64, angle: 18 },
  { x: 1040, y: 300, size: 36, angle: 8 },
  { x: 220, y: 300, size: 42, angle: -20 },
] as const;

export class MenuScene extends Phaser.Scene {
  private soundButton?: Button;
  private dialog?: ConfirmDialog;

  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    this.dialog = undefined;
    drawBackdrop(this);
    this.createDecorations();

    for (const decoration of DECORATIONS) {
      this.add
        .image(decoration.x, decoration.y, 'icon-heart')
        .setDisplaySize(decoration.size, decoration.size)
        .setAngle(decoration.angle)
        .setAlpha(0.55);
    }

    this.createPreviews();
    this.createTitle();

    const pet = save.pet;
    const player = save.playerLook;
    const hasSave = player !== null || pet !== null;

    const mainLabel = pet ? text.continueWith(pet.name) : player ? text.continue : text.start;

    new Button(this, {
      x: GAME_WIDTH / 2,
      y: 392,
      label: mainLabel,
      width: 430,
      height: 100,
      fontSize: 40,
      onClick: () => this.startJourney(),
    });

    if (hasSave) {
      new Button(this, {
        x: GAME_WIDTH / 2,
        y: 512,
        label: text.newGame,
        width: 330,
        height: 76,
        fontSize: 28,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.confirmNewGame(),
      });
    }

    this.soundButton = new Button(this, {
      x: GAME_WIDTH / 2,
      y: hasSave ? 624 : 512,
      label: this.soundLabel(),
      width: 250,
      height: 72,
      fontSize: 26,
      color: COLORS.teal,
      textColor: COLORS.textDark,
      onClick: () => this.toggleSound(),
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, text.saveHint, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.startJourney());
    this.input.keyboard?.on('keydown-SPACE', () => this.startJourney());
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 150, text.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '150px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 10, '#ffffff', 0, true, true);

    this.add
      .text(GAME_WIDTH / 2, 254, text.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
  }

  private createPreviews(): void {
    const player = save.playerLook;
    const pet = save.pet;

    if (player) {
      const character = new CharacterView(this, 300, 628, 260, player);
      character.startIdle();
      this.tweens.add({
        targets: character,
        y: 622,
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.add.image(300, 520, 'icon-paw').setDisplaySize(164, 164).setAlpha(0.55).setAngle(-8);
    }

    if (pet) {
      const petView = new PetView(this, 980, 632, 224, pet.id);
      petView.startIdle();
      this.add
        .text(980, 676, pet.name, {
          fontFamily: FONT_FAMILY,
          fontSize: '30px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    } else {
      this.add.image(980, 520, 'icon-star').setDisplaySize(150, 150).setAlpha(0.5).setAngle(12);
    }
  }

  private createDecorations(): void {
    this.tweens.add({
      targets: this.add
        .image(1030, 170, 'icon-paw')
        .setDisplaySize(46, 46)
        .setAlpha(0.35)
        .setAngle(18),
      y: 156,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.add.image(176, 196, 'icon-star').setDisplaySize(40, 40).setAlpha(0.4),
      angle: 360,
      duration: 12000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  private startJourney(): void {
    audio.unlock();
    if (save.pet) {
      this.scene.start(SCENE_KEYS.HOME);
      return;
    }
    if (save.playerLook) {
      this.scene.start(SCENE_KEYS.PET_SELECT);
      return;
    }
    this.scene.start(SCENE_KEYS.CHARACTER);
  }

  private confirmNewGame(): void {
    if (this.dialog) {
      return;
    }
    this.dialog = new ConfirmDialog(this, {
      title: text.resetTitle,
      body: text.resetBody,
      confirmLabel: text.yes,
      cancelLabel: text.no,
      onConfirm: () => {
        save.resetGame();
        this.scene.restart();
      },
      onCancel: () => {
        this.dialog = undefined;
      },
    });
  }

  private toggleSound(): void {
    audio.setEnabled(!audio.isEnabled);
    save.setSoundEnabled(audio.isEnabled);
    this.soundButton?.setLabel(this.soundLabel());
  }

  private soundLabel(): string {
    return audio.isEnabled ? text.soundOn : text.soundOff;
  }
}
