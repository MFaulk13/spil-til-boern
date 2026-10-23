import Phaser from 'phaser';
import {
  currentFavoriteActivity,
  getParkActivity,
  getParkBadge,
  getParkGoal,
  getParkGoalLabel,
  PARK_ACTIVITIES,
  PARK_BADGE_IDS,
  type ParkGoalDefinition,
} from '@/game/catalog/park';
import { text } from '@/game/text';
import type { ParkGoalProgress, ParkState, PetId } from '@/game/types';
import { isReducedMotion } from '@/systems/motion';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const CARD_WIDTH = 620;
const CARD_HEIGHT = 164;

interface ParkGoalCardOptions {
  state: ParkState;
  petId: PetId;
  petName: string;
  hasToys: boolean;
  onRead: (labels: readonly string[]) => void;
}

interface GoalRow {
  goal: ParkGoalDefinition;
  progress: ParkGoalProgress;
  label: string;
}

export class ParkGoalCard extends Phaser.GameObjects.Container {
  private parkState: ParkState;
  private petId: PetId;
  private petName: string;
  private hasToys: boolean;
  private readonly onRead: (labels: readonly string[]) => void;

  constructor(scene: Phaser.Scene, options: ParkGoalCardOptions) {
    super(scene, 640, 188);
    this.parkState = options.state;
    this.petId = options.petId;
    this.petName = options.petName;
    this.hasToys = options.hasToys;
    this.onRead = options.onRead;
    this.setDepth(800);
    scene.add.existing(this);
    this.render();
  }

  updateState(
    state: ParkState,
    petId: PetId,
    petName: string,
    hasToys: boolean,
  ): void {
    this.parkState = state;
    this.petId = petId;
    this.petName = petName;
    this.hasToys = hasToys;
    this.render();
  }

  private rows(): GoalRow[] {
    const rows: GoalRow[] = [];
    for (const progress of this.parkState.goals) {
      const goal = getParkGoal(progress.goalId);
      if (!goal) {
        continue;
      }
      rows.push({
        goal,
        progress,
        label: getParkGoalLabel(goal, this.petId, this.petName, this.hasToys),
      });
    }
    return rows;
  }

  private render(): void {
    this.removeAll(true);
    const rows = this.rows();
    const complete = rows.length > 0 && rows.every((row) => row.progress.progress >= row.goal.target);
    const allBadges = this.parkState.badges.length >= PARK_BADGE_IDS.length;

    const panel = this.scene.add.graphics();
    panel.fillStyle(COLORS.panel, 0.96);
    panel.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 24);
    panel.lineStyle(4, complete ? COLORS.teal : COLORS.accent, 0.8);
    panel.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 24);
    this.add(panel);

    if (allBadges) {
      this.renderAllBadges();
      return;
    }

    const title = this.scene.add
      .text(-CARD_WIDTH / 2 + 28, -CARD_HEIGHT / 2 + 24, text.park.goalTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.add(title);

    const read = new Button(this.scene, {
      x: CARD_WIDTH / 2 - 72,
      y: -CARD_HEIGHT / 2 + 24,
      label: text.park.readGoals,
      width: 118,
      height: 48,
      fontSize: 18,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      iconKey: 'icon-sound',
      iconSize: 24,
      onClick: () => this.onRead(rows.map((row) => row.label)),
    });
    this.add(read);

    rows.forEach((row, index) => {
      this.addRow(row, index);
    });
  }

  private renderAllBadges(): void {
    const icon = this.scene.add.image(-220, 6, 'icon-star').setDisplaySize(66, 66);
    const badgeLabel = this.scene.add
      .text(-172, -14, text.park.allBadgesTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const body = this.scene.add
      .text(-172, 24, text.park.allBadgesBody, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0, 0.5);
    const read = new Button(this.scene, {
      x: CARD_WIDTH / 2 - 72,
      y: -CARD_HEIGHT / 2 + 24,
      label: text.park.readGoals,
      width: 118,
      height: 48,
      fontSize: 18,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      iconKey: 'icon-sound',
      iconSize: 24,
      onClick: () => this.onRead([badgeLabel.text, body.text]),
    });
    this.add([icon, badgeLabel, body, read]);
  }

  private addRow(row: GoalRow, index: number): void {
    const y = -18 + index * 36;
    const done = row.progress.progress >= row.goal.target;
    const activity =
      row.goal.activity === 'favorite'
        ? PARK_ACTIVITIES[currentFavoriteActivity(this.petId, this.hasToys)]
        : getParkActivity(row.goal.activity) ?? PARK_ACTIVITIES.ball;
    const badge = getParkBadge(row.goal.badgeId);

    const background = this.scene.add.graphics();
    background.fillStyle(done ? COLORS.teal : COLORS.panelLight, done ? 0.2 : 0.65);
    background.fillRoundedRect(-CARD_WIDTH / 2 + 18, y - 15, CARD_WIDTH - 36, 30, 12);
    this.add(background);

    const icon = this.scene.add.image(-CARD_WIDTH / 2 + 46, y, activity.iconKey).setDisplaySize(28, 28);
    const label = this.scene.add
      .text(-CARD_WIDTH / 2 + 68, y, row.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: done ? COLORS.textMuted : COLORS.text,
        fontStyle: 'bold',
        wordWrap: { width: 380 },
      })
      .setOrigin(0, 0.5);

    const progress = this.scene.add
      .text(CARD_WIDTH / 2 - 62, y, `${row.progress.progress}/${row.goal.target}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: done ? '#3fa697' : COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    this.add([icon, label, progress]);

    if (done) {
      const check = this.scene.add
        .image(CARD_WIDTH / 2 - 32, y, 'icon-check')
        .setDisplaySize(28, 28);
      this.add(check);
      if (!isReducedMotion()) {
        this.scene.tweens.add({
          targets: check,
          scale: { from: 0.6, to: 1 },
          duration: 220,
          ease: 'Back.easeOut',
        });
      }
    } else if (badge) {
      const marker = this.scene.add
        .image(CARD_WIDTH / 2 - 32, y, 'icon-star')
        .setDisplaySize(22, 22)
        .setAlpha(0.45);
      this.add(marker);
    }
  }
}
