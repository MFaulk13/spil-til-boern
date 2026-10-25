import Phaser from 'phaser';
import { getParkBadge, PARK_BADGES, type ParkBadgeDefinition } from '@/game/catalog/park';
import { text } from '@/game/text';
import { isReducedMotion } from '@/systems/motion';
import { Button } from '@/ui/Button';
import { COLORS, FONT_FAMILY } from '@/ui/theme';
import { setTintableTexture } from '@/ui/tint';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 620;
const CARD_WIDTH = 196;
const CARD_HEIGHT = 180;
const COLUMNS = [-330, -110, 110, 330];
const ROWS = [-70, 100];

interface ParkBadgePanelOptions {
  badges: readonly string[];
  onClose: () => void;
}

export class ParkBadgePanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, options: ParkBadgePanelOptions) {
    super(scene, 640, 360);

    const earned = new Set(options.badges);
    const backdrop = scene.add
      .rectangle(0, 0, 1280, 720, COLORS.ink, 0.55)
      .setInteractive()
      .on('pointerdown', () => options.onClose());

    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.panel, 0.99);
    panel.fillRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);
    panel.lineStyle(6, COLORS.accent, 0.9);
    panel.strokeRoundedRect(-PANEL_WIDTH / 2, -PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 36);

    const blocker = scene.add
      .rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x000000, 0.001)
      .setInteractive();

    const title = scene.add
      .text(0, -PANEL_HEIGHT / 2 + 48, text.park.badgesTitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '40px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const subtitle = scene.add
      .text(
        0,
        -PANEL_HEIGHT / 2 + 92,
        text.park.badgesSubtitle(earned.size, PARK_BADGES.length),
        {
          fontFamily: FONT_FAMILY,
          fontSize: '22px',
          color: COLORS.textMuted,
        },
      )
      .setOrigin(0.5);

    this.add([backdrop, panel, blocker, title, subtitle]);
    this.renderCards(scene, earned);
    this.add(
      new Button(scene, {
        x: 0,
        y: PANEL_HEIGHT / 2 - 54,
        label: text.park.close,
        width: 230,
        height: 80,
        fontSize: 24,
        color: COLORS.panelLight,
        textColor: COLORS.text,
        onClick: options.onClose,
      }),
    );

    this.setDepth(1000);
    scene.add.existing(this);

    if (!isReducedMotion()) {
      this.setAlpha(0).setScale(0.96);
      scene.tweens.add({
        targets: this,
        alpha: 1,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  private renderCards(scene: Phaser.Scene, earned: ReadonlySet<string>): void {
    PARK_BADGES.forEach((badge, index) => {
      const card = this.createCard(scene, badge, index, earned.has(badge.id));
      this.add(card);
    });
  }

  private createCard(
    scene: Phaser.Scene,
    badge: ParkBadgeDefinition,
    index: number,
    earned: boolean,
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(
      COLUMNS[index % COLUMNS.length],
      ROWS[Math.floor(index / COLUMNS.length)],
    );

    const background = scene.add.graphics();
    background.fillStyle(earned ? COLORS.panelLight : COLORS.panel, earned ? 0.95 : 0.7);
    background.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 20);
    background.lineStyle(4, earned ? badge.color : COLORS.ink, earned ? 0.9 : 0.12);
    background.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 20);

    const circle = scene.add.circle(0, -44, 42, earned ? badge.color : COLORS.ink, earned ? 0.22 : 0.08);
    const iconKey = getParkBadge(badge.id)?.iconKey ?? 'icon-star';
    const icon = scene.add.image(0, -44, iconKey).setDisplaySize(52, 52);
    if (!earned) {
      setTintableTexture(icon, iconKey, 0x7d706a);
      icon.setAlpha(0.45);
    }

    const label = scene.add
      .text(0, 18, badge.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: earned ? COLORS.text : COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hint = scene.add
      .text(0, 52, earned ? text.park.badgeEarned : badge.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: earned ? '#3fa697' : COLORS.textMuted,
        align: 'center',
        wordWrap: { width: 170 },
      })
      .setOrigin(0.5, 0);

    container.add([background, circle, icon, label, hint]);

    if (earned) {
      const check = scene.add
        .image(CARD_WIDTH / 2 - 20, -CARD_HEIGHT / 2 + 20, 'icon-check')
        .setDisplaySize(26, 26);
      container.add(check);
    }

    return container;
  }
}
