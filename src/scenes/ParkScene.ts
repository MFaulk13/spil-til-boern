import Phaser from 'phaser';
import { loadMissingAssets } from '@/game/assetLoader';
import type { ItemDefinition } from '@/game/catalog/items';
import {
  currentFavoriteActivity,
  getParkGoal,
  getPetParkPreference,
  PARK_ACTIVITIES,
  PARK_ACTIVITY_ORDER,
  PARK_BADGE_IDS,
  type ParkActivityId,
  type ParkBadgeDefinition,
  type ParkParticle,
  type ParkReaction,
} from '@/game/catalog/park';
import { getPet } from '@/game/catalog/pets';
import { getToyPlay, ownedToys, type ToyPlayStyle } from '@/game/catalog/toys';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { clampNeed, type ParkState, type PetId, type WorldRect } from '@/game/types';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import {
  earnedBadgeCount,
  ensureParkGoals,
  goalActivity,
  hasAllParkBadges,
  isGoalComplete,
  recordParkActivity,
  type ParkActivityResult,
} from '@/systems/park';
import { save } from '@/systems/save';
import { speak } from '@/systems/speech';
import { Button } from '@/ui/Button';
import { CharacterView } from '@/ui/CharacterView';
import { ParkBadgePanel } from '@/ui/ParkBadgePanel';
import { ParkGoalCard } from '@/ui/ParkGoalCard';
import { ParkIntro } from '@/ui/ParkIntro';
import { PetView } from '@/ui/PetView';
import { ToyPanel } from '@/ui/ToyPanel';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const BOUNDS: WorldRect = { left: 170, right: 1110, top: 470, bottom: 620 };
const MOVE_SPEED = 320;
const PET_FOLLOW_GAP = 116;
const PET_FOLLOW_SPEED = 6;
const INTERACT_DISTANCE = 54;
const FAVORITE_BONUS_JOY = 4;
const BUBBLE_COUNT = 6;
const BUBBLE_JOY = 2;

interface StationLayout {
  x: number;
  y: number;
  interaction: { x: number; y: number };
  labelY: number;
  hitRadius: number;
}

const STATION_LAYOUT: Record<ParkActivityId, StationLayout> = {
  ball: { x: 1080, y: 590, interaction: { x: 1080, y: 612 }, labelY: 638, hitRadius: 120 },
  toys: { x: 210, y: 540, interaction: { x: 210, y: 572 }, labelY: 608, hitRadius: 135 },
  bubbles: { x: 650, y: 505, interaction: { x: 650, y: 560 }, labelY: 588, hitRadius: 130 },
  pond: { x: 470, y: 600, interaction: { x: 470, y: 618 }, labelY: 668, hitRadius: 190 },
  flowers: { x: 790, y: 610, interaction: { x: 790, y: 618 }, labelY: 668, hitRadius: 125 },
  bench: { x: 960, y: 475, interaction: { x: 960, y: 538 }, labelY: 526, hitRadius: 130 },
};

export class ParkScene extends Phaser.Scene {
  private character!: CharacterView;
  private petView!: PetView;
  private petId!: PetId;
  private petName = '';
  private hasToys = false;
  private parkState!: ParkState;
  private ball!: Phaser.GameObjects.Container;
  private ballGlow?: Phaser.GameObjects.Arc;
  private pondDucks: Phaser.GameObjects.Image[] = [];
  private bubbles: Phaser.GameObjects.Container[] = [];
  private toyPanel: ToyPanel | null = null;
  private badgePanel: ParkBadgePanel | null = null;
  private intro: ParkIntro | null = null;
  private goalCard?: ParkGoalCard;
  private badgeButton?: Button;
  private joyFill?: Phaser.GameObjects.Graphics;
  private joyText?: Phaser.GameObjects.Text;
  private stationMarkers = new Map<ParkActivityId, Phaser.GameObjects.Image>();
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private pendingStation: ParkActivityId | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facingRight = true;
  private petFacingRight = true;
  private activity: ParkActivityId | null = null;
  private fetching = false;
  private petBusy = false;
  private goalRefreshScheduled = false;
  private allBadgesCelebrated = false;
  private toasts: { message: string; iconKey?: string }[] = [];
  private toastActive = false;

  constructor() {
    super(SCENE_KEYS.PARK);
  }

  preload(): void {
    loadMissingAssets(this.load, this.textures, [
      'park',
      'icon-flower',
      'icon-bench',
      'icon-bubbles',
    ]);
  }

  create(): void {
    const pet = save.pet;
    if (!pet) {
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    this.petId = pet.id;
    this.petName = pet.name;
    this.hasToys = ownedToys({ inventory: save.inventory, furniture: save.furniture }).length > 0;
    this.parkState = ensureParkGoals(save.park, { petId: this.petId, hasToys: this.hasToys });
    save.setPark(this.parkState);

    this.moveTarget = null;
    this.pendingStation = null;
    this.activity = null;
    this.fetching = false;
    this.petBusy = false;
    this.goalRefreshScheduled = false;
    this.allBadgesCelebrated = hasAllParkBadges(this.parkState);
    this.stationMarkers.clear();
    this.bubbles = [];
    this.pondDucks = [];
    this.toyPanel = null;
    this.badgePanel = null;
    this.intro = null;
    this.toasts = [];
    this.toastActive = false;

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'park');

    this.createTopBar();
    this.createGoalCard();

    this.character = new CharacterView(this, 640, 575, 210, save.playerLook ?? undefined);
    this.character.startIdle();
    this.character.setDepth(575);

    this.petView = new PetView(this, 760, 575, 172, pet.id, pet.accessory);
    this.petView.startIdle();
    this.petView.setDepth(601);

    this.createBall();
    this.createToyBox();
    this.createBubbleStation();
    this.createPond();
    this.createFlowers();
    this.createBench();
    this.setupInput();
    this.refreshParkUi();
    this.cameras.main.fadeIn(240, 168, 216, 240);

    if (!this.parkState.tutorialDone) {
      this.showIntro();
    }
  }

  override update(_time: number, delta: number): void {
    if (this.toyPanel || this.badgePanel || this.intro) {
      this.character.setWalking(false);
      return;
    }
    if (this.activity || this.fetching) {
      this.character.setWalking(false);
      return;
    }

    const seconds = Math.min(delta, 120) / 1000;
    this.updateMovement(seconds);
    this.updatePendingStation();
  }

  private createTopBar(): void {
    new Button(this, {
      x: 96,
      y: 58,
      label: text.park.back,
      width: 160,
      height: 70,
      fontSize: 24,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      onClick: () => this.goBack(),
    });

    const titlePanel = this.add.graphics();
    titlePanel.fillStyle(COLORS.panel, 0.94);
    titlePanel.fillRoundedRect(450, 14, 380, 88, 26);
    titlePanel.lineStyle(5, COLORS.accent, 0.6);
    titlePanel.strokeRoundedRect(450, 14, 380, 88, 26);

    this.add
      .text(GAME_WIDTH / 2, 56, text.park.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '42px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.badgeButton = new Button(this, {
      x: 917,
      y: 58,
      label: text.park.badgesButton,
      width: 156,
      height: 70,
      fontSize: 18,
      color: COLORS.panelLight,
      textColor: COLORS.text,
      iconKey: 'icon-star',
      iconSize: 28,
      onClick: () => this.openBadges(),
    });

    const joyPanel = this.add.graphics();
    joyPanel.fillStyle(COLORS.panel, 0.95);
    joyPanel.fillRoundedRect(1008, 20, 252, 74, 24);
    joyPanel.lineStyle(4, COLORS.accent, 0.6);
    joyPanel.strokeRoundedRect(1008, 20, 252, 74, 24);

    this.add.image(1042, 57, 'icon-joy').setDisplaySize(38, 38);
    this.add
      .text(1074, 42, text.park.joyLabel, {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: COLORS.textMuted,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.joyText = this.add
      .text(1236, 42, '100', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    const bar = this.add.graphics();
    bar.fillStyle(0xffffff, 0.82);
    bar.fillRoundedRect(1074, 66, 162, 14, 7);
    bar.lineStyle(2, COLORS.ink, 0.16);
    bar.strokeRoundedRect(1074, 66, 162, 14, 7);

    this.joyFill = this.add.graphics();
    this.updateJoyMeter();
  }

  private createGoalCard(): void {
    this.goalCard = new ParkGoalCard(this, {
      state: this.parkState,
      petId: this.petId,
      petName: this.petName,
      hasToys: this.hasToys,
      onRead: (labels) => this.readAloud(labels),
    });
  }

  private createBall(): void {
    const layout = STATION_LAYOUT.ball;
    const container = this.add.container(layout.x, layout.y).setDepth(layout.y);
    this.ballGlow = this.add.circle(0, -18, 44, COLORS.accent, 0.25);
    const ball = this.add.image(0, -18, 'toy-ball').setDisplaySize(64, 64);
    container.add([this.ballGlow, ball]);

    if (!isReducedMotion()) {
      this.tweens.add({
        targets: this.ballGlow,
        scale: 1.22,
        alpha: 0.1,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: ball,
        y: -28,
        duration: 640,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.ball = container;
    this.createStationLabel('ball');
  }

  private createToyBox(): void {
    const layout = STATION_LAYOUT.toys;
    const container = this.add.container(layout.x, layout.y).setDepth(layout.y);
    const glow = this.add.circle(0, -34, 62, COLORS.accent, 0.22);
    const shadow = this.add.ellipse(0, 16, 118, 28, COLORS.ink, 0.16);
    const box = this.add.image(0, -46, 'furniture-toy-box').setDisplaySize(108, 108);
    container.add([glow, shadow, box]);

    if (!isReducedMotion()) {
      this.tweens.add({
        targets: glow,
        scale: 1.18,
        alpha: 0.08,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.createStationLabel('toys');
  }

  private createBubbleStation(): void {
    const layout = STATION_LAYOUT.bubbles;
    const container = this.add.container(layout.x, layout.y).setDepth(layout.y);
    const glow = this.add.circle(0, -14, 64, COLORS.sky, 0.28);
    const shadow = this.add.ellipse(0, 44, 112, 24, COLORS.ink, 0.14);

    const jar = this.add.graphics();
    jar.fillStyle(COLORS.sky, 0.55);
    jar.fillRoundedRect(-34, -18, 68, 74, 18);
    jar.lineStyle(4, 0xffffff, 0.85);
    jar.strokeRoundedRect(-34, -18, 68, 74, 18);
    jar.fillStyle(COLORS.teal, 0.4);
    jar.fillRoundedRect(-27, 12, 54, 38, 12);

    const foam = [
      this.add.circle(-16, -42, 14, 0xffffff, 0.72).setStrokeStyle(3, 0xffffff, 0.95),
      this.add.circle(12, -54, 18, 0xffffff, 0.6).setStrokeStyle(3, 0xffffff, 0.95),
      this.add.circle(24, -30, 11, 0xffffff, 0.72).setStrokeStyle(3, 0xffffff, 0.95),
      this.add.circle(0, -72, 10, 0xffffff, 0.65).setStrokeStyle(3, 0xffffff, 0.95),
    ];

    const wand = this.add.graphics();
    wand.lineStyle(5, 0xffffff, 0.95);
    wand.beginPath();
    wand.moveTo(34, -22);
    wand.lineTo(60, -50);
    wand.strokePath();
    wand.lineStyle(5, COLORS.accent, 0.95);
    wand.strokeCircle(66, -58, 12);

    container.add([glow, shadow, jar, ...foam, wand]);

    if (!isReducedMotion()) {
      this.tweens.add({
        targets: glow,
        scale: 1.16,
        alpha: 0.12,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      foam.forEach((bubble, index) => {
        this.tweens.add({
          targets: bubble,
          y: bubble.y - 10,
          duration: 900 + index * 130,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    }

    this.createStationLabel('bubbles');
  }

  private createPond(): void {
    const layout = STATION_LAYOUT.pond;
    const glow = this.add.ellipse(layout.x, layout.y - 6, 300, 104, COLORS.sky, 0.24);
    glow.setDepth(2);

    if (!isReducedMotion()) {
      this.tweens.add({
        targets: glow,
        scaleX: 1.06,
        scaleY: 1.12,
        alpha: 0.12,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.pondDucks = [
      this.createDuck(layout.x - 54, layout.y - 4),
      this.createDuck(layout.x + 58, layout.y + 6),
    ];
    this.createStationLabel('pond');
  }

  private createFlowers(): void {
    const layout = STATION_LAYOUT.flowers;
    const glow = this.add.circle(layout.x, layout.y, 76, COLORS.lavender, 0.18).setDepth(2);
    if (!isReducedMotion()) {
      this.tweens.add({
        targets: glow,
        scale: 1.12,
        alpha: 0.08,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const flowers = [
      this.add.image(layout.x - 42, layout.y - 20, 'icon-flower').setDisplaySize(40, 40),
      this.add.image(layout.x + 2, layout.y - 34, 'icon-flower').setDisplaySize(46, 46),
      this.add.image(layout.x + 48, layout.y - 14, 'icon-flower').setDisplaySize(38, 38),
    ];
    flowers.forEach((flower, index) => {
      flower.setDepth(layout.y + index);
      if (!isReducedMotion()) {
        this.tweens.add({
          targets: flower,
          y: flower.y - 6,
          angle: index % 2 === 0 ? 4 : -4,
          duration: 800 + index * 120,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });

    this.createStationLabel('flowers');
  }

  private createBench(): void {
    const layout = STATION_LAYOUT.bench;
    const glow = this.add.ellipse(layout.x, layout.y - 8, 250, 92, COLORS.accent, 0.14).setDepth(2);
    if (!isReducedMotion()) {
      this.tweens.add({
        targets: glow,
        scaleX: 1.05,
        scaleY: 1.1,
        alpha: 0.08,
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.createStationLabel('bench');
  }

  private createStationLabel(id: ParkActivityId): void {
    const layout = STATION_LAYOUT[id];
    const activity = PARK_ACTIVITIES[id];
    const labelText = this.add
      .text(44, 0, activity.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const width = Math.max(120, labelText.width + 70);
    const container = this.add.container(layout.x, layout.labelY).setDepth(700);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.94);
    background.fillRoundedRect(-width / 2, -20, width, 40, 20);
    background.lineStyle(3, COLORS.accent, 0.5);
    background.strokeRoundedRect(-width / 2, -20, width, 40, 20);

    const icon = this.add.image(-width / 2 + 24, 0, activity.iconKey).setDisplaySize(26, 26);
    labelText.setPosition(-width / 2 + 44, 0);
    container.add([background, icon, labelText]);

    const marker = this.add
      .image(layout.x, layout.labelY - 32, 'icon-star')
      .setDisplaySize(28, 28)
      .setDepth(710)
      .setVisible(false);
    this.stationMarkers.set(id, marker);
  }

  private createDuck(x: number, y: number): Phaser.GameObjects.Image {
    const duck = this.add
      .image(x, y, 'pet-duck')
      .setDisplaySize(58, 58)
      .setOrigin(0.5, 0.8)
      .setDepth(y + 2);
    duck.setFlipX(x > STATION_LAYOUT.pond.x);
    return duck;
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as
      Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.intro) {
        this.closeIntro();
        return;
      }
      if (this.toyPanel) {
        this.closeToyPanel();
        return;
      }
      if (this.badgePanel) {
        this.closeBadgePanel();
        return;
      }
      this.goBack();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.requestStation('ball'));
    this.input.keyboard?.on('keydown-T', () => this.requestStation('toys'));
    this.input.keyboard?.on('keydown-B', () => this.requestStation('bubbles'));
    this.input.keyboard?.on('keydown-G', () => this.requestStation('pond'));
    this.input.keyboard?.on('keydown-F', () => this.requestStation('flowers'));
    this.input.keyboard?.on('keydown-R', () => this.requestStation('bench'));

    this.input.on('pointerdown', () => audio.unlock());

    const zone = this.add
      .zone(GAME_WIDTH / 2, 500, GAME_WIDTH, 440)
      .setDepth(1)
      .setInteractive();
    zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handleGroundTap(pointer);
    });
  }

  private handleGroundTap(pointer: Phaser.Input.Pointer): void {
    if (this.canStartActivity()) {
      const station = this.findStation(pointer.worldX, pointer.worldY);
      if (station) {
        this.requestStation(station);
        return;
      }
      this.pendingStation = null;
      this.moveTarget = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, BOUNDS.left, BOUNDS.right),
        Phaser.Math.Clamp(pointer.worldY, BOUNDS.top, BOUNDS.bottom),
      );
      return;
    }
  }

  private findStation(x: number, y: number): ParkActivityId | null {
    let best: { id: ParkActivityId; distance: number } | null = null;
    for (const id of PARK_ACTIVITY_ORDER) {
      const layout = STATION_LAYOUT[id];
      const distance = Math.min(
        Phaser.Math.Distance.Between(x, y, layout.x, layout.y),
        Phaser.Math.Distance.Between(x, y, layout.x, layout.labelY),
      );
      if (distance <= layout.hitRadius && (!best || distance < best.distance)) {
        best = { id, distance };
      }
    }
    return best?.id ?? null;
  }

  private requestStation(id: ParkActivityId): void {
    if (!this.canStartActivity()) {
      return;
    }
    const layout = STATION_LAYOUT[id];
    const distance = Phaser.Math.Distance.Between(
      this.character.x,
      this.character.y,
      layout.interaction.x,
      layout.interaction.y,
    );
    if (distance <= INTERACT_DISTANCE + 18) {
      this.activateStation(id);
      return;
    }
    this.pendingStation = id;
    this.moveTarget = new Phaser.Math.Vector2(layout.interaction.x, layout.interaction.y);
    this.facingRight = layout.x >= this.character.x;
    this.character.setFacingRight(this.facingRight);
  }

  private updatePendingStation(): void {
    if (!this.pendingStation) {
      return;
    }
    const layout = STATION_LAYOUT[this.pendingStation];
    const distance = Phaser.Math.Distance.Between(
      this.character.x,
      this.character.y,
      layout.interaction.x,
      layout.interaction.y,
    );
    if (distance <= INTERACT_DISTANCE) {
      const station = this.pendingStation;
      this.pendingStation = null;
      this.moveTarget = null;
      this.activateStation(station);
    }
  }

  private activateStation(id: ParkActivityId): void {
    if (!this.canStartActivity()) {
      return;
    }
    const layout = STATION_LAYOUT[id];
    this.moveTarget = null;
    this.facingRight = layout.x >= this.character.x;
    this.character.setFacingRight(this.facingRight);
    this.character.setWalking(false);

    switch (id) {
      case 'ball':
        this.startBallFetch();
        break;
      case 'toys':
        this.openToyBox();
        break;
      case 'bubbles':
        this.blowBubbles();
        break;
      case 'pond':
        this.callDucks();
        break;
      case 'flowers':
        this.findFlowers();
        break;
      case 'bench':
        this.restOnBench();
        break;
    }
  }

  private updateMovement(seconds: number): void {
    const direction = this.getKeyboardDirection();
    let moving = false;

    if (direction.lengthSq() > 0) {
      this.moveTarget = null;
      this.pendingStation = null;
      this.character.x = Phaser.Math.Clamp(
        this.character.x + direction.x * MOVE_SPEED * seconds,
        BOUNDS.left,
        BOUNDS.right,
      );
      this.character.y = Phaser.Math.Clamp(
        this.character.y + direction.y * MOVE_SPEED * seconds,
        BOUNDS.top,
        BOUNDS.bottom,
      );
      if (Math.abs(direction.x) > 0.1) {
        this.facingRight = direction.x > 0;
        this.character.setFacingRight(this.facingRight);
      }
      moving = true;
    } else if (this.moveTarget) {
      const dx = this.moveTarget.x - this.character.x;
      const dy = this.moveTarget.y - this.character.y;
      const distance = Math.hypot(dx, dy);
      const step = MOVE_SPEED * seconds;

      if (distance <= step + 2) {
        this.character.setPosition(this.moveTarget.x, this.moveTarget.y);
        this.moveTarget = null;
      } else {
        this.character.x += (dx / distance) * step;
        this.character.y += (dy / distance) * step;
        if (Math.abs(dx) > 1) {
          this.facingRight = dx > 0;
          this.character.setFacingRight(this.facingRight);
        }
        moving = true;
      }
    }

    this.character.setWalking(moving);
    this.character.setDepth(Math.round(this.character.y));

    if (this.petBusy || this.fetching) {
      return;
    }

    const desiredX = Phaser.Math.Clamp(
      this.character.x + (this.facingRight ? -PET_FOLLOW_GAP : PET_FOLLOW_GAP),
      BOUNDS.left + 40,
      BOUNDS.right - 40,
    );
    const desiredY = Phaser.Math.Clamp(this.character.y + 2, BOUNDS.top + 6, BOUNDS.bottom);
    const follow = 1 - Math.exp(-PET_FOLLOW_SPEED * seconds);
    const petDx = desiredX - this.petView.x;
    this.petView.x = Phaser.Math.Linear(this.petView.x, desiredX, follow);
    this.petView.y = Phaser.Math.Linear(this.petView.y, desiredY, follow);

    if (Math.abs(petDx) > 2) {
      this.petFacingRight = petDx > 0;
      this.petView.setFacingRight(this.petFacingRight);
    }
    this.petView.setDepth(Math.round(this.petView.y));
  }

  private getKeyboardDirection(): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
      direction.x -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
      direction.x += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
      direction.y -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
      direction.y += 1;
    }
    return direction.normalize();
  }

  private startBallFetch(): void {
    if (!this.canStartActivity() || !save.pet) {
      return;
    }
    this.activity = 'ball';
    this.fetching = true;
    this.petBusy = true;
    this.moveTarget = null;
    this.ballGlow?.setVisible(false);
    this.ball.setDepth(700);

    const targetX = Phaser.Math.Clamp(
      this.petView.x + Phaser.Math.Between(-240, 240),
      BOUNDS.left + 60,
      BOUNDS.right - 60,
    );
    const targetY = Phaser.Math.Clamp(this.petView.y + 20, BOUNDS.top + 10, BOUNDS.bottom);
    const distance = Phaser.Math.Distance.Between(this.petView.x, this.petView.y, targetX, targetY);

    this.tweens.add({
      targets: this.ball,
      x: targetX,
      y: targetY + 18,
      duration: 340,
      ease: 'Quad.easeOut',
    });

    this.time.delayedCall(340, () => {
      this.petFacingRight = targetX > this.petView.x;
      this.petView.setFacingRight(this.petFacingRight);
      this.tweens.add({
        targets: this.petView,
        x: targetX,
        y: targetY,
        duration: Math.max(420, distance * 2.4),
        ease: 'Sine.easeInOut',
        onComplete: () => this.pickUpBall(targetX, targetY),
      });
    });
  }

  private pickUpBall(x: number, y: number): void {
    this.tweens.add({
      targets: this.ball,
      y: y - 30,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
    });
    this.petView.setDepth(Math.round(y));
    this.completeActivity('ball', PARK_ACTIVITIES.ball.joy, text.park.fetchReward);
    this.celebrate('ball');

    const homeX = Phaser.Math.Clamp(
      this.character.x + (this.character.x < GAME_WIDTH / 2 ? 118 : -118),
      BOUNDS.left + 50,
      BOUNDS.right - 50,
    );
    this.petFacingRight = homeX > x;
    this.petView.setFacingRight(this.petFacingRight);
    this.tweens.add({
      targets: this.petView,
      x: homeX,
      y: this.character.y + 2,
      duration: 700,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.ball
          .setPosition(STATION_LAYOUT.ball.x, STATION_LAYOUT.ball.y)
          .setAlpha(1)
          .setDepth(STATION_LAYOUT.ball.y);
        this.ballGlow?.setVisible(true);
        this.petView.setDepth(Math.round(this.petView.y));
        this.finishActivity();
      },
    });
  }

  private openToyBox(): void {
    if (!this.canStartActivity()) {
      return;
    }
    const toys = ownedToys({ inventory: save.inventory, furniture: save.furniture });
    if (toys.length === 0) {
      audio.play('error');
      this.showToast(text.park.toysEmpty);
      return;
    }

    audio.play('click');
    this.moveTarget = null;
    this.toyPanel = new ToyPanel(
      this,
      toys,
      (item) => {
        this.closeToyPanel();
        this.time.delayedCall(40, () => this.playWithToy(item));
      },
      () => this.closeToyPanel(),
    );
  }

  private closeToyPanel(): void {
    const panel = this.toyPanel;
    this.toyPanel = null;
    panel?.destroy(true);
  }

  private playWithToy(item: ItemDefinition): void {
    if (!this.canStartActivity() || !save.pet) {
      return;
    }

    this.activity = 'toys';
    this.petBusy = true;
    const play = getToyPlay(item.id);
    const favorite = currentFavoriteActivity(this.petId, this.hasToys) === 'toys';
    const x = this.petView.x + (this.petFacingRight ? 92 : -92);
    const y = this.petView.y - 54;
    const toy = this.createToySprite(item, x, y);
    toy.setDepth(700);
    this.tweens.add({
      targets: toy,
      y: y - 54,
      duration: 320,
      ease: 'Back.easeOut',
    });

    this.playToyReaction(play.style, favorite);
    this.completeActivity('toys', play.joy, text.park.toyReward(item.label));

    this.time.delayedCall(1600, () => {
      this.tweens.add({
        targets: toy,
        y: toy.y - 30,
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => toy.destroy(true),
      });
      this.finishActivity();
    });
  }

  private playToyReaction(style: ToyPlayStyle, favorite: boolean): void {
    audio.play('play');
    if (favorite) {
      this.playParkReaction();
      return;
    }
    switch (style) {
      case 'cuddle':
        this.petView.playNod();
        this.spawnBurst('hearts', this.petView.x, this.petView.y - 100);
        break;
      case 'build':
        this.petView.playHop();
        this.spawnBurst('sparkles', this.petView.x, this.petView.y - 100);
        break;
      case 'music':
        this.petView.playJoy();
        this.spawnBurst('notes', this.petView.x, this.petView.y - 100);
        break;
      case 'create':
        this.petView.playNod();
        this.spawnBurst('sparkles', this.petView.x, this.petView.y - 100);
        break;
      case 'scratch':
        this.petView.playHop();
        this.spawnBurst('hearts', this.petView.x, this.petView.y - 100);
        break;
      default:
        this.petView.playJoy();
    }
  }

  private createToySprite(
    item: ItemDefinition,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const maxSize = 96;
    const scale = maxSize / Math.max(item.width, item.height);
    const shadow = this.add.ellipse(0, 24, 74, 18, COLORS.ink, 0.14);
    const glow = this.add.circle(0, 0, 48, COLORS.accent, 0.2);
    const image = this.add
      .image(0, 0, item.assetKey)
      .setDisplaySize(item.width * scale, item.height * scale);
    return this.add.container(x, y, [shadow, glow, image]);
  }

  private blowBubbles(): void {
    if (!this.canStartActivity()) {
      return;
    }

    this.activity = 'bubbles';
    this.petBusy = true;
    this.bubbles = [];
    audio.play('bubble');

    const favorite = currentFavoriteActivity(this.petId, this.hasToys) === 'bubbles';
    this.petFacingRight = STATION_LAYOUT.bubbles.x > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);
    if (favorite) {
      this.addJoy(FAVORITE_BONUS_JOY);
      this.celebrate('bubbles');
    } else {
      this.petView.playJoy();
    }

    for (let index = 0; index < BUBBLE_COUNT; index += 1) {
      const radius = Phaser.Math.Between(18, 30);
      const startX = STATION_LAYOUT.bubbles.x + Phaser.Math.Between(-100, 100);
      const startY = STATION_LAYOUT.bubbles.y + Phaser.Math.Between(-40, 10);
      const bubble = this.add.container(startX, startY).setDepth(760);
      const orb = this.add.circle(0, 0, radius, 0xd8f4ff, 0.6).setStrokeStyle(3, 0xffffff, 0.95);
      const shine = this.add.circle(-radius * 0.3, -radius * 0.3, radius * 0.24, 0xffffff, 0.85);
      bubble.add([orb, shine]);
      bubble.setInteractive(new Phaser.Geom.Circle(0, 0, radius + 20), Phaser.Geom.Circle.Contains);
      bubble.on('pointerup', () => {
        if (!bubble.active) {
          return;
        }
        const bubbleX = bubble.x;
        const bubbleY = bubble.y;
        bubble.destroy(true);
        this.spawnPop(bubbleX, bubbleY, radius);
        audio.play('pop');
        this.petView.playJoy();
        this.addJoy(BUBBLE_JOY);
        this.recordGoalProgress('bubbles');
      });

      this.bubbles.push(bubble);
      this.tweens.add({
        targets: bubble,
        x: startX + Phaser.Math.Between(-34, 34),
        y: startY - Phaser.Math.Between(140, 210),
        alpha: 0.15,
        duration: Phaser.Math.Between(3600, 5200),
        delay: index * 90,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (bubble.active) {
            bubble.destroy(true);
          }
        },
      });
    }

    this.time.delayedCall(650, () => this.finishActivity());
  }

  private callDucks(): void {
    if (!this.canStartActivity()) {
      return;
    }

    this.activity = 'pond';
    this.petBusy = true;
    audio.play('quack');
    this.petFacingRight = STATION_LAYOUT.pond.x > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);

    const targetX =
      STATION_LAYOUT.pond.x + (this.petView.x < STATION_LAYOUT.pond.x ? -112 : 112);
    const targetY = STATION_LAYOUT.pond.y - 8;
    const distance = Phaser.Math.Distance.Between(
      this.petView.x,
      this.petView.y,
      targetX,
      targetY,
    );

    this.tweens.add({
      targets: this.petView,
      x: targetX,
      y: targetY,
      duration: Math.max(300, distance * 2),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.petView.setDepth(Math.round(targetY));
        this.celebrate('pond');
        this.completeActivity('pond', PARK_ACTIVITIES.pond.joy, text.park.ducksReward);
        this.animateDucks();
        this.time.delayedCall(1500, () => this.returnPetToCharacter(() => this.finishActivity()));
      },
    });
  }

  private animateDucks(): void {
    this.pondDucks.forEach((duck, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      duck.setFlipX(direction < 0);
      if (isReducedMotion()) {
        return;
      }
      this.tweens.add({
        targets: duck,
        x: duck.x + direction * 72,
        y: duck.y + Phaser.Math.Between(-14, 10),
        angle: direction * 8,
        duration: 420,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private findFlowers(): void {
    if (!this.canStartActivity()) {
      return;
    }

    this.activity = 'flowers';
    this.petBusy = true;
    this.petFacingRight = STATION_LAYOUT.flowers.x > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);

    const targetX =
      STATION_LAYOUT.flowers.x + (this.petView.x < STATION_LAYOUT.flowers.x ? -76 : 76);
    const targetY = STATION_LAYOUT.flowers.y - 4;
    const distance = Phaser.Math.Distance.Between(
      this.petView.x,
      this.petView.y,
      targetX,
      targetY,
    );

    this.tweens.add({
      targets: this.petView,
      x: targetX,
      y: targetY,
      duration: Math.max(280, distance * 2),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.petView.setDepth(Math.round(targetY));
        this.celebrate('flowers');
        this.completeActivity('flowers', PARK_ACTIVITIES.flowers.joy, text.park.flowersReward);
        this.spawnFlower();
        this.time.delayedCall(1200, () => this.returnPetToCharacter(() => this.finishActivity()));
      },
    });
  }

  private spawnFlower(): void {
    const flower = this.add
      .image(STATION_LAYOUT.flowers.x, STATION_LAYOUT.flowers.y - 26, 'icon-flower')
      .setDisplaySize(54, 54)
      .setDepth(750)
      .setScale(0.4);
    if (isReducedMotion()) {
      flower.setScale(1);
      this.time.delayedCall(1200, () => flower.destroy());
      return;
    }
    this.tweens.add({
      targets: flower,
      y: flower.y - 46,
      scale: 1,
      duration: 420,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: flower,
      alpha: 0,
      delay: 900,
      duration: 400,
      onComplete: () => flower.destroy(),
    });
  }

  private restOnBench(): void {
    if (!this.canStartActivity()) {
      return;
    }

    this.activity = 'bench';
    this.petBusy = true;
    this.petFacingRight = STATION_LAYOUT.bench.x > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);

    const targetX = STATION_LAYOUT.bench.x - 46;
    const targetY = STATION_LAYOUT.bench.interaction.y;
    const distance = Phaser.Math.Distance.Between(
      this.petView.x,
      this.petView.y,
      targetX,
      targetY,
    );

    this.tweens.add({
      targets: this.petView,
      x: targetX,
      y: targetY,
      duration: Math.max(280, distance * 2),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.petView.setDepth(Math.round(targetY));
        this.celebrate('bench');
        this.completeActivity('bench', PARK_ACTIVITIES.bench.joy, text.park.benchReward);
        this.time.delayedCall(1500, () => this.returnPetToCharacter(() => this.finishActivity()));
      },
    });
  }

  private returnPetToCharacter(callback: () => void): void {
    const homeX = Phaser.Math.Clamp(
      this.character.x + (this.character.x < GAME_WIDTH / 2 ? 118 : -118),
      BOUNDS.left + 50,
      BOUNDS.right - 50,
    );
    const homeY = this.character.y + 2;
    this.petFacingRight = homeX > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);

    if (isReducedMotion()) {
      this.petView.setPosition(homeX, homeY);
      this.petView.setDepth(Math.round(homeY));
      callback();
      return;
    }

    this.tweens.add({
      targets: this.petView,
      x: homeX,
      y: homeY,
      duration: 600,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.petView.setDepth(Math.round(this.petView.y));
        callback();
      },
    });
  }

  private completeActivity(activity: ParkActivityId, joy: number, message?: string): void {
    const favorite = currentFavoriteActivity(this.petId, this.hasToys) === activity;
    const amount = joy + (favorite ? FAVORITE_BONUS_JOY : 0);
    const toast =
      favorite && message
        ? `${message} ${text.park.favoriteDone(this.petName)}`
        : favorite
          ? text.park.favoriteDone(this.petName)
          : message;
    this.addJoy(amount, toast);
    this.recordGoalProgress(activity);
  }

  private recordGoalProgress(activity: ParkActivityId, amount = 1): void {
    const result = recordParkActivity(
      this.parkState,
      activity,
      { petId: this.petId, hasToys: this.hasToys },
      amount,
    );
    this.applyParkResult(result);
  }

  private applyParkResult(result: ParkActivityResult): void {
    this.parkState = result.state;
    save.setPark(this.parkState);
    this.refreshParkUi();

    if (result.awardedBadges.length > 0) {
      this.time.delayedCall(220, () => this.showAwardedBadges(result.awardedBadges));
    }

    if (hasAllParkBadges(this.parkState)) {
      if (!this.allBadgesCelebrated) {
        this.allBadgesCelebrated = true;
        audio.play('win');
        this.showToast(text.park.allBadgesTitle, 'icon-star');
      }
      return;
    }

    const allComplete =
      this.parkState.goals.length > 0 &&
      this.parkState.goals.every((entry) => {
        const goal = getParkGoal(entry.goalId);
        return goal ? isGoalComplete(goal, entry.progress) : false;
      });
    if (allComplete) {
      this.scheduleNextGoals();
    }
  }

  private scheduleNextGoals(): void {
    if (this.goalRefreshScheduled || hasAllParkBadges(this.parkState)) {
      return;
    }
    this.goalRefreshScheduled = true;
    this.time.delayedCall(1400, () => {
      this.goalRefreshScheduled = false;
      if (hasAllParkBadges(this.parkState)) {
        return;
      }
      this.parkState = ensureParkGoals(this.parkState, {
        petId: this.petId,
        hasToys: this.hasToys,
      });
      save.setPark(this.parkState);
      this.refreshParkUi();
      audio.play('happy');
      this.showToast(text.park.goalNew, 'icon-star');
    });
  }

  private showAwardedBadges(badges: readonly ParkBadgeDefinition[]): void {
    if (badges.length === 0) {
      return;
    }
    audio.play('unlock');
    if (badges.length === 1) {
      const badge = badges[0];
      this.showToast(text.park.badgeNew(badge.label), badge.iconKey);
      return;
    }
    this.showToast(text.park.badgesNew(badges.length), 'icon-star');
  }

  private refreshParkUi(): void {
    this.goalCard?.updateState(this.parkState, this.petId, this.petName, this.hasToys);
    this.updateBadgeButton();
    this.updateStationMarkers();
  }

  private updateBadgeButton(): void {
    this.badgeButton?.setLabel(
      `${text.park.badgesButton} ${text.park.badgesCount(
        earnedBadgeCount(this.parkState),
        PARK_BADGE_IDS.length,
      )}`,
    );
  }

  private updateStationMarkers(): void {
    const completePark = hasAllParkBadges(this.parkState);
    for (const id of PARK_ACTIVITY_ORDER) {
      const marker = this.stationMarkers.get(id);
      if (!marker) {
        continue;
      }
      if (completePark) {
        marker.setVisible(false);
        continue;
      }
      let active = false;
      let complete = true;
      for (const entry of this.parkState.goals) {
        const goal = getParkGoal(entry.goalId);
        if (!goal) {
          continue;
        }
        const target = goalActivity(goal, { petId: this.petId, hasToys: this.hasToys });
        if (target !== id) {
          continue;
        }
        active = true;
        if (entry.progress < goal.target) {
          complete = false;
        }
      }
      marker.setVisible(active);
      if (active) {
        marker.setTexture(complete ? 'icon-check' : 'icon-star');
        if (complete) {
          marker.clearTint();
        } else {
          marker.setTint(0xffc94d);
        }
      }
    }
  }

  private celebrate(activity: ParkActivityId): void {
    const favorite = currentFavoriteActivity(this.petId, this.hasToys) === activity;
    if (favorite) {
      this.playParkReaction();
      return;
    }
    switch (activity) {
      case 'ball':
      case 'bubbles':
        this.petView.playJoy();
        break;
      case 'pond':
        this.petView.playJoy();
        this.spawnBurst('water', this.petView.x, this.petView.y - 70);
        break;
      case 'flowers':
        this.petView.playNod();
        this.spawnBurst('leaves', this.petView.x, this.petView.y - 70);
        break;
      case 'bench':
        this.petView.playNod();
        this.spawnBurst('hearts', this.petView.x, this.petView.y - 70);
        break;
      case 'toys':
        this.petView.playJoy();
        break;
    }
  }

  private playParkReaction(): void {
    const preference = getPetParkPreference(this.petId);
    audio.play(getPet(this.petId).voice);
    this.playReactionAnimation(preference.reaction);
    this.spawnBurst(preference.particle, this.petView.x, this.petView.y - 80);
  }

  private playReactionAnimation(reaction: ParkReaction): void {
    switch (reaction) {
      case 'chase':
        this.petView.playSpin();
        break;
      case 'run':
      case 'hop':
        this.petView.playHop();
        break;
      case 'sing':
        this.petView.playNod();
        break;
      case 'swim':
      case 'splash':
        this.petView.playJoy();
        break;
      case 'dig':
      case 'peck':
      case 'hide':
        this.petView.playNod();
        break;
      case 'sniff':
        this.petView.playNod();
        audio.play('sniff');
        break;
      case 'rest':
      case 'sun':
        this.petView.playSleep();
        break;
      case 'fetch':
      default:
        this.petView.playJoy();
        break;
    }
  }

  private spawnBurst(kind: ParkParticle, x: number, y: number): void {
    if (isReducedMotion()) {
      return;
    }
    switch (kind) {
      case 'hearts':
        this.spawnIcons('icon-joy', 3);
        break;
      case 'notes':
        this.spawnNotes(4);
        break;
      case 'sparkles':
        this.spawnIcons('icon-star', 4);
        break;
      case 'water':
        this.spawnRing(x, y, COLORS.sky);
        break;
      case 'leaves':
        this.spawnCircles(x, y, [0x8fd18a, 0xffc94d, 0x62c9b8], 5);
        break;
      case 'dirt':
        this.spawnCircles(x, y, [0xc98e58, 0x8a5a35], 5);
        break;
      case 'zzz':
        this.spawnZzz(x, y);
        break;
    }
  }

  private spawnRing(x: number, y: number, color: number): void {
    for (let index = 0; index < 3; index += 1) {
      const ring = this.add
        .circle(x, y + index * 8, 12)
        .setStrokeStyle(4, color, 0.9)
        .setDepth(900);
      this.tweens.add({
        targets: ring,
        scale: 3,
        alpha: 0,
        duration: 700 + index * 100,
        delay: index * 90,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private spawnCircles(
    x: number,
    y: number,
    colors: readonly number[],
    count: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const circle = this.add
        .circle(
          x + Phaser.Math.Between(-24, 24),
          y + Phaser.Math.Between(-10, 12),
          Phaser.Math.Between(4, 8),
          colors[index % colors.length],
          0.9,
        )
        .setDepth(900);
      this.tweens.add({
        targets: circle,
        y: circle.y - Phaser.Math.Between(50, 90),
        x: circle.x + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: Phaser.Math.Between(600, 1000),
        delay: index * 70,
        ease: 'Quad.easeOut',
        onComplete: () => circle.destroy(),
      });
    }
  }

  private spawnZzz(x: number, y: number): void {
    for (let index = 0; index < 3; index += 1) {
      const label = this.add
        .text(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-8, 8), 'z', {
          fontFamily: FONT_FAMILY,
          fontSize: `${Phaser.Math.Between(22, 32)}px`,
          color: COLORS.textAccent,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(900);
      this.tweens.add({
        targets: label,
        y: label.y - Phaser.Math.Between(50, 80),
        x: label.x + Phaser.Math.Between(-18, 18),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1300),
        delay: index * 140,
        ease: 'Quad.easeOut',
        onComplete: () => label.destroy(),
      });
    }
  }

  private spawnPop(x: number, y: number, radius: number): void {
    if (isReducedMotion()) {
      return;
    }
    const ring = this.add
      .circle(x, y, radius * 0.7)
      .setStrokeStyle(4, 0xffffff, 0.95)
      .setDepth(850);
    this.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private addJoy(amount: number, message?: string): number {
    const pet = save.pet;
    if (!pet) {
      return 0;
    }

    const before = pet.needs.joy;
    const needs = {
      ...pet.needs,
      joy: clampNeed(before + amount),
    };
    save.updateNeeds(needs);
    this.updateJoyMeter();

    const gained = needs.joy - before;
    if (gained > 0) {
      this.spawnJoy(this.petView.x, this.petView.y - 150);
    }
    if (message) {
      this.showToast(message);
    }
    return gained;
  }

  private updateJoyMeter(): void {
    const joy = save.pet?.needs.joy ?? 100;
    this.joyText?.setText(String(Math.round(joy)));
    if (!this.joyFill) {
      return;
    }
    const width = Math.max(4, (162 * joy) / 100);
    this.joyFill.clear();
    this.joyFill.fillStyle(COLORS.primary, 1);
    this.joyFill.fillRoundedRect(1074, 66, width, 14, 7);
  }

  private spawnJoy(x: number, y: number): void {
    if (isReducedMotion()) {
      return;
    }
    for (let index = 0; index < 2; index += 1) {
      const heart = this.add
        .image(x + Phaser.Math.Between(-28, 28), y + Phaser.Math.Between(-8, 12), 'icon-joy')
        .setDisplaySize(Phaser.Math.Between(26, 38), Phaser.Math.Between(26, 38))
        .setDepth(900);

      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(70, 120),
        x: heart.x + Phaser.Math.Between(-30, 30),
        angle: Phaser.Math.Between(-22, 22),
        alpha: 0,
        duration: Phaser.Math.Between(800, 1300),
        delay: index * 110,
        ease: 'Quad.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  private spawnIcons(key: string, count: number): void {
    if (isReducedMotion()) {
      return;
    }
    for (let index = 0; index < count; index += 1) {
      const icon = this.add
        .image(
          this.petView.x + Phaser.Math.Between(-46, 46),
          this.petView.y - 110 + Phaser.Math.Between(-16, 16),
          key,
        )
        .setDisplaySize(Phaser.Math.Between(30, 42), Phaser.Math.Between(30, 42))
        .setDepth(900);
      this.tweens.add({
        targets: icon,
        y: icon.y - Phaser.Math.Between(60, 110),
        x: icon.x + Phaser.Math.Between(-26, 26),
        angle: Phaser.Math.Between(-18, 18),
        alpha: 0,
        duration: Phaser.Math.Between(800, 1200),
        delay: index * 90,
        ease: 'Quad.easeOut',
        onComplete: () => icon.destroy(),
      });
    }
  }

  private spawnNotes(count: number): void {
    if (isReducedMotion()) {
      return;
    }
    for (let index = 0; index < count; index += 1) {
      const note = this.add
        .text(
          this.petView.x + Phaser.Math.Between(-50, 50),
          this.petView.y - 120 + Phaser.Math.Between(-20, 20),
          index % 2 === 0 ? '♪' : '♫',
          {
            fontFamily: FONT_FAMILY,
            fontSize: `${Phaser.Math.Between(30, 44)}px`,
            color: COLORS.textAccent,
            fontStyle: 'bold',
          },
        )
        .setOrigin(0.5)
        .setDepth(900);
      this.tweens.add({
        targets: note,
        y: note.y - Phaser.Math.Between(80, 140),
        x: note.x + Phaser.Math.Between(-34, 34),
        angle: Phaser.Math.Between(-16, 16),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1400),
        delay: index * 90,
        ease: 'Quad.easeOut',
        onComplete: () => note.destroy(),
      });
    }
  }

  private showToast(message: string, iconKey?: string): void {
    this.toasts.push({ message, iconKey });
    this.showNextToast();
  }

  private showNextToast(): void {
    if (this.toastActive || this.toasts.length === 0) {
      return;
    }
    const next = this.toasts.shift();
    if (!next) {
      return;
    }
    this.toastActive = true;

    const label = this.add
      .text(0, 0, next.message, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    const iconSize = next.iconKey ? 32 : 0;
    const padding = 20;
    const width = label.width + padding * 2 + (next.iconKey ? iconSize + 10 : 0);
    const height = 58;
    const x = Phaser.Math.Clamp(this.petView.x, 240, GAME_WIDTH - 240);
    const container = this.add.container(x, this.petView.y - 190).setDepth(910);

    const background = this.add.graphics();
    background.fillStyle(COLORS.panel, 0.98);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 22);
    background.lineStyle(3, COLORS.accent, 0.85);
    background.strokeRoundedRect(-width / 2, -height / 2, width, height, 22);
    container.add(background);

    if (next.iconKey) {
      container.add(
        this.add
          .image(-width / 2 + padding + iconSize / 2, 0, next.iconKey)
          .setDisplaySize(iconSize, iconSize),
      );
      label.setPosition(-width / 2 + padding + iconSize + 10, 0);
    } else {
      label.setOrigin(0.5, 0.5);
      label.setPosition(0, 0);
    }
    container.add(label);

    const finish = (): void => {
      container.destroy();
      this.toastActive = false;
      this.showNextToast();
    };

    if (isReducedMotion()) {
      this.time.delayedCall(1800, finish);
      return;
    }

    this.tweens.add({
      targets: container,
      y: container.y - 40,
      alpha: 0,
      duration: 1300,
      delay: 600,
      ease: 'Quad.easeOut',
      onComplete: finish,
    });
  }

  private readAloud(labels: readonly string[]): void {
    if (labels.length === 0) {
      return;
    }
    audio.unlock();
    speak(labels.join('. '));
  }

  private showIntro(): void {
    this.moveTarget = null;
    this.character.setWalking(false);
    this.intro = new ParkIntro(this, {
      state: this.parkState,
      petId: this.petId,
      petName: this.petName,
      hasToys: this.hasToys,
      onRead: (labels) => this.readAloud(labels),
      onClose: () => this.closeIntro(),
    });
  }

  private closeIntro(): void {
    const intro = this.intro;
    this.intro = null;
    intro?.destroy(true);
    if (!this.parkState.tutorialDone) {
      this.parkState = { ...this.parkState, tutorialDone: true };
      save.setPark(this.parkState);
    }
  }

  private openBadges(): void {
    if (!this.canStartActivity()) {
      return;
    }
    this.moveTarget = null;
    this.character.setWalking(false);
    audio.play('click');
    this.badgePanel = new ParkBadgePanel(this, {
      badges: this.parkState.badges,
      onClose: () => this.closeBadgePanel(),
    });
  }

  private closeBadgePanel(): void {
    const panel = this.badgePanel;
    this.badgePanel = null;
    panel?.destroy(true);
  }

  private canStartActivity(): boolean {
    return (
      this.activity === null &&
      !this.fetching &&
      this.toyPanel === null &&
      this.badgePanel === null &&
      this.intro === null
    );
  }

  private finishActivity(): void {
    this.activity = null;
    this.fetching = false;
    this.petBusy = false;
    this.petView.setDepth(Math.round(this.petView.y));
  }

  private goBack(): void {
    if (this.activity || this.fetching) {
      return;
    }
    this.cameras.main.fadeOut(200, 168, 216, 240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TOWN);
    });
  }
}
