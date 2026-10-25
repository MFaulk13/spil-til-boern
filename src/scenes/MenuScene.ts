import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { MAX_PROFILES, save } from '@/systems/save';
import { currentSeasonTheme } from '@/systems/season';
import { Button } from '@/ui/Button';
import { CharacterView } from '@/ui/CharacterView';
import { ConfirmDialog } from '@/ui/Modal';
import { PetView } from '@/ui/PetView';
import { applySeasonTheme, addSeasonLabel } from '@/ui/SeasonDecor';
import { SeasonInfoModal } from '@/ui/SeasonInfoModal';
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
  private seasonInfo?: SeasonInfoModal;

  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    this.dialog = undefined;
    this.seasonInfo = undefined;
    const theme = currentSeasonTheme();
    drawBackdrop(this, theme);
    applySeasonTheme(this, theme, 'menu');
    addSeasonLabel(this, theme, 24, 20, () => this.openSeasonInfo(theme));
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

    const active = save.activeProfileId !== null;
    const profiles = save.profiles;
    const hasProfiles = profiles.length > 0;
    const canCreate = profiles.length < MAX_PROFILES;
    const pet = save.pet;
    const player = save.playerLook;
    const hasSave = active && (player !== null || pet !== null);

    if (active && save.activeProfileName) {
      this.add
        .text(GAME_WIDTH / 2, 296, text.profiles.current(save.activeProfileName), {
          fontFamily: FONT_FAMILY,
          fontSize: '24px',
          color: COLORS.textMuted,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    }

    new Button(this, {
      x: GAME_WIDTH / 2,
      y: 358,
      label: this.primaryLabel(),
      width: 430,
      height: 104,
      fontSize: 40,
      onClick: () => this.runPrimaryAction(),
    });

    if (active) {
      new Button(this, {
        x: hasSave ? GAME_WIDTH / 2 - 175 : GAME_WIDTH / 2,
        y: 466,
        label: text.profiles.switch,
        width: hasSave ? 320 : 360,
        height: 84,
        fontSize: 28,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.openProfiles(),
      });

      if (hasSave) {
        new Button(this, {
          x: GAME_WIDTH / 2 + 175,
          y: 466,
          label: text.profiles.startOver,
          width: 320,
          height: 84,
          fontSize: 28,
          color: COLORS.panelLight,
          textColor: COLORS.text,
          onClick: () => this.confirmStartOver(),
        });
      }
    } else if (hasProfiles && canCreate) {
      new Button(this, {
        x: GAME_WIDTH / 2,
        y: 466,
        label: text.profiles.create,
        width: 360,
        height: 84,
        fontSize: 28,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.createProfile(),
      });
    }

    this.soundButton = new Button(this, {
      x: GAME_WIDTH / 2 - 155,
      y: 558,
      label: this.soundLabel(),
      width: 280,
      height: 76,
      fontSize: 26,
      color: COLORS.teal,
      textColor: COLORS.textDark,
      onClick: () => this.toggleSound(),
    });

    new Button(this, {
      x: GAME_WIDTH / 2 + 175,
      y: 558,
      label: this.motionLabel(),
      width: 310,
      height: 76,
      fontSize: 24,
      color: COLORS.lavender,
      textColor: COLORS.textDark,
      onClick: () => this.toggleMotion(),
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 28, text.saveHint, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.runPrimaryAction());
    this.input.keyboard?.on('keydown-SPACE', () => this.runPrimaryAction());
    this.input.keyboard?.on('keydown-S', () => this.toggleSound());
    this.input.keyboard?.on('keydown-M', () => this.toggleMotion());
    this.input.keyboard?.on('keydown-P', () => this.openProfiles());
    this.input.keyboard?.on('keydown-I', () => this.openSeasonInfo(theme));
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
    const active = save.activeProfileId !== null;
    const player = active ? save.playerLook : null;
    const pet = active ? save.pet : null;

    if (player) {
      const character = new CharacterView(this, 150, 610, 240, player);
      character.startIdle();
      if (!isReducedMotion()) {
        this.tweens.add({
          targets: character,
          y: 604,
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.add.image(150, 560, 'icon-paw').setDisplaySize(170, 170).setAlpha(0.45).setAngle(-8);
    }

    if (pet) {
      const petView = new PetView(this, 1130, 610, 210, pet.id, pet.accessory);
      petView.startIdle();
      this.add
        .text(1130, 674, pet.name, {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
    } else {
      this.add.image(1130, 560, 'icon-star').setDisplaySize(150, 150).setAlpha(0.45).setAngle(12);
    }
  }

  private createDecorations(): void {
    if (isReducedMotion()) {
      return;
    }
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

  private primaryLabel(): string {
    if (save.activeProfileId) {
      const pet = save.pet;
      if (pet) {
        return text.continueWith(pet.name);
      }
      return save.playerLook ? text.continue : text.start;
    }
    return save.profiles.length > 0 ? text.profiles.choose : text.newGame;
  }

  private isModalOpen(): boolean {
    return this.dialog !== undefined || this.seasonInfo !== undefined;
  }

  private runPrimaryAction(): void {
    if (this.isModalOpen()) {
      return;
    }
    if (save.activeProfileId) {
      this.startJourney();
      return;
    }
    if (save.profiles.length > 0) {
      this.openProfiles();
      return;
    }
    this.createProfile();
  }

  private startJourney(): void {
    if (this.isModalOpen() || !save.activeProfileId) {
      return;
    }
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

  private openProfiles(): void {
    if (this.isModalOpen() || save.profiles.length === 0) {
      return;
    }
    audio.unlock();
    this.scene.start(SCENE_KEYS.PROFILE, { origin: 'menu' });
  }

  private createProfile(): void {
    if (this.isModalOpen()) {
      return;
    }
    const meta = save.createProfile();
    if (!meta) {
      audio.play('error');
      return;
    }
    audio.unlock();
    audio.play('pop');
    this.scene.start(SCENE_KEYS.CHARACTER);
  }

  private confirmStartOver(): void {
    if (this.isModalOpen()) {
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

  private openSeasonInfo(theme: ReturnType<typeof currentSeasonTheme>): void {
    if (this.isModalOpen()) {
      return;
    }
    this.seasonInfo = new SeasonInfoModal(this, {
      theme,
      onClose: () => {
        this.seasonInfo = undefined;
      },
    });
  }

  private toggleSound(): void {
    if (this.isModalOpen()) {
      return;
    }
    audio.setEnabled(!audio.isEnabled);
    save.setSoundEnabled(audio.isEnabled);
    this.soundButton?.setLabel(this.soundLabel());
  }

  private toggleMotion(): void {
    if (this.isModalOpen()) {
      return;
    }
    save.setReduceMotion(!save.reduceMotion);
    this.scene.restart();
  }

  private motionLabel(): string {
    return save.reduceMotion ? text.motionCalm : text.motionFull;
  }

  private soundLabel(): string {
    return audio.isEnabled ? text.soundOn : text.soundOff;
  }
}
