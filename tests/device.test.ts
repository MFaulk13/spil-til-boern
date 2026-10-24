import { describe, expect, it } from 'vitest';
import { getRasterSize, type AssetEntry } from '@/game/assets';
import {
  getAntialias,
  getFpsLimit,
  getMaxTextures,
  getRendererMode,
  isLegacyFirefox,
  isLowMemoryMode,
} from '@/game/device';

const FIREFOX_115 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0';
const FIREFOX_138 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0';

describe('device detection', () => {
  it('detects legacy Firefox versions', () => {
    expect(isLegacyFirefox(FIREFOX_115)).toBe(true);
    expect(isLegacyFirefox(FIREFOX_138)).toBe(false);
    expect(isLegacyFirefox('Mozilla/5.0 Chrome/140.0 Safari/537.36')).toBe(false);
  });

  it('enables low-memory mode on legacy Firefox', () => {
    expect(isLowMemoryMode({ userAgent: FIREFOX_115, search: '' })).toBe(true);
    expect(isLowMemoryMode({ userAgent: FIREFOX_138, search: '' })).toBe(false);
  });

  it('respects the lowmem override', () => {
    expect(isLowMemoryMode({ userAgent: FIREFOX_138, search: '?lowmem=1' })).toBe(true);
    expect(isLowMemoryMode({ userAgent: FIREFOX_115, search: '?lowmem=0' })).toBe(false);
  });

  it('parses the renderer override', () => {
    expect(getRendererMode({ search: '?renderer=canvas' })).toBe('canvas');
    expect(getRendererMode({ search: '?renderer=webgl' })).toBe('webgl');
    expect(getRendererMode({ search: '' })).toBe('auto');
  });

  it('caps texture units in low-memory mode', () => {
    expect(getMaxTextures({ userAgent: FIREFOX_115, search: '' })).toBe(5);
    expect(getMaxTextures({ userAgent: FIREFOX_138, search: '' })).toBe(-1);
  });

  it('parses the maxtextures override', () => {
    expect(getMaxTextures({ userAgent: FIREFOX_115, search: '?maxtextures=4' })).toBe(4);
    expect(getMaxTextures({ userAgent: FIREFOX_138, search: '?maxtextures=16' })).toBe(16);
    expect(getMaxTextures({ userAgent: FIREFOX_138, search: '?maxtextures=0' })).toBe(-1);
    expect(getMaxTextures({ userAgent: FIREFOX_138, search: '?maxtextures=abc' })).toBe(-1);
  });

  it('parses the antialias and quality overrides', () => {
    expect(getAntialias({ search: '' })).toBe(true);
    expect(getAntialias({ search: '?aa=0' })).toBe(false);
    expect(getAntialias({ search: '?aa=1' })).toBe(true);
    expect(getAntialias({ search: '?quality=low' })).toBe(false);
    expect(getAntialias({ search: '?quality=low&aa=1' })).toBe(true);
  });

  it('parses the fps and quality overrides', () => {
    expect(getFpsLimit({ search: '' })).toBe(0);
    expect(getFpsLimit({ search: '?fps=30' })).toBe(30);
    expect(getFpsLimit({ search: '?fps=0' })).toBe(0);
    expect(getFpsLimit({ search: '?quality=low' })).toBe(30);
    expect(getFpsLimit({ search: '?quality=low&fps=60' })).toBe(60);
    expect(getFpsLimit({ search: '?quality=high' })).toBe(0);
  });
});

describe('raster sizes', () => {
  const character: AssetEntry = {
    key: 'body-base',
    url: 'body-base.svg',
    width: 384,
    height: 384,
    kind: 'character',
  };
  const pet: AssetEntry = {
    key: 'pet-dog',
    url: 'pet-dog.svg',
    width: 384,
    height: 384,
    kind: 'pet',
  };
  const egg: AssetEntry = {
    key: 'egg-base',
    url: 'egg-base.svg',
    width: 256,
    height: 320,
    kind: 'egg',
  };
  const room: AssetEntry = {
    key: 'room-living',
    url: 'room-living.svg',
    width: 1280,
    height: 720,
    kind: 'scene',
  };
  const item: AssetEntry = { key: 'toy-ball', url: 'toy-ball.svg', width: 64, height: 64 };

  it('reduces figures, pets and eggs in low-memory mode', () => {
    expect(getRasterSize(character, true)).toEqual({ width: 256, height: 256 });
    expect(getRasterSize(pet, true)).toEqual({ width: 256, height: 256 });
    expect(getRasterSize(egg, true)).toEqual({ width: 192, height: 240 });
  });

  it('keeps full raster sizes outside low-memory mode', () => {
    expect(getRasterSize(character, false)).toEqual({ width: 384, height: 384 });
    expect(getRasterSize(pet, false)).toEqual({ width: 384, height: 384 });
    expect(getRasterSize(egg, false)).toEqual({ width: 256, height: 320 });
  });

  it('leaves scenes and items untouched', () => {
    expect(getRasterSize(room, true)).toEqual({ width: 1280, height: 720 });
    expect(getRasterSize(item, true)).toEqual({ width: 64, height: 64 });
  });
});
