import Phaser from 'phaser';
import { GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import type { ProfileOverview } from '@/game/types';
import { audio } from '@/systems/audio';
import { MAX_PROFILES, save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { ConfirmDialog } from '@/ui/Modal';
import { ProfileCard } from '@/ui/ProfileCard';
import { drawBackdrop } from '@/ui/background';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const CARD_WIDTH = 350;
const CARD_HEIGHT = 210;
const COLUMN_X = [250, 640, 1030] as const;
const ROW_Y = [268, 500] as const;

export class ProfileScene extends Phaser.Scene {
  private origin: 'launch' | 'menu' = 'launch';
  private dialog?: ConfirmDialog;

  constructor() {
    super(SCENE_KEYS.PROFILE);
  }

  init(data: { origin?: unknown }): void {
    this.origin = data.origin === 'menu' ? 'menu' : 'launch';
  }

  create(): void {
    this.dialog = undefined;
    drawBackdrop(this);
    this.createHeader();

    const profiles = save.getProfileOverviews();
    if (profiles.length === 0) {
      this.createEmptyState();
    } else {
      this.createCards(profiles);
      this.createNewProfileButton(profiles.length);
    }

    this.setupKeyboard(profiles);
  }

  private createHeader(): void {
    this.add
      .text(64, 58, text.profiles.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '56px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add
      .text(66, 110, text.profiles.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(GAME_WIDTH - 64, 110, `${save.profiles.length} / ${MAX_PROFILES}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    if (this.origin === 'menu') {
      new Button(this, {
        x: GAME_WIDTH - 118,
        y: 58,
        label: text.back,
        width: 170,
        height: 64,
        fontSize: 24,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: () => this.goBack(),
      });
    }
  }

  private createCards(profiles: readonly ProfileOverview[]): void {
    profiles.forEach((profile, index) => {
      new ProfileCard(this, {
        x: COLUMN_X[index % COLUMN_X.length],
        y: ROW_Y[Math.floor(index / COLUMN_X.length)],
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        profile,
        onSelect: () => this.selectProfile(profile),
        onDelete: () => this.confirmDelete(profile),
      });
    });
  }

  private createEmptyState(): void {
    this.add
      .text(GAME_WIDTH / 2, 292, text.profiles.empty, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.add
      .image(GAME_WIDTH / 2, 190, 'icon-paw')
      .setDisplaySize(88, 88)
      .setAlpha(0.45);

    new Button(this, {
      x: GAME_WIDTH / 2,
      y: 414,
      label: text.profiles.first,
      width: 430,
      height: 104,
      fontSize: 36,
      color: COLORS.primary,
      onClick: () => this.createProfile(),
    });
  }

  private createNewProfileButton(profileCount: number): void {
    const full = profileCount >= MAX_PROFILES;
    const button = new Button(this, {
      x: GAME_WIDTH / 2,
      y: 666,
      label: full ? text.profiles.full : text.profiles.create,
      width: 420,
      height: 72,
      fontSize: full ? 21 : 28,
      color: COLORS.primary,
      onClick: () => this.createProfile(),
    });
    if (full) {
      button.setEnabled(false);
    }
  }

  private setupKeyboard(profiles: readonly ProfileOverview[]): void {
    const numberKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'];
    numberKeys.forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => {
        const profile = profiles[index];
        if (profile) {
          this.selectProfile(profile);
        }
      });
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      const profile = profiles.find((entry) => entry.active) ?? profiles[0];
      if (profile) {
        this.selectProfile(profile);
      }
    });
    this.input.keyboard?.on('keydown-N', () => this.createProfile());
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());
  }

  private selectProfile(profile: ProfileOverview): void {
    if (this.dialog) {
      return;
    }
    if (!save.switchProfile(profile.id)) {
      return;
    }
    audio.play('pop');
    this.scene.start(SCENE_KEYS.MENU);
  }

  private createProfile(): void {
    if (this.dialog) {
      return;
    }
    const meta = save.createProfile();
    if (!meta) {
      audio.play('error');
      return;
    }
    audio.play('pop');
    this.scene.start(SCENE_KEYS.CHARACTER);
  }

  private confirmDelete(profile: ProfileOverview): void {
    if (this.dialog) {
      return;
    }
    this.dialog = new ConfirmDialog(this, {
      title: text.profiles.deleteTitle,
      body: text.profiles.deleteBody,
      confirmLabel: text.yes,
      cancelLabel: text.no,
      onConfirm: () => {
        save.deleteProfile(profile.id);
        this.scene.restart();
      },
      onCancel: () => {
        this.dialog = undefined;
      },
    });
  }

  private goBack(): void {
    if (this.dialog) {
      return;
    }
    if (this.origin === 'menu') {
      this.scene.start(SCENE_KEYS.MENU);
    }
  }
}
