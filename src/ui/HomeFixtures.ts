import Phaser from 'phaser';
import type { HomeFixture, HomeFixtureId } from '@/game/types';
import { COLORS } from '@/ui/theme';

export class HomeFixtures {
  private readonly scene: Phaser.Scene;
  private readonly onActivate: (fixture: HomeFixture) => void;
  private readonly views = new Map<HomeFixtureId, Phaser.GameObjects.Container>();

  constructor(
    scene: Phaser.Scene,
    fixtures: readonly HomeFixture[],
    onActivate: (fixture: HomeFixture) => void,
  ) {
    this.scene = scene;
    this.onActivate = onActivate;

    for (const fixture of fixtures) {
      this.views.set(fixture.id, this.create(fixture));
    }
  }

  get(id: HomeFixtureId): Phaser.GameObjects.Container | undefined {
    return this.views.get(id);
  }

  destroy(): void {
    for (const view of this.views.values()) {
      view.destroy(true);
    }
    this.views.clear();
  }

  private create(fixture: HomeFixture): Phaser.GameObjects.Container {
    const container = this.scene.add.container(fixture.x, fixture.y).setDepth(fixture.y);
    const graphics = this.scene.add.graphics();

    switch (fixture.id) {
      case 'bowl':
        this.drawBowl(graphics);
        break;
      case 'ball':
        this.drawBall(graphics);
        break;
      case 'cushion':
        this.drawCushion(graphics);
        break;
    }

    container.add(graphics);
    this.setHitArea(container, fixture.id);
    container.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.onActivate(fixture);
      },
    );

    return container;
  }

  private setHitArea(container: Phaser.GameObjects.Container, id: HomeFixtureId): void {
    const area = {
      bowl: new Phaser.Geom.Rectangle(-72, -96, 144, 116),
      ball: new Phaser.Geom.Rectangle(-64, -94, 128, 114),
      cushion: new Phaser.Geom.Rectangle(-84, -92, 168, 114),
    }[id];

    container.setInteractive(area, Phaser.Geom.Rectangle.Contains);
  }

  private drawBowl(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(COLORS.ink, 0.14);
    graphics.fillEllipse(0, -2, 104, 26);
    graphics.fillStyle(COLORS.teal, 1);
    graphics.fillRoundedRect(-46, -36, 92, 38, { tl: 12, tr: 12, bl: 20, br: 20 });
    graphics.fillStyle(COLORS.tealDark, 1);
    graphics.fillEllipse(0, -36, 92, 26);
    graphics.fillStyle(0xfff1dd, 1);
    graphics.fillEllipse(0, -36, 68, 16);
    graphics.fillStyle(0xe7b782, 1);
    graphics.fillEllipse(0, -35, 58, 11);
    graphics.lineStyle(3, COLORS.ink, 0.18);
    graphics.strokeEllipse(0, -36, 92, 26);
  }

  private drawBall(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(COLORS.ink, 0.14);
    graphics.fillEllipse(0, -2, 78, 22);
    graphics.fillStyle(COLORS.accent, 1);
    graphics.fillCircle(0, -34, 32);
    graphics.fillStyle(COLORS.primary, 0.9);
    graphics.fillCircle(-12, -44, 9);
    graphics.fillCircle(14, -24, 7);
    graphics.lineStyle(4, 0xffffff, 0.7);
    graphics.strokeCircle(0, -34, 32);
    graphics.lineStyle(3, COLORS.accentDark, 0.6);
    graphics.beginPath();
    graphics.arc(0, -34, 19, Math.PI * 1.1, Math.PI * 1.9);
    graphics.strokePath();
  }

  private drawCushion(graphics: Phaser.GameObjects.Graphics): void {
    graphics.fillStyle(COLORS.ink, 0.14);
    graphics.fillEllipse(0, -2, 126, 26);
    graphics.fillStyle(COLORS.lavender, 1);
    graphics.fillRoundedRect(-60, -34, 120, 44, 18);
    graphics.fillStyle(0xdccaf3, 1);
    graphics.fillRoundedRect(-50, -28, 100, 30, 14);
    graphics.lineStyle(3, COLORS.ink, 0.16);
    graphics.strokeRoundedRect(-60, -34, 120, 44, 18);
  }
}
