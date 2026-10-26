import Phaser from 'phaser';
import { logLoaderErrors, queueSvgAsset } from '@/game/assetLoader';
import { CORE_ASSETS } from '@/game/assets';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '@/game/constants';
import { describeWebGL, isLowMemoryMode } from '@/game/device';
import { text } from '@/game/text';
import { getSpeechDiagnostics } from '@/systems/speech';
import { COLORS, FONT_FAMILY } from '@/ui/theme';

const BAR_WIDTH = 500;
const BAR_HEIGHT = 24;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload(): void {
    this.createLoadingUi();
    logLoaderErrors(this.load);

    const lowMemory = isLowMemoryMode();
    for (const asset of CORE_ASSETS) {
      queueSvgAsset(this.load, asset, lowMemory);
    }
  }

  create(): void {
    void this.finishLoading();
  }

  private async finishLoading(): Promise<void> {
    await this.ensureTexturesReady();
    this.logDiagnostics();
    this.scene.start(SCENE_KEYS.MENU);
  }

  private async ensureTexturesReady(): Promise<void> {
    for (const asset of CORE_ASSETS) {
      if (!this.textures.exists(asset.key)) {
        continue;
      }

      const texture = this.textures.get(asset.key);
      const source = texture.getSourceImage();
      if (!(source instanceof HTMLImageElement)) {
        continue;
      }

      if (typeof source.decode === 'function') {
        await source.decode().catch(() => undefined);
      }

      const textureSource = texture.source[0];
      if (!textureSource || textureSource.width === 0 || textureSource.height === 0) {
        this.textures.remove(asset.key);
        this.textures.addImage(asset.key, source);
      }
    }
  }

  private logDiagnostics(): void {
    const renderer = this.game.renderer;
    const isWebGL = renderer.type === Phaser.WEBGL;
    const gl = isWebGL ? (renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl : null;

    console.warn('[gotar] renderer', isWebGL ? 'webgl' : 'canvas');
    console.warn('[gotar] GPU', describeWebGL(gl));
    console.warn(
      '[gotar] maxTextures',
      isWebGL ? (renderer as Phaser.Renderer.WebGL.WebGLRenderer).maxTextures : 'canvas',
    );
    console.warn('[gotar] lowmem', isLowMemoryMode());

    const speech = getSpeechDiagnostics();
    console.warn(
      '[gotar] tale',
      speech.voiceCount === 0
        ? 'ingen stemmer indlæst endnu'
        : `${speech.voiceCount} stemmer, dansk=${speech.danishVoice ?? 'mangler'}, engelsk=${speech.englishVoice ?? 'mangler'}`,
    );

    const missing = CORE_ASSETS.filter((asset) => !this.textures.exists(asset.key));
    if (missing.length > 0) {
      console.warn('[gotar] manglende teksturer', missing.map((asset) => asset.key).join(', '));
    }

    const bytes = CORE_ASSETS.reduce((total, asset) => {
      if (!this.textures.exists(asset.key)) {
        return total;
      }
      const source = this.textures.get(asset.key).source[0];
      return total + (source ? source.width * source.height * 4 : 0);
    }, 0);
    console.warn('[gotar] teksturer', `${(bytes / 1048576).toFixed(1)} MB`);
  }

  private createLoadingUi(): void {
    const centerX = GAME_WIDTH / 2;
    const barY = GAME_HEIGHT / 2 + 50;
    const left = centerX - BAR_WIDTH / 2;

    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(centerX, GAME_HEIGHT / 2 - 90, text.title, {
        fontFamily: FONT_FAMILY,
        fontSize: '120px',
        color: COLORS.textAccent,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 8, '#ffffff', 0, true, true);

    this.add
      .text(centerX, GAME_HEIGHT / 2 + 92, text.loading, {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const frame = this.add
      .rectangle(centerX, barY, BAR_WIDTH + 18, BAR_HEIGHT + 18, COLORS.panel)
      .setStrokeStyle(5, COLORS.accent, 1);

    const fill = this.add.rectangle(left, barY, 0, BAR_HEIGHT, COLORS.teal).setOrigin(0, 0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      fill.setSize(BAR_WIDTH * progress, BAR_HEIGHT);
    });

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      frame.destroy();
      fill.destroy();
    });
  }
}
