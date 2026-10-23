import Phaser from 'phaser';
import { loadMissingAssets } from '@/game/assets';
import type { ItemDefinition } from '@/game/catalog/items';
import { getToyPlay, ownedToys, type ToyPlayStyle } from '@/game/catalog/toys';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { clampNeed, type Needs, type WorldRect } from '@/game/types';
import { audio } from '@/systems/audio';
import { isReducedMotion } from '@/systems/motion';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { CharacterView } from '@/ui/CharacterView';
import { PetView } from '@/ui/PetView';
import { ToyPanel } from '@/ui/ToyPanel';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const BOUNDS: WorldRect = { left: 170, right: 1110, top: 470, bottom: 620 };
const MOVE_SPEED = 320;
const PET_FOLLOW_GAP = 116;
const PET_FOLLOW_SPEED = 6;
const BALL_START = { x: 980, y: 584 };
const TOY_BOX_POS = { x: 210, y: 540 };
const BUBBLE_POS = { x: 700, y: 448 };
const POND_POS = { x: 470, y: 600 };
const FETCH_SPARKLES = 2;
const BALL_REWARD_JOY = 20;
const BUBBLE_COUNT = 6;
const BUBBLE_REWARD_JOY = 4;
const BUBBLE_ROUND_MS = 3600;
const DUCK_REWARD_JOY = 12;

export class ParkScene extends Phaser.Scene {
  private character!: CharacterView;
  private petView!: PetView;
  private ball!: Phaser.GameObjects.Container;
  private ballGlow?: Phaser.GameObjects.Arc;
  private pondDucks: Phaser.GameObjects.Image[] = [];
  private bubbles: Phaser.GameObjects.Container[] = [];
  private toyPanel: ToyPanel | null = null;
  private joyFill?: Phaser.GameObjects.Graphics;
  private joyText?: Phaser.GameObjects.Text;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facingRight = true;
  private petFacingRight = true;
  private fetching = false;
  private fetchReadyAt = 0;
  private toyBusy = false;
  private bubbleRoundActive = false;
  private bubbleReadyAt = 0;
  private ducksActive = false;
  private duckReadyAt = 0;

  constructor() {
    super(SCENE_KEYS.PARK);
  }

  preload(): void {
    loadMissingAssets(this.load, this.textures, ['park']);
  }

  create(): void {
    const pet = save.pet;
    if (!pet) {
      this.scene.start(SCENE_KEYS.MENU);
      return;
    }

    this.moveTarget = null;
    this.fetching = false;
    this.fetchReadyAt = 0;
    this.toyBusy = false;
    this.bubbleRoundActive = false;
    this.bubbleReadyAt = 0;
    this.ducksActive = false;
    this.duckReadyAt = 0;
    this.bubbles = [];
    this.pondDucks = [];
    this.toyPanel = null;

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'park');

    this.createTopBar();
    this.createHint();

    this.character = new CharacterView(this, 760, 575, 210, save.playerLook ?? undefined);
    this.character.startIdle();
    this.character.setDepth(575);

    this.petView = new PetView(this, 890, 575, 172, pet.id, pet.accessory);
    this.petView.startIdle();
    this.petView.setDepth(601);

    this.ball = this.createBall();
    this.createToyBox();
    this.createBubbleStation();
    this.createPond();
    this.setupInput();
    this.cameras.main.fadeIn(240, 168, 216, 240);
  }

  override update(_time: number, delta: number): void {
    if (this.toyPanel) {
      this.character.setWalking(false);
      return;
    }
    const seconds = Math.min(delta, 120) / 1000;
    this.updateMovement(seconds);
  }

  private get busy(): boolean {
    return (
      this.fetching ||
      this.toyBusy ||
      this.bubbleRoundActive ||
      this.ducksActive ||
      this.toyPanel !== null
    );
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

  private createHint(): void {
    const hint = this.add
      .text(GAME_WIDTH / 2, 136, text.park.hint, {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: COLORS.text,
        backgroundColor: '#fff8ee',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setAlpha(0.96);

    if (isReducedMotion()) {
      return;
    }
    this.tweens.add({
      targets: hint,
      alpha: 0.75,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createBall(): Phaser.GameObjects.Container {
    const container = this.add.container(BALL_START.x, BALL_START.y).setDepth(BALL_START.y);
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

    container.setInteractive(new Phaser.Geom.Circle(0, -18, 66), Phaser.Geom.Circle.Contains);
    container.on('pointerup', () => this.startBallFetch());
    return container;
  }

  private createToyBox(): void {
    const container = this.add.container(TOY_BOX_POS.x, TOY_BOX_POS.y).setDepth(TOY_BOX_POS.y);
    const glow = this.add.circle(0, -34, 62, COLORS.accent, 0.22);
    const shadow = this.add.ellipse(0, 16, 118, 28, COLORS.ink, 0.16);
    const box = this.add.image(0, -46, 'furniture-toy-box').setDisplaySize(108, 108);
    const label = this.add
      .text(0, 32, text.park.toyBox, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.text,
        fontStyle: 'bold',
        backgroundColor: '#fff8ee',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5);
    container.add([glow, shadow, box, label]);

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

    const zone = this.add
      .zone(TOY_BOX_POS.x, TOY_BOX_POS.y - 12, 214, 200)
      .setDepth(TOY_BOX_POS.y + 1)
      .setInteractive();
    zone.on('pointerup', () => this.openToyBox());
  }

  private createBubbleStation(): void {
    const container = this.add.container(BUBBLE_POS.x, BUBBLE_POS.y).setDepth(BUBBLE_POS.y);
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

    const label = this.add
      .text(0, 58, text.park.bubbles, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.text,
        fontStyle: 'bold',
        backgroundColor: '#fff8ee',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5);

    container.add([glow, shadow, jar, ...foam, wand, label]);

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

    const zone = this.add
      .zone(BUBBLE_POS.x, BUBBLE_POS.y - 8, 214, 210)
      .setDepth(BUBBLE_POS.y + 1)
      .setInteractive();
    zone.on('pointerup', () => this.blowBubbles());
  }

  private createPond(): void {
    const glow = this.add.ellipse(POND_POS.x, POND_POS.y - 6, 300, 104, COLORS.sky, 0.24);
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
      this.createDuck(POND_POS.x - 54, POND_POS.y - 4),
      this.createDuck(POND_POS.x + 58, POND_POS.y + 6),
    ];

    this.add
      .text(POND_POS.x, POND_POS.y + 62, text.park.ducks, {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.text,
        fontStyle: 'bold',
        backgroundColor: '#fff8ee',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(650);

    const zone = this.add
      .zone(POND_POS.x, POND_POS.y, 340, 160)
      .setDepth(POND_POS.y + 10)
      .setInteractive();
    zone.on('pointerup', () => this.callDucks());
  }

  private createDuck(x: number, y: number): Phaser.GameObjects.Image {
    const duck = this.add
      .image(x, y, 'pet-duck')
      .setDisplaySize(58, 58)
      .setOrigin(0.5, 0.8)
      .setDepth(y + 2);
    duck.setFlipX(x > POND_POS.x);
    return duck;
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as
      Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.toyPanel) {
        this.closeToyPanel();
        return;
      }
      this.goBack();
    });
    this.input.keyboard?.on('keydown-SPACE', () => this.startBallFetch());
    this.input.keyboard?.on('keydown-T', () => this.openToyBox());
    this.input.keyboard?.on('keydown-B', () => this.blowBubbles());
    this.input.keyboard?.on('keydown-G', () => this.callDucks());

    const zone = this.add
      .zone(GAME_WIDTH / 2, 545, GAME_WIDTH, 170)
      .setDepth(1)
      .setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.busy) {
        return;
      }
      this.moveTarget = new Phaser.Math.Vector2(
        Phaser.Math.Clamp(pointer.worldX, BOUNDS.left, BOUNDS.right),
        Phaser.Math.Clamp(pointer.worldY, BOUNDS.top, BOUNDS.bottom),
      );
    });
  }

  private updateMovement(seconds: number): void {
    const direction = this.getKeyboardDirection();
    let moving = false;

    if (direction.lengthSq() > 0) {
      this.moveTarget = null;
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

    if (this.fetching) {
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
    if (this.busy || this.time.now < this.fetchReadyAt || !save.pet) {
      return;
    }
    this.startFetch(this.ball, this.ballGlow, BALL_REWARD_JOY, text.park.fetchReward, true);
  }

  private startToyFetch(item: ItemDefinition, joy: number): void {
    if (this.busy || !save.pet) {
      return;
    }
    const toy = this.createToySprite(item, this.petView.x, this.petView.y - 34);
    toy.setDepth(700);
    this.tweens.add({
      targets: toy,
      y: this.petView.y - 4,
      duration: 180,
      ease: 'Quad.easeOut',
    });
    this.startFetch(toy, undefined, joy, text.park.toyReward(item.label), false);
  }

  private startFetch(
    sprite: Phaser.GameObjects.Container,
    glow: Phaser.GameObjects.Arc | undefined,
    rewardJoy: number,
    message: string,
    permanent: boolean,
  ): void {
    this.fetching = true;
    this.moveTarget = null;

    const targetX = Phaser.Math.Clamp(
      this.petView.x + Phaser.Math.Between(-240, 240),
      BOUNDS.left + 60,
      BOUNDS.right - 60,
    );
    const targetY = Phaser.Math.Clamp(this.petView.y + 20, BOUNDS.top + 10, BOUNDS.bottom);
    const distance = Phaser.Math.Distance.Between(this.petView.x, this.petView.y, targetX, targetY);

    glow?.setVisible(false);
    this.tweens.add({
      targets: sprite,
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
        onComplete: () =>
          this.pickUpFetch(sprite, targetX, targetY, glow, rewardJoy, message, permanent),
      });
    });
  }

  private pickUpFetch(
    sprite: Phaser.GameObjects.Container,
    x: number,
    y: number,
    glow: Phaser.GameObjects.Arc | undefined,
    rewardJoy: number,
    message: string,
    permanent: boolean,
  ): void {
    this.tweens.add({
      targets: sprite,
      y: y - 30,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
    });
    this.petView.playJoy();
    audio.play('play');

    this.addJoy(rewardJoy, message);

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
        if (permanent) {
          sprite.setPosition(homeX + (this.petFacingRight ? 76 : -76), BOUNDS.bottom - 10);
          sprite.setAlpha(1);
          glow?.setVisible(true);
        } else {
          sprite.destroy(true);
        }
        this.petView.setDepth(Math.round(this.petView.y));
        this.fetching = false;
        this.fetchReadyAt = this.time.now + 900;
      },
    });
  }

  private openToyBox(): void {
    if (this.busy) {
      return;
    }
    const toys = ownedToys({ inventory: save.inventory, furniture: save.furniture });
    if (toys.length === 0) {
      audio.play('error');
      this.showToast(text.park.toysEmpty);
      return;
    }

    audio.play('click');
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
    if (this.busy || !save.pet) {
      return;
    }

    const play = getToyPlay(item.id);
    if (play.style === 'fetch') {
      this.startToyFetch(item, play.joy);
      return;
    }

    this.toyBusy = true;
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

    this.playToyReaction(play.style);
    this.addJoy(play.joy, text.park.toyReward(item.label));

    this.time.delayedCall(1600, () => {
      this.tweens.add({
        targets: toy,
        y: toy.y - 30,
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => toy.destroy(true),
      });
      this.toyBusy = false;
    });
  }

  private playToyReaction(style: ToyPlayStyle): void {
    audio.play('play');
    switch (style) {
      case 'cuddle':
        this.petView.playNod();
        this.spawnIcons('icon-joy', 3);
        break;
      case 'build':
        this.petView.playHop();
        this.spawnIcons('icon-star', 3);
        break;
      case 'music':
        this.petView.playJoy();
        this.spawnNotes(5);
        break;
      case 'create':
        this.petView.playNod();
        this.spawnIcons('icon-paint', 3);
        break;
      case 'scratch':
        this.petView.playHop();
        this.spawnIcons('icon-joy', 4);
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
    if (this.busy || this.time.now < this.bubbleReadyAt) {
      return;
    }

    this.bubbleRoundActive = true;
    this.bubbles = [];
    this.bubbleReadyAt = this.time.now + BUBBLE_ROUND_MS + 900;
    audio.play('bubble');

    this.petFacingRight = BUBBLE_POS.x > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);

    let popped = 0;
    for (let index = 0; index < BUBBLE_COUNT; index += 1) {
      const radius = Phaser.Math.Between(18, 30);
      const startX = BUBBLE_POS.x + Phaser.Math.Between(-100, 100);
      const startY = BUBBLE_POS.y + Phaser.Math.Between(-40, 10);
      const bubble = this.add.container(startX, startY).setDepth(700);
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
        popped += 1;
        this.petView.playJoy();
        this.addJoy(BUBBLE_REWARD_JOY);
      });

      this.bubbles.push(bubble);
      this.tweens.add({
        targets: bubble,
        x: startX + Phaser.Math.Between(-34, 34),
        y: startY - Phaser.Math.Between(150, 230),
        alpha: 0.15,
        duration: Phaser.Math.Between(2400, 3400),
        delay: index * 90,
        ease: 'Sine.easeInOut',
      });
    }

    this.time.delayedCall(BUBBLE_ROUND_MS, () => {
      for (const bubble of this.bubbles) {
        if (bubble.active) {
          bubble.destroy(true);
        }
      }
      this.bubbles = [];
      this.bubbleRoundActive = false;
      if (popped > 0) {
        this.showToast(text.park.bubblesReward);
      }
    });
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

  private callDucks(): void {
    if (this.busy || this.time.now < this.duckReadyAt) {
      return;
    }

    this.ducksActive = true;
    this.duckReadyAt = this.time.now + 3600;
    audio.play('quack');

    this.petFacingRight = POND_POS.x > this.petView.x;
    this.petView.setFacingRight(this.petFacingRight);
    this.petView.playJoy();

    this.pondDucks.forEach((duck, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      duck.setFlipX(direction < 0);
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

    this.time.delayedCall(2600, () => {
      this.ducksActive = false;
    });

    this.addJoy(DUCK_REWARD_JOY, text.park.ducksReward);
  }

  private addJoy(amount: number, message?: string): number {
    const pet = save.pet;
    if (!pet) {
      return 0;
    }

    const before = pet.needs.joy;
    const needs: Needs = {
      ...pet.needs,
      joy: clampNeed(before + amount),
    };
    save.updateNeeds(needs);
    this.updateJoyMeter();

    const gained = needs.joy - before;
    if (gained <= 0) {
      if (message) {
        this.showToast(text.park.joyFull);
      }
      return 0;
    }

    this.spawnJoy(this.petView.x, this.petView.y - 150);
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
    for (let index = 0; index < FETCH_SPARKLES; index += 1) {
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

  private showToast(message: string): void {
    const toast = this.add
      .text(this.petView.x, this.petView.y - 190, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
        backgroundColor: '#fff8ee',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(910);

    if (isReducedMotion()) {
      this.time.delayedCall(1600, () => toast.destroy());
      return;
    }
    this.tweens.add({
      targets: toast,
      y: toast.y - 40,
      alpha: 0,
      duration: 1300,
      delay: 300,
      ease: 'Quad.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  private goBack(): void {
    if (this.fetching || this.toyBusy) {
      return;
    }
    this.cameras.main.fadeOut(200, 168, 216, 240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TOWN);
    });
  }
}
