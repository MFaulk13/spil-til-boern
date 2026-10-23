import Phaser from 'phaser';
import type { QuizVisual } from '@/game/catalog/quiz';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

export function drawQuizVisual(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  visual: QuizVisual,
  centerX = 1030,
  centerY = 245,
): void {
  switch (visual.kind) {
    case 'clock':
      drawClock(scene, layer, visual.hour, visual.minute, centerX, centerY);
      return;
    case 'coins':
      drawCoins(scene, layer, visual.coins, centerX, centerY);
      return;
    case 'fraction':
      drawFraction(scene, layer, visual.numerator, visual.denominator, centerX, centerY);
      return;
    case 'shape':
      drawShape(scene, layer, visual.shape, centerX, centerY);
      return;
    case 'numberLine':
      drawNumberLine(scene, layer, visual, centerX, centerY);
  }
}

function drawClock(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  hour: number,
  minute: number,
  centerX: number,
  centerY: number,
): void {
  const radius = 50;
  const graphics = scene.add.graphics();
  graphics.fillStyle(COLORS.panel, 1);
  graphics.fillCircle(centerX, centerY, radius);
  graphics.lineStyle(5, COLORS.ink, 0.85);
  graphics.strokeCircle(centerX, centerY, radius);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = radius - (index % 3 === 0 ? 13 : 9);
    graphics.lineStyle(index % 3 === 0 ? 4 : 2, COLORS.ink, 0.65);
    graphics.beginPath();
    graphics.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    graphics.lineTo(
      centerX + Math.cos(angle) * (radius - 5),
      centerY + Math.sin(angle) * (radius - 5),
    );
    graphics.strokePath();
  }

  const hourAngle = (((hour % 12) + minute / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
  graphics.lineStyle(6, COLORS.primaryDark, 1);
  graphics.beginPath();
  graphics.moveTo(centerX, centerY);
  graphics.lineTo(
    centerX + Math.cos(hourAngle) * (radius * 0.48),
    centerY + Math.sin(hourAngle) * (radius * 0.48),
  );
  graphics.strokePath();
  graphics.lineStyle(4, COLORS.tealDark, 1);
  graphics.beginPath();
  graphics.moveTo(centerX, centerY);
  graphics.lineTo(
    centerX + Math.cos(minuteAngle) * (radius * 0.72),
    centerY + Math.sin(minuteAngle) * (radius * 0.72),
  );
  graphics.strokePath();
  graphics.fillStyle(COLORS.ink, 1);
  graphics.fillCircle(centerX, centerY, 5);
  layer.add(graphics);
}

function drawCoins(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  coins: readonly number[],
  centerX: number,
  centerY: number,
): void {
  if (coins.length === 0) {
    return;
  }
  const spacing = 44;
  const totalWidth = (coins.length - 1) * spacing;
  const colors: Record<number, number> = {
    1: 0xd9a05b,
    2: 0xc7c9cc,
    5: 0xe0b84a,
    10: 0xe0b84a,
    20: 0xe0b84a,
  };

  coins.forEach((coin, index) => {
    const x = centerX - totalWidth / 2 + index * spacing;
    const circle = scene.add.graphics();
    circle.fillStyle(colors[coin] ?? COLORS.accent, 1);
    circle.fillCircle(x, centerY, 19);
    circle.lineStyle(3, COLORS.ink, 0.7);
    circle.strokeCircle(x, centerY, 19);
    circle.fillStyle(0xffffff, 0.28);
    circle.fillCircle(x - 5, centerY - 6, 5);
    layer.add(circle);

    const label = scene.add
      .text(x, centerY, String(coin), {
        fontFamily: FONT_FAMILY,
        fontSize: '17px',
        color: COLORS.textDark,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    layer.add(label);
  });
}

function drawFraction(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  numerator: number,
  denominator: number,
  centerX: number,
  centerY: number,
): void {
  const radius = 54;
  const graphics = scene.add.graphics();
  const start = -Math.PI / 2;

  for (let index = 0; index < denominator; index += 1) {
    const from = start + (index / denominator) * Math.PI * 2;
    const to = start + ((index + 1) / denominator) * Math.PI * 2;
    graphics.fillStyle(index < numerator ? COLORS.accent : COLORS.panelLight, 1);
    graphics.beginPath();
    graphics.moveTo(centerX, centerY);
    graphics.arc(centerX, centerY, radius, from, to);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(2, COLORS.ink, 0.4);
    graphics.strokePath();
  }

  graphics.lineStyle(5, COLORS.ink, 0.85);
  graphics.strokeCircle(centerX, centerY, radius);
  layer.add(graphics);
}

function drawShape(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  shape: 'circle' | 'square' | 'triangle' | 'rectangle',
  centerX: number,
  centerY: number,
): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(COLORS.teal, 0.9);
  graphics.lineStyle(5, COLORS.ink, 0.85);

  if (shape === 'circle') {
    graphics.fillCircle(centerX, centerY, 50);
    graphics.strokeCircle(centerX, centerY, 50);
  } else if (shape === 'square') {
    graphics.fillRoundedRect(centerX - 50, centerY - 50, 100, 100, 8);
    graphics.strokeRoundedRect(centerX - 50, centerY - 50, 100, 100, 8);
  } else if (shape === 'rectangle') {
    graphics.fillRoundedRect(centerX - 66, centerY - 40, 132, 80, 8);
    graphics.strokeRoundedRect(centerX - 66, centerY - 40, 132, 80, 8);
  } else {
    graphics.beginPath();
    graphics.moveTo(centerX, centerY - 54);
    graphics.lineTo(centerX + 54, centerY + 44);
    graphics.lineTo(centerX - 54, centerY + 44);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  layer.add(graphics);
}

function drawNumberLine(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  visual: { from: number; to: number; step: number; mark: number },
  centerX: number,
  centerY: number,
): void {
  const width = 200;
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const ticks = Math.round((visual.to - visual.from) / visual.step);
  const graphics = scene.add.graphics();

  graphics.lineStyle(4, COLORS.ink, 0.8);
  graphics.beginPath();
  graphics.moveTo(left, centerY);
  graphics.lineTo(right, centerY);
  graphics.strokePath();

  for (let index = 0; index <= ticks; index += 1) {
    const x = left + (index / ticks) * width;
    graphics.lineStyle(index === 0 || index === ticks ? 4 : 2, COLORS.ink, 0.65);
    graphics.beginPath();
    graphics.moveTo(x, centerY - 9);
    graphics.lineTo(x, centerY + 9);
    graphics.strokePath();
  }

  const markRatio = (visual.mark - visual.from) / (visual.to - visual.from);
  const markX = left + markRatio * width;
  graphics.fillStyle(COLORS.primary, 1);
  graphics.fillTriangle(markX - 10, centerY - 42, markX + 10, centerY - 42, markX, centerY - 16);
  graphics.lineStyle(4, COLORS.primary, 1);
  graphics.beginPath();
  graphics.moveTo(markX, centerY - 16);
  graphics.lineTo(markX, centerY - 2);
  graphics.strokePath();
  layer.add(graphics);

  const fromLabel = scene.add
    .text(left, centerY + 22, String(visual.from), {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      color: COLORS.textMuted,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const toLabel = scene.add
    .text(right, centerY + 22, String(visual.to), {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      color: COLORS.textMuted,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  layer.add([fromLabel, toLabel]);
}
