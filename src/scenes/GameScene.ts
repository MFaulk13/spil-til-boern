import Phaser from 'phaser';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  PLAY_AREA_TOP,
  PLAY_BOUNDS,
  REGISTRY_KEYS,
  SCENE_KEYS,
  STAR_GOAL,
  STAR_SIZE,
} from '@/game/constants';
import { audio } from '@/systems/audio';
import { save } from '@/systems/save';
import { COLORS } from '@/ui/theme';
import { clamp, distance, moveTowards } from '@/utils/math';

const CLOUDS = [
  { x: 190, y: 210, radius: 46 },
  { x: 570, y: 250, radius: 34 },
  { x: 1090, y: 220, radius: 52 },
] as const;

const KEY_LAYOUT = { up: 'W', down: 'S', left: 'A', right: 'D' } as const;

type DirectionKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private star!: Phaser.GameObjects.Image;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: DirectionKeys;
  private readonly target = new Phaser.Math.Vector2();
  private readonly moveDirection = new Phaser.Math.Vector2();
  private starsCollected = 0;
  private finished = false;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create(): void {
    this.starsCollected = 0;
    this.finished = false;

    this.createBackground();

    this.player = this.add
      .image(GAME_WIDTH / 2, (PLAY_BOUNDS.top + PLAY_BOUNDS.bottom) / 2, 'player')
      .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);

    this.star = this.add.image(0, 0, 'star').setDisplaySize(STAR_SIZE, STAR_SIZE);
    this.tweens.add({
      targets: this.star,
      angle: 360,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    });
    this.target.copy(this.player);
    this.placeStar();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys(KEY_LAYOUT) as DirectionKeys | undefined;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);

    this.registry.set(REGISTRY_KEYS.STARS, 0);
    this.registry.set(REGISTRY_KEYS.GOAL, STAR_GOAL);
    this.registry.set(REGISTRY_KEYS.BEST, save.bestScore);
    this.registry.set(REGISTRY_KEYS.NEW_RECORD, false);
    this.registry.set(REGISTRY_KEYS.COMPLETE, false);

    if (!this.scene.isActive(SCENE_KEYS.UI)) {
      this.scene.launch(SCENE_KEYS.UI);
    }
  }

  override update(_time: number, delta: number): void {
    if (this.finished) {
      return;
    }

    const seconds = delta / 1000;
    const direction = this.readKeyboardDirection();

    if (direction.lengthSq() > 0) {
      direction.normalize().scale(PLAYER_SPEED * seconds);
      this.player.x = clamp(this.player.x + direction.x, PLAY_BOUNDS.left, PLAY_BOUNDS.right);
      this.player.y = clamp(this.player.y + direction.y, PLAY_BOUNDS.top, PLAY_BOUNDS.bottom);
      this.target.copy(this.player);
    } else {
      const remaining = distance(this.player.x, this.player.y, this.target.x, this.target.y);
      if (remaining > 4) {
        const step = Math.min(remaining, PLAYER_SPEED * seconds);
        this.player.x = clamp(
          moveTowards(this.player.x, this.target.x, step),
          PLAY_BOUNDS.left,
          PLAY_BOUNDS.right,
        );
        this.player.y = clamp(
          moveTowards(this.player.y, this.target.y, step),
          PLAY_BOUNDS.top,
          PLAY_BOUNDS.bottom,
        );
      }
    }

    const collectRadius = (PLAYER_SIZE + STAR_SIZE) * 0.38;
    if (distance(this.player.x, this.player.y, this.star.x, this.star.y) < collectRadius) {
      this.collectStar();
    }
  }

  private readKeyboardDirection(): Phaser.Math.Vector2 {
    const direction = this.moveDirection.set(0, 0);

    if (this.cursors?.left.isDown || this.wasd?.left.isDown) {
      direction.x -= 1;
    }
    if (this.cursors?.right.isDown || this.wasd?.right.isDown) {
      direction.x += 1;
    }
    if (this.cursors?.up.isDown || this.wasd?.up.isDown) {
      direction.y -= 1;
    }
    if (this.cursors?.down.isDown || this.wasd?.down.isDown) {
      direction.y += 1;
    }

    return direction;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y < PLAY_AREA_TOP) {
      return;
    }
    this.setTarget(pointer.x, pointer.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.isDown && pointer.y >= PLAY_AREA_TOP) {
      this.setTarget(pointer.x, pointer.y);
    }
  }

  private setTarget(x: number, y: number): void {
    this.target.set(
      clamp(x, PLAY_BOUNDS.left, PLAY_BOUNDS.right),
      clamp(y, PLAY_BOUNDS.top, PLAY_BOUNDS.bottom),
    );
  }

  private collectStar(): void {
    this.starsCollected += 1;
    audio.play('collect');
    this.spawnBurst(this.star.x, this.star.y);
    this.registry.set(REGISTRY_KEYS.STARS, this.starsCollected);

    if (this.starsCollected >= STAR_GOAL) {
      this.finish();
      return;
    }

    this.placeStar();
    this.cameras.main.shake(90, 0.002);
  }

  private placeStar(): void {
    let placed = false;

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const x = Phaser.Math.Between(PLAY_BOUNDS.left + 30, PLAY_BOUNDS.right - 30);
      const y = Phaser.Math.Between(PLAY_BOUNDS.top + 30, PLAY_BOUNDS.bottom - 30);

      if (distance(x, y, this.player.x, this.player.y) > 220) {
        this.star.setPosition(x, y);
        placed = true;
        break;
      }
    }

    if (!placed) {
      this.star.setPosition(PLAY_BOUNDS.right - 80, PLAY_BOUNDS.top + 60);
    }
  }

  private spawnBurst(x: number, y: number): void {
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      const spark = this.add
        .image(x, y, 'star')
        .setDisplaySize(30, 30)
        .setTint(COLORS.accent)
        .setAlpha(0.9);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 110,
        y: y + Math.sin(angle) * 110,
        alpha: 0,
        duration: 380,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private finish(): void {
    this.finished = true;
    audio.play('win');
    this.star.setVisible(false);
    this.cameras.main.flash(240, 255, 209, 102);

    const previousBest = save.bestScore;
    save.addStars(this.starsCollected);
    save.recordRun(this.starsCollected);

    this.registry.set(REGISTRY_KEYS.BEST, save.bestScore);
    this.registry.set(REGISTRY_KEYS.NEW_RECORD, this.starsCollected > previousBest);
    this.registry.set(REGISTRY_KEYS.COMPLETE, true);
  }

  private createBackground(): void {
    const graphics = this.add.graphics();

    graphics.fillGradientStyle(
      COLORS.backgroundTop,
      COLORS.backgroundTop,
      COLORS.backgroundBottom,
      COLORS.backgroundBottom,
      1,
    );
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (const cloud of CLOUDS) {
      graphics.fillStyle(0xffffff, 0.07);
      graphics.fillCircle(cloud.x, cloud.y, cloud.radius);
      graphics.fillCircle(cloud.x + cloud.radius, cloud.y + 12, cloud.radius * 0.75);
      graphics.fillCircle(cloud.x - cloud.radius, cloud.y + 16, cloud.radius * 0.6);
    }

    graphics.fillStyle(COLORS.hill, 1);
    graphics.fillEllipse(260, GAME_HEIGHT - 30, 760, 300);
    graphics.fillEllipse(1050, GAME_HEIGHT - 20, 860, 260);

    graphics.fillStyle(COLORS.ground, 1);
    graphics.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    graphics.fillStyle(COLORS.groundDark, 1);
    graphics.fillRect(0, GAME_HEIGHT - 22, GAME_WIDTH, 22);

    for (let x = 40; x < GAME_WIDTH; x += 90) {
      graphics.fillStyle(0xffffff, 0.06);
      graphics.fillCircle(x + (x % 180 === 0 ? 12 : 0), GAME_HEIGHT - 60, 7);
    }
  }
}
