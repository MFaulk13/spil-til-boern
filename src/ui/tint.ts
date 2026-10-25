import Phaser from 'phaser';

function supportsNativeTint(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

function tintColor(tint: number): string {
  return `#${(tint & 0xffffff).toString(16).padStart(6, '0')}`;
}

function getSourceSize(source: HTMLImageElement | HTMLCanvasElement): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

function buildTintedCanvas(
  scene: Phaser.Scene,
  baseKey: string,
  tint: number,
  maxSize?: number,
): HTMLCanvasElement | null {
  const texture = scene.textures.get(baseKey);
  if (!texture || texture.key === '__MISSING') {
    return null;
  }

  const source = texture.getSourceImage();
  if (!(source instanceof HTMLImageElement) && !(source instanceof HTMLCanvasElement)) {
    return null;
  }

  const sourceSize = getSourceSize(source);
  if (sourceSize.width <= 0 || sourceSize.height <= 0) {
    return null;
  }

  const scale = maxSize ? Math.min(1, maxSize / Math.max(sourceSize.width, sourceSize.height)) : 1;
  const width = Math.max(1, Math.round(sourceSize.width * scale));
  const height = Math.max(1, Math.round(sourceSize.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.drawImage(source, 0, 0, width, height);

  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = width;
  tintCanvas.height = height;
  const tintContext = tintCanvas.getContext('2d');
  if (tintContext) {
    tintContext.fillStyle = tintColor(tint);
    tintContext.fillRect(0, 0, width, height);
    tintContext.globalCompositeOperation = 'destination-in';
    tintContext.drawImage(source, 0, 0, width, height);

    context.globalCompositeOperation = 'multiply';
    context.drawImage(tintCanvas, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(source, 0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  }

  return canvas;
}

function getTintedKey(
  scene: Phaser.Scene,
  baseKey: string,
  tint: number,
  maxSize?: number,
): string {
  const key = `tint:${baseKey}:${tint}:${maxSize ?? 'full'}`;
  if (scene.textures.exists(key)) {
    return key;
  }
  const canvas = buildTintedCanvas(scene, baseKey, tint, maxSize);
  if (!canvas) {
    return baseKey;
  }
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function setTintableTexture(
  image: Phaser.GameObjects.Image,
  baseKey: string,
  tint: number | null,
  maxSize?: number,
): void {
  const targetKey = supportsNativeTint(image.scene)
    ? baseKey
    : tint === null
      ? baseKey
      : getTintedKey(image.scene, baseKey, tint, maxSize);

  if (image.texture.key !== targetKey) {
    image.setTexture(targetKey);
  }

  if (!supportsNativeTint(image.scene)) {
    return;
  }

  if (tint === null) {
    image.clearTint();
  } else {
    image.setTint(tint);
  }
}
