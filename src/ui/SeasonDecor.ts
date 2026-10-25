import Phaser from 'phaser';
import type { SeasonThemeDefinition } from '@/game/catalog/seasons';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { currentSeasonTheme } from '@/systems/season';
import { audio } from '@/systems/audio';
import { isLowMemoryMode } from '@/game/device';
import { isReducedMotion } from '@/systems/motion';
import { text } from '@/game/text';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export type SeasonMode = 'menu' | 'indoor' | 'outdoor';

interface DecorLayout {
  x: number;
  y: number;
  size: number;
  angle: number;
  alpha: number;
  flipX?: boolean;
}

const DECOR_LAYOUTS: Record<SeasonMode, readonly DecorLayout[]> = {
  menu: [
    { x: 74, y: 232, size: 142, angle: -7, alpha: 0.92 },
    { x: 1186, y: 232, size: 96, angle: 9, alpha: 0.58, flipX: true },
  ],
  indoor: [{ x: 1202, y: 168, size: 150, angle: 5, alpha: 0.94 }],
  outdoor: [
    { x: 1188, y: 196, size: 150, angle: 5, alpha: 0.96 },
    { x: 92, y: 196, size: 98, angle: -8, alpha: 0.6, flipX: true },
  ],
};

const FALLING_PARTICLES = new Set(['petals', 'leaves', 'snow', 'confetti']);
const RISING_PARTICLES = new Set(['embers']);
const TWINKLING_PARTICLES = new Set(['sun', 'sparks', 'fireworks']);

function seasonDepth(mode: SeasonMode, layer: 'wash' | 'decor' | 'particles'): number {
  if (mode === 'menu') {
    return 0;
  }
  const depths = { wash: -9, decor: -8, particles: -7 };
  return depths[layer];
}

export function applySeasonTheme(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition = currentSeasonTheme(),
  mode: SeasonMode = 'indoor',
): void {
  if (mode !== 'menu') {
    addSeasonWash(scene, theme, mode);
  }
  addSeasonDecor(scene, theme, mode);
  addSeasonParticles(scene, theme, mode);
}

export function addSeasonWash(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition,
  mode: SeasonMode,
): void {
  const depth = seasonDepth(mode, 'wash');
  scene.add
    .rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      theme.palette.wash,
      theme.palette.washAlpha,
    )
    .setDepth(depth);

  if (mode === 'outdoor') {
    scene.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 100,
        GAME_WIDTH,
        220,
        theme.palette.ground,
        theme.palette.groundAlpha,
      )
      .setDepth(depth + 0.1);
  }
}

export function addSeasonDecor(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition,
  mode: SeasonMode,
): void {
  if (!scene.textures.exists(theme.decorKey)) {
    return;
  }
  const depth = seasonDepth(mode, 'decor');
  if (mode === 'indoor') {
    addSeasonGarland(scene, theme, depth);
  }
  for (const layout of DECOR_LAYOUTS[mode]) {
    scene.add
      .image(layout.x, layout.y, theme.decorKey)
      .setDisplaySize(layout.size, layout.size)
      .setAngle(layout.angle)
      .setFlipX(layout.flipX ?? false)
      .setAlpha(layout.alpha)
      .setDepth(depth);
  }
}

function addSeasonGarland(scene: Phaser.Scene, theme: SeasonThemeDefinition, depth: number): void {
  const graphics = scene.add.graphics().setDepth(depth);
  const startX = 42;
  const endX = GAME_WIDTH - 42;
  const lineY = 146;
  const steps = 13;
  const step = (endX - startX) / steps;

  graphics.lineStyle(2, theme.palette.accent, 0.28);
  for (let index = 0; index < steps; index += 1) {
    const x = startX + step * index;
    const nextX = x + step;
    const y = lineY + (index % 2 === 0 ? 0 : 7);
    const nextY = lineY + ((index + 1) % 2 === 0 ? 0 : 7);
    graphics.lineBetween(x, y, nextX, nextY);
  }

  for (let index = 1; index <= steps; index += 1) {
    const x = startX + step * index - step / 2;
    const y = lineY + (index % 2 === 0 ? 7 : 0) + 12;
    const color = theme.particleColors[index % theme.particleColors.length] ?? theme.palette.accent;
    graphics.fillStyle(color, 0.9);
    if (theme.particle === 'leaves') {
      graphics.fillEllipse(x, y, 13, 7);
    } else if (theme.particle === 'confetti' || theme.particle === 'fireworks') {
      graphics.fillRect(x - 4, y - 3, 8, 6);
    } else {
      graphics.fillCircle(x, y, theme.particle === 'snow' ? 4 : 5);
    }
  }
}

export function addSeasonLabel(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition = currentSeasonTheme(),
  x = 24,
  y = 20,
  onOpen?: () => void,
): Phaser.GameObjects.Container {
  const width = 300;
  const height = 78;
  const container = scene.add.container(x, y).setDepth(5);
  const background = scene.add.graphics();
  background.fillStyle(COLORS.panel, 0.95);
  background.fillRoundedRect(0, 0, width, height, 24);
  background.lineStyle(3, theme.palette.accent, 0.85);
  background.strokeRoundedRect(0, 0, width, height, 24);

  const icon = scene.add.image(32, height / 2, theme.decorKey).setDisplaySize(42, 42);
  const label = scene.add
    .text(58, 24, text.seasons.current(theme.label), {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      color: COLORS.text,
      fontStyle: 'bold',
    })
    .setOrigin(0, 0.5);
  const greeting = scene.add
    .text(58, 50, theme.greeting, {
      fontFamily: FONT_FAMILY,
      fontSize: '15px',
      color: COLORS.textMuted,
    })
    .setOrigin(0, 0.5);

  const infoDot = scene.add
    .circle(width - 26, height / 2, 16, theme.palette.accent, 1)
    .setStrokeStyle(3, 0xffffff, 0.75);
  const infoMark = scene.add
    .text(width - 26, height / 2, '?', {
      fontFamily: FONT_FAMILY,
      fontSize: '19px',
      color: COLORS.textDark,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);

  container.add([background, icon, label, greeting, infoDot, infoMark]);

  if (onOpen) {
    const hit = scene.add
      .rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setOrigin(0)
      .setInteractive();
    hit.on('pointerover', () => {
      if (!isReducedMotion()) {
        container.setScale(1.02);
      }
    });
    hit.on('pointerout', () => container.setScale(1));
    hit.on('pointerup', () => {
      container.setScale(1);
      audio.play('click');
      onOpen();
    });
    container.add(hit);
  }

  return container;
}

export function addSeasonParticles(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition,
  mode: SeasonMode,
): void {
  if (isReducedMotion()) {
    return;
  }

  const baseCount = mode === 'outdoor' ? 16 : mode === 'indoor' ? 12 : 10;
  const count = isLowMemoryMode() ? Math.max(4, Math.floor(baseCount / 2)) : baseCount;
  const depth = seasonDepth(mode, 'particles');

  for (let index = 0; index < count; index += 1) {
    const color = Phaser.Utils.Array.GetRandom([...theme.particleColors]);
    const particle = createParticle(scene, theme, color);
    particle.setDepth(depth);
    animateParticle(scene, particle, theme, mode);
  }
}

function createParticle(
  scene: Phaser.Scene,
  theme: SeasonThemeDefinition,
  color: number,
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const particle = theme.particle;
  const size = particle === 'snow' ? Phaser.Math.Between(3, 6) : Phaser.Math.Between(4, 8);

  graphics.fillStyle(color, particle === 'leaves' ? 0.85 : 0.9);
  if (particle === 'leaves') {
    graphics.fillEllipse(0, 0, size * 2.1, size);
    graphics.lineStyle(2, 0x6a4a2a, 0.45);
    graphics.lineBetween(-size, 0, size, 0);
  } else if (particle === 'confetti' || particle === 'fireworks') {
    graphics.fillRect(-size / 2, -size / 3, size, size * 0.66);
  } else if (particle === 'sparks' || particle === 'embers') {
    graphics.fillCircle(0, 0, size * 0.7);
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(-size * 0.2, -size * 0.2, size * 0.22);
  } else {
    graphics.fillCircle(0, 0, size * 0.75);
  }

  graphics.setPosition(
    Phaser.Math.Between(24, GAME_WIDTH - 24),
    particle === 'sun' || particle === 'fireworks' || particle === 'sparks'
      ? Phaser.Math.Between(90, GAME_HEIGHT - 120)
      : Phaser.Math.Between(-120, GAME_HEIGHT),
  );
  graphics.setAngle(Phaser.Math.Between(0, 359));
  return graphics;
}

function animateParticle(
  scene: Phaser.Scene,
  particle: Phaser.GameObjects.Graphics,
  theme: SeasonThemeDefinition,
  mode: SeasonMode,
): void {
  const duration = Phaser.Math.Between(7500, 15000);
  const delay = Phaser.Math.Between(0, 5000);
  const type = theme.particle;

  if (FALLING_PARTICLES.has(type)) {
    const startY = particle.y;
    const targetY = GAME_HEIGHT + 60;
    particle.setAlpha(0.75);
    scene.tweens.add({
      targets: particle,
      y: targetY,
      duration,
      delay,
      repeat: -1,
      ease: 'Linear',
      onRepeat: () => {
        particle.setY(startY);
        particle.setX(Phaser.Math.Between(24, GAME_WIDTH - 24));
      },
    });
    scene.tweens.add({
      targets: particle,
      x: particle.x + Phaser.Math.Between(-46, 46),
      duration: Phaser.Math.Between(2200, 4200),
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: particle,
      angle: particle.angle + Phaser.Math.Between(180, 540),
      duration: duration * 1.4,
      delay,
      repeat: -1,
      ease: 'Linear',
    });
    return;
  }

  if (RISING_PARTICLES.has(type)) {
    const startY = GAME_HEIGHT - Phaser.Math.Between(80, 200);
    particle.setY(startY);
    particle.setAlpha(0);
    scene.tweens.add({
      targets: particle,
      y: startY - Phaser.Math.Between(160, 360),
      alpha: { from: 0, to: 0.85 },
      duration: Phaser.Math.Between(2600, 5200),
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return;
  }

  if (TWINKLING_PARTICLES.has(type)) {
    particle.setAlpha(0.25);
    if (mode === 'menu' || mode === 'indoor') {
      particle.setY(Phaser.Math.Between(70, 320));
    }
    scene.tweens.add({
      targets: particle,
      alpha: { from: 0.2, to: 0.9 },
      scale: { from: 0.7, to: 1.2 },
      duration: Phaser.Math.Between(1400, 3200),
      delay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: particle,
      angle: particle.angle + Phaser.Math.Between(120, 360),
      duration: Phaser.Math.Between(4000, 9000),
      delay,
      repeat: -1,
      ease: 'Linear',
    });
    return;
  }

  scene.tweens.add({
    targets: particle,
    alpha: { from: 0.4, to: 0.9 },
    duration: Phaser.Math.Between(1800, 3600),
    delay,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}
