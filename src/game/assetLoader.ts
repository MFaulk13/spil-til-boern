import Phaser from 'phaser';
import { DecodedSvgFile } from '@/game/DecodedSvgFile';
import { getAsset, getRasterSize, type AssetEntry } from '@/game/assets';
import { isLowMemoryMode } from '@/game/device';

const observedLoaders = new WeakSet<Phaser.Loader.LoaderPlugin>();

export function logLoaderErrors(loader: Phaser.Loader.LoaderPlugin): void {
  if (observedLoaders.has(loader)) {
    return;
  }
  observedLoaders.add(loader);
  loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    console.warn('[gotar] Kunne ikke indlæse', file.key, file.src);
  });
}

export function queueSvgAsset(
  loader: Phaser.Loader.LoaderPlugin,
  asset: AssetEntry,
  lowMemory = isLowMemoryMode(),
): void {
  const { width, height } = getRasterSize(asset, lowMemory);
  loader.addFile(new DecodedSvgFile(loader, asset.key, asset.url, { width, height }));
}

export function loadMissingAssets(
  loader: Phaser.Loader.LoaderPlugin,
  textures: Phaser.Textures.TextureManager,
  keys: readonly string[],
): number {
  const lowMemory = isLowMemoryMode();
  let count = 0;
  for (const key of keys) {
    if (textures.exists(key)) {
      continue;
    }
    const asset = getAsset(key);
    if (!asset) {
      continue;
    }
    queueSvgAsset(loader, asset, lowMemory);
    count += 1;
  }
  if (count > 0) {
    logLoaderErrors(loader);
  }
  return count;
}
