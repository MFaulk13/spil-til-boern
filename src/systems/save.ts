export interface SaveData {
  version: number;
  settings: {
    sound: boolean;
  };
  progress: {
    stars: number;
    bestScore: number;
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'spil:save';
const SAVE_VERSION = 1;
const PROBE_KEY = 'spil:probe';

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { sound: true },
    progress: { stars: 0, bestScore: 0 },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readCount(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

export function parseSave(raw: string | null): SaveData {
  const fallback = createDefaultSave();
  if (!raw) {
    return fallback;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  if (!isRecord(parsed)) {
    return fallback;
  }

  const settings = isRecord(parsed.settings) ? parsed.settings : {};
  const progress = isRecord(parsed.progress) ? parsed.progress : {};

  return {
    version: SAVE_VERSION,
    settings: {
      sound: readBoolean(settings.sound, fallback.settings.sound),
    },
    progress: {
      stars: readCount(progress.stars, fallback.progress.stars),
      bestScore: readCount(progress.bestScore, fallback.progress.bestScore),
    },
  };
}

export function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function resolveStorage(): StorageLike {
  try {
    const storage = globalThis.localStorage;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return createMemoryStorage();
  }
}

export class SaveManager {
  private data: SaveData;

  constructor(private storage: StorageLike = resolveStorage()) {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      this.storage = createMemoryStorage();
    }
    this.data = parseSave(raw);
  }

  get soundEnabled(): boolean {
    return this.data.settings.sound;
  }

  get stars(): number {
    return this.data.progress.stars;
  }

  get bestScore(): number {
    return this.data.progress.bestScore;
  }

  setSoundEnabled(enabled: boolean): void {
    if (this.data.settings.sound === enabled) {
      return;
    }
    this.data.settings.sound = enabled;
    this.persist();
  }

  addStars(count: number): void {
    if (count <= 0) {
      return;
    }
    this.data.progress.stars += Math.floor(count);
    this.persist();
  }

  recordRun(score: number): void {
    if (score <= 0 || score <= this.data.progress.bestScore) {
      return;
    }
    this.data.progress.bestScore = Math.floor(score);
    this.persist();
  }

  resetProgress(): void {
    this.data.progress = { stars: 0, bestScore: 0 };
    this.persist();
  }

  private persist(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      this.storage = createMemoryStorage();
    }
  }
}

export const save = new SaveManager();
