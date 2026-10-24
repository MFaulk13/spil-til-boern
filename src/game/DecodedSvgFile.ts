import Phaser from 'phaser';

export interface SvgRasterSize {
  width: number;
  height: number;
}

const DECODE_TIMEOUT_MS = 15000;
const DECODE_FALLBACK_MS = 50;

export class DecodedSvgFile extends Phaser.Loader.File {
  private readonly rasterSize: SvgRasterSize;

  constructor(
    loader: Phaser.Loader.LoaderPlugin,
    key: string,
    url: string,
    rasterSize: SvgRasterSize,
  ) {
    super(loader, {
      type: 'decoded-svg',
      cache: loader.textureManager,
      extension: 'svg',
      responseType: 'text',
      key,
      url,
      config: rasterSize,
    } as Phaser.Types.Loader.FileConfig);
    this.rasterSize = rasterSize;
  }

  override onProcess(): void {
    this.state = Phaser.Loader.FILE_PROCESSING;

    const text = this.xhrLoader?.responseText;
    if (!text) {
      this.onProcessError();
      return;
    }

    const svg = this.resizeSvg(text);
    if (!svg) {
      this.onProcessError();
      return;
    }

    const image = new Image();
    this.data = image;

    let settled = false;
    let timer = 0;

    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      Phaser.Loader.File.revokeObjectURL(image);
      this.onProcessComplete();
    };

    const fail = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      Phaser.Loader.File.revokeObjectURL(image);
      this.onProcessError();
    };

    timer = window.setTimeout(fail, DECODE_TIMEOUT_MS);

    image.onload = () => {
      if (typeof image.decode !== 'function') {
        window.setTimeout(finish, DECODE_FALLBACK_MS);
        return;
      }
      image.decode().then(finish, () => {
        window.setTimeout(finish, DECODE_FALLBACK_MS);
      });
    };
    image.onerror = fail;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    if (typeof URL === 'function' && typeof URL.createObjectURL === 'function') {
      image.src = URL.createObjectURL(blob);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        fail();
        return;
      }
      const base64 = reader.result.split(',')[1];
      if (!base64) {
        fail();
        return;
      }
      image.src = `data:image/svg+xml;base64,${base64}`;
    };
    reader.onerror = fail;
    reader.readAsDataURL(blob);
  }

  override addToCache(): void {
    const textures = this.cache as Phaser.Textures.TextureManager;
    textures.addImage(this.key, this.data as HTMLImageElement);
  }

  private resizeSvg(text: string): string | null {
    try {
      const xml = new DOMParser().parseFromString(text, 'text/xml');
      if (xml.getElementsByTagName('parsererror').length > 0) {
        return null;
      }

      const svg = xml.getElementsByTagName('svg')[0];
      if (!svg) {
        return null;
      }

      if (!svg.hasAttribute('viewBox')) {
        const width = Number.parseFloat(svg.getAttribute('width') ?? '');
        const height = Number.parseFloat(svg.getAttribute('height') ?? '');
        if (width > 0 && height > 0) {
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
      }

      const { width, height } = this.rasterSize;
      if (!(width > 0) || !(height > 0)) {
        return null;
      }

      svg.setAttribute('width', `${width}px`);
      svg.setAttribute('height', `${height}px`);

      return new XMLSerializer().serializeToString(svg);
    } catch {
      return null;
    }
  }
}
