export type RendererMode = 'auto' | 'webgl' | 'canvas';

export interface DeviceQuery {
  userAgent?: string;
  search?: string;
}

function getSearch(search?: string): string {
  if (search !== undefined) {
    return search;
  }
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.search;
}

function getUserAgent(userAgent?: string): string {
  if (userAgent !== undefined) {
    return userAgent;
  }
  if (typeof navigator === 'undefined') {
    return '';
  }
  return navigator.userAgent;
}

export function isLegacyFirefox(userAgent = getUserAgent()): boolean {
  const match = /Firefox\/(\d+)/.exec(userAgent);
  return match ? Number(match[1]) <= 120 : false;
}

export function isLowMemoryMode(options: DeviceQuery = {}): boolean {
  const params = new URLSearchParams(getSearch(options.search));
  const override = params.get('lowmem');
  if (override === '1') {
    return true;
  }
  if (override === '0') {
    return false;
  }
  return isLegacyFirefox(getUserAgent(options.userAgent));
}

export function getRendererMode(options: DeviceQuery = {}): RendererMode {
  const params = new URLSearchParams(getSearch(options.search));
  const renderer = params.get('renderer');
  if (renderer === 'canvas') {
    return 'canvas';
  }
  if (renderer === 'webgl') {
    return 'webgl';
  }
  return 'auto';
}

const LOW_MEMORY_MAX_TEXTURES = 8;

export function getMaxTextures(options: DeviceQuery = {}): number {
  const params = new URLSearchParams(getSearch(options.search));
  const raw = params.get('maxtextures');
  if (raw !== null) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value >= 1 && value <= 64) {
      return value;
    }
  }
  return isLowMemoryMode(options) ? LOW_MEMORY_MAX_TEXTURES : -1;
}

export function getAntialias(options: DeviceQuery = {}): boolean {
  const params = new URLSearchParams(getSearch(options.search));
  const antialias = params.get('aa');
  if (antialias === '0') {
    return false;
  }
  if (antialias === '1') {
    return true;
  }
  return params.get('quality') !== 'low';
}

export function getFpsLimit(options: DeviceQuery = {}): number {
  const params = new URLSearchParams(getSearch(options.search));
  const raw = params.get('fps');
  if (raw !== null) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value >= 0 && value <= 120) {
      return value;
    }
  }
  return params.get('quality') === 'low' ? 30 : 0;
}

export function describeWebGL(gl: WebGLRenderingContext | null): string {
  if (!gl) {
    return 'ingen WebGL-kontekst';
  }

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL))
    : 'ukendt producent';
  const renderer = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : 'ukendt GPU';
  const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
  const textureUnits = Number(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));

  return `${vendor} / ${renderer} (max tekstur ${maxTextureSize}, ${textureUnits} teksturenheder)`;
}
