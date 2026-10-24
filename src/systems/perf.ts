import Phaser from 'phaser';
import { getAntialias, getFpsLimit, isLowMemoryMode } from '@/game/device';

interface FlushCapableRenderer {
  type: number;
  maxTextures?: number;
  flush?: () => void;
}

function isPerfMode(): boolean {
  return new URLSearchParams(window.location.search).get('perf') === '1';
}

export function bindPerformanceOverlay(game: Phaser.Game): () => void {
  if (!isPerfMode()) {
    return () => undefined;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed',
    'top:8px',
    'left:8px',
    'z-index:9999',
    'padding:6px 8px',
    'border-radius:6px',
    'background:rgba(20,20,24,0.82)',
    'color:#fff',
    'font:12px/1.45 ui-monospace,Consolas,monospace',
    'white-space:pre',
    'pointer-events:none',
  ].join(';');
  overlay.textContent = '[gotar] perf';
  document.body.append(overlay);

  const renderer = game.renderer as unknown as FlushCapableRenderer;
  const originalFlush = renderer.flush;
  let flushCount = 0;
  if (originalFlush) {
    const boundFlush = originalFlush.bind(renderer);
    renderer.flush = () => {
      flushCount += 1;
      boundFlush();
    };
  }

  let framesSince = 0;
  let lastFlushCount = 0;
  let lastSample = performance.now();

  const onPostRender = (): void => {
    framesSince += 1;
  };
  game.events.on(Phaser.Core.Events.POST_RENDER, onPostRender);

  const interval = window.setInterval(() => {
    const now = performance.now();
    const elapsed = now - lastSample;
    if (elapsed <= 0) {
      return;
    }

    const fps = (framesSince * 1000) / elapsed;
    const flushes = flushCount - lastFlushCount;
    const batchesPerFrame = framesSince > 0 ? (flushes / framesSince).toFixed(1) : 'n/a';
    framesSince = 0;
    lastFlushCount = flushCount;
    lastSample = now;

    const scenes = game.scene.getScenes(true);
    const objectCount = scenes.reduce((total, scene) => total + scene.children.length, 0);
    const tweenCount = scenes.reduce((total, scene) => total + scene.tweens.getTweens().length, 0);
    const sceneInfo = scenes
      .map((scene) => `${scene.sys.settings.key}:${scene.children.length}`)
      .join(' ');
    const maxTextures = renderer.type === Phaser.WEBGL ? (renderer.maxTextures ?? '?') : 'canvas';

    const frameMs = fps > 0 ? (1000 / fps).toFixed(1) : 'n/a';

    overlay.textContent = [
      `FPS ${fps.toFixed(0)}  frame ${frameMs}ms`,
      `batches/frame ${batchesPerFrame}  objects ${objectCount}  tweens ${tweenCount}`,
      `textures ${game.textures.getTextureKeys().length}  maxTextures ${maxTextures}`,
      `aa ${getAntialias() ? 'on' : 'off'}  fpsLimit ${getFpsLimit() || 'off'}  lowmem ${isLowMemoryMode()}`,
      `scenes ${sceneInfo}`,
    ].join('\n');
  }, 500);

  return () => {
    window.clearInterval(interval);
    game.events.off(Phaser.Core.Events.POST_RENDER, onPostRender);
    if (originalFlush) {
      renderer.flush = originalFlush;
    }
    overlay.remove();
  };
}
