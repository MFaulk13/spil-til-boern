import Phaser from 'phaser';
import {
  currentFavoriteActivity,
  getParkActivity,
  getParkGoal,
  getParkGoalLabel,
  PARK_ACTIVITIES,
} from '@/game/catalog/park';
import { getPet } from '@/game/catalog/pets';
import { text } from '@/game/text';
import type { ParkState, PetId } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const PANEL_WIDTH = 820;
const PANEL_HEIGHT = 470;

interface ParkIntroOptions {
  state: ParkState;
  petId: PetId;
  petName: string;
  hasToys: boolean;
  onRead: (labels: readonly string[]) => void;
  onClose: () => void;
}

export class ParkIntro extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, options: ParkIntroOptions) {
    super(scene, 640, 360);

    const backdrop = scene.add.rectangle(0, 0, 1280, 720, COLORS.ink, 0.55).setInteractive();
    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panel, 0.99);
    panel.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);
    panel.lineStyle(6, COLORS.accent, 0.9);
    panel.strokeRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);

    const title = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 48, text.park.introTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '42px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 100, text.park.introBody, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textMuted,
        align: 'center',
      })
      .setOrigin(0.5);

    const pet = getPet(options.petId);
    const petImage = scene.add.image(250, 86, pet.assetKey).setDisplaySize(150, 150);

    const labels: string[] = [title.text, body.text];
    const rows: Phaser.GameObjects.Container[] = [];
    options.state.goals.forEach((progress, index) => {
      const goal = getParkGoal(progress.goalId);
      if (!goal) {
        return;
      }
      const label = getParkGoalLabel(goal, options.petId, options.petName, options.hasToys);
      labels.push(label);
      const activity =
        goal.activity === 'favorite'
          ? PARK_ACTIVITIES[currentFavoriteActivity(options.petId, options.hasToys)]
          : getParkActivity(goal.activity) ?? PARK_ACTIVITIES.ball;
      const y = -40 + index * 42;
      const row = scene.add.container(-320, y);
      const icon = scene.add.image(0, 0, activity.iconKey).setDisplaySize(30, 30);
      const rowLabel = scene.add
        .text(24, 0, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '21px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      row.add([icon, rowLabel]);
      rows.push(row);
    });

    const read = new Button(scene, {
      x: 250,
      y: -PANEL_HEIGHT / 2 + 158,
      label: text.park.readGoals,
      width: 124,
      height: 52,
      fontSize: 18,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      iconKey: 'icon-sound',
      iconSize: 24,
      onClick: () => options.onRead(labels),
    });

    const play = new Button(scene, {
      x: 0,
      y: PANEL_HEIGHT / 2 - 70,
      label: text.park.introButton,
      width: 300,
      height: 96,
      fontSize: 32,
      color: COLORS.primary,
      onClick: options.onClose,
    });

    this.add([backdrop, panel, title, body, petImage, ...rows, read, play]);
    this.setDepth(1000);
    scene.add.existing(this);

    if (!isReducedMotion()) {
      this.setAlpha(0).setScale(0.94);
      scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }
}
