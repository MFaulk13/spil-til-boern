import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { save } from '@/systems/save';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

interface Location {
  scene: string;
  icon: string;
  label: string;
  travel: string;
  color: number;
  x: number;
  y: number;
}

const LOCATIONS: readonly Location[] = [
  {
    scene: SCENE_KEYS.HOME,
    icon: 'icon-home',
    label: text.town.home,
    travel: text.town.travelHome,
    color: COLORS.primary,
    x: 250,
    y: 556,
  },
  {
    scene: SCENE_KEYS.SHOP,
    icon: 'icon-shop',
    label: text.town.shop,
    travel: text.town.travelShop,
    color: COLORS.teal,
    x: 640,
    y: 556,
  },
  {
    scene: SCENE_KEYS.PARK,
    icon: 'icon-park',
    label: text.town.park,
    travel: text.town.travelPark,
    color: COLORS.accent,
    x: 1030,
    y: 556,
  },
];

export class TownScene extends Phaser.Scene {
  private traveling = false;

  constructor() {
    super(SCENE_KEYS.TOWN);
  }

  create(): void {
    this.traveling = false;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'town-map');

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.94);
    panel.fillRoundedRect(360, 16, 560, 104, 30);
    panel.lineStyle(5, COLORS.accent, 0.6);
    panel.strokeRoundedRect(360, 16, 560, 104, 30);

    this.add
      .text(GAME_WIDTH / 2, 48, text.town.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '46px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 90, text.town.subtitle, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    this.createHeartPill();

    for (const location of LOCATIONS) {
      this.createLocationCard(location);
    }

    this.input.keyboard?.on('keydown-ESC', () => this.travelTo(SCENE_KEYS.HOME, text.town.travelHome));
    this.cameras.main.fadeIn(260, 168, 216, 240);
  }

  private createHeartPill(): void {
    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.95);
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

  private createLocationCard(location: Location): void {
    const width = 300;
    const height = 180;
    const card = this.add.container(location.x, location.y);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.97);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 30);
    background.lineStyle(6, location.color, 0.95);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 30);
    background.fillStyle(location.color, 0.22);
    background.fillRoundedRect(-width / 2 + 12, -height / 2 + 12, width - 24, 92, 22);

    const icon = this.add.image(0, -44, location.icon).setDisplaySize(78, 78);
    const label = this.add
      .text(0, 48, location.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    card.add([background, icon, label]);
    card.setSize(width, height);
    card.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    card.on('pointerover', () => card.setScale(1.03));
    card.on('pointerout', () => card.setScale(1));
    card.on('pointerup', () => this.travelTo(location.scene, location.travel));
    card.setDepth(20);
  }

  private travelTo(sceneKey: string, label: string): void {
    if (this.traveling) {
      return;
    }
    this.traveling = true;

    const banner = this.add
      .text(GAME_WIDTH / 2, 190, label, {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        color: COLORS.text,
        backgroundColor: '#fff8ee',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(900)
      .setAlpha(0);

    this.tweens.add({ targets: banner, alpha: 1, y: 200, duration: 180, ease: 'Quad.easeOut' });

    const runner = this.add.container(-90, 654).setDepth(901);
    const shadow = this.add.ellipse(0, 16, 78, 20, COLORS.ink, 0.18);
    const bubble = this.add.circle(0, 0, 36, COLORS.primary, 1);
    bubble.setStrokeStyle(5, 0xffffff, 0.8);
    const paw = this.add.image(0, 0, 'icon-paw').setDisplaySize(44, 44);
    runner.add([shadow, bubble, paw]);

    this.tweens.add({
      targets: runner,
      x: GAME_WIDTH + 90,
      duration: 760,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cameras.main.fadeOut(220, 168, 216, 240);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(sceneKey);
        });
      },
    });
  }
}
