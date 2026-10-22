import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { text } from '@/game/text';
import { clampNeed, type Needs, type WorldRect } from '@/game/types';
import { audio } from '@/systems/audio';
import { save } from '@/systems/save';
import { Button } from '@/ui/Button';
import { CharacterView } from '@/ui/CharacterView';
import { PetView } from '@/ui/PetView';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const BOUNDS: WorldRect = { left: 170, right: 1110, top: 470, bottom: 620 };
const MOVE_SPEED = 320;
const PET_FOLLOW_GAP = 116;
const PET_FOLLOW_SPEED = 6;
const BALL_START = { x: 980, y: 584 };
const FETCH_REWARD_HEARTS = 2;
const FETCH_REWARD_JOY = 20;

export class ParkScene extends Phaser.Scene {
  private character!: CharacterView;
  private petView!: PetView;
  private ball!: Phaser.GameObjects.Container;
  private ballGlow?: Phaser.GameObjects.Arc;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facingRight = true;
  private petFacingRight = true;
  private fetching = false;
  private fetchReadyAt = 0;
  private heartsText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.PARK);
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
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'park');

    this.createTopBar();
    this.createHint();

    this.character = new CharacterView(this, 760, 575, 210, save.playerLook ?? undefined);
    this.character.startIdle();
    this.character.setDepth(575);

    this.petView = new PetView(this, 890, 575, 172, pet.id);
    this.petView.startIdle();
    this.petView.setDepth(601);

    this.ball = this.createBall();
    this.setupInput();
    this.cameras.main.fadeIn(240, 168, 216, 240);
  }

  override update(_time: number, delta: number): void {
    const seconds = Math.min(delta, 120) / 1000;
    this.updateMovement(seconds);
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

    const heartPanel = this.add.graphics();
    heartPanel.fillStyle(COLORS.panel, 0.95);
    heartPanel.fillRoundedRect(1046, 24, 204, 66, 24);
    heartPanel.lineStyle(4, COLORS.accent, 0.6);
    heartPanel.strokeRoundedRect(1046, 24, 204, 66, 24);

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

    container.setInteractive(
      new Phaser.Geom.Circle(0, -18, 54),
      Phaser.Geom.Circle.Contains,
    );
    container.on('pointerup', () => this.startFetch());
    return container;
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as
      | Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
      | undefined;
    this.input.keyboard?.on('keydown-ESC', () => this.goBack());

    const zone = this.add
      .zone(GAME_WIDTH / 2, 545, GAME_WIDTH, 150)
      .setDepth(1)
      .setInteractive();
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.fetching) {
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
    const desiredY = Phaser.Math.Clamp(
      this.character.y + 2,
      BOUNDS.top + 6,
      BOUNDS.bottom,
    );
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

  private startFetch(): void {
    if (this.fetching || this.time.now < this.fetchReadyAt || !save.pet) {
      return;
    }
    this.fetching = true;
    this.moveTarget = null;

    const targetX = Phaser.Math.Clamp(
      this.petView.x + Phaser.Math.Between(-240, 240),
      BOUNDS.left + 60,
      BOUNDS.right - 60,
    );
    const targetY = Phaser.Math.Clamp(this.petView.y + 20, BOUNDS.top + 10, BOUNDS.bottom);
    const distance = Phaser.Math.Distance.Between(
      this.petView.x,
      this.petView.y,
      targetX,
      targetY,
    );

    this.ballGlow?.setVisible(false);
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
    this.petView.playJoy();
    audio.play('play');

    this.grantReward();

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
        this.ball.setPosition(homeX + (this.petFacingRight ? 76 : -76), BOUNDS.bottom - 10);
        this.ball.setAlpha(1);
        this.ballGlow?.setVisible(true);
        this.petView.setDepth(Math.round(this.petView.y));
        this.fetching = false;
        this.fetchReadyAt = this.time.now + 900;
      },
    });
  }

  private grantReward(): void {
    const pet = save.pet;
    if (!pet) {
      return;
    }

    const joyBefore = pet.needs.joy;
    const needs: Needs = {
      ...pet.needs,
      joy: clampNeed(joyBefore + FETCH_REWARD_JOY),
    };
    save.updateNeeds(needs);

    if (needs.joy <= joyBefore) {
      return;
    }

    save.addHearts(FETCH_REWARD_HEARTS);
    this.heartsText?.setText(String(save.hearts));
    this.spawnHearts(this.petView.x, this.petView.y - 150);
    this.showToast(text.park.reward(FETCH_REWARD_HEARTS));
  }

  private spawnHearts(x: number, y: number): void {
    for (let index = 0; index < FETCH_REWARD_HEARTS; index += 1) {
      const heart = this.add
        .image(x + Phaser.Math.Between(-28, 28), y + Phaser.Math.Between(-8, 12), 'icon-heart')
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
    if (this.fetching) {
      return;
    }
    this.cameras.main.fadeOut(200, 168, 216, 240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENE_KEYS.TOWN);
    });
  }
}
