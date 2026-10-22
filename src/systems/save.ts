import {
  clampNeed,
  isPetId,
  isRoomId,
  type CharacterLook,
  type Needs,
  type PetState,
  type PlacedFurniture,
  type SaveData,
} from '@/game/types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'gotar:save';
const LEGACY_STORAGE_KEY = 'spil:save';
const SAVE_VERSION = 2;
const PROBE_KEY = 'gotar:probe';
const STARTING_HEARTS = 20;

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { sound: true },
    player: null,
    pet: null,
    wallet: { hearts: STARTING_HEARTS },
    inventory: {},
    home: { furniture: [] },
    flags: { tutorialDone: false },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readCount(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function parseLook(value: unknown): CharacterLook | null {
  if (!isRecord(value)) {
    return null;
  }

  const skin = readText(value.skin);
  const hair = readText(value.hair);
  const hairColor = readText(value.hairColor);
  const eyes = readText(value.eyes);
  const mouth = readText(value.mouth);
  const outfit = readText(value.outfit);
  const outfitColor = readText(value.outfitColor);
  const accessory = value.accessory === null ? null : readText(value.accessory);

  if (
    !skin ||
    !hair ||
    !hairColor ||
    !eyes ||
    !mouth ||
    !outfit ||
    !outfitColor ||
    (value.accessory !== null && !accessory)
  ) {
    return null;
  }

  return { skin, hair, hairColor, eyes, mouth, outfit, outfitColor, accessory };
}

function parseNeeds(value: unknown): Needs {
  const record = isRecord(value) ? value : {};
  return {
    hunger: clampNeed(typeof record.hunger === 'number' ? record.hunger : 100),
    joy: clampNeed(typeof record.joy === 'number' ? record.joy : 100),
    energy: clampNeed(typeof record.energy === 'number' ? record.energy : 100),
  };
}

function parsePet(value: unknown): PetState | null {
  if (!isRecord(value) || !isPetId(value.id)) {
    return null;
  }

  const name = readText(value.name);
  if (!name) {
    return null;
  }

  return {
    id: value.id,
    name,
    needs: parseNeeds(value.needs),
    bond: readCount(value.bond, 0),
    hatchedAt: readCount(value.hatchedAt, 0),
  };
}

function parseInventory(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const inventory: Record<string, number> = {};
  for (const [itemId, count] of Object.entries(value)) {
    if (count === 0) {
      continue;
    }
    const parsed = readCount(count, 0);
    if (parsed > 0) {
      inventory[itemId] = parsed;
    }
  }
  return inventory;
}

function parseFurniture(value: unknown): PlacedFurniture[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const furniture: PlacedFurniture[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const uid = readText(entry.uid);
    const itemId = readText(entry.itemId);
    if (!uid || !itemId || !isRoomId(entry.room)) {
      continue;
    }
    if (typeof entry.x !== 'number' || typeof entry.y !== 'number') {
      continue;
    }
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) {
      continue;
    }
    furniture.push({
      uid,
      itemId,
      room: entry.room,
      x: entry.x,
      y: entry.y,
    });
  }
  return furniture;
}

function readSound(parsed: Record<string, unknown>, fallback: boolean): boolean {
  const settings = isRecord(parsed.settings) ? parsed.settings : {};
  return readBoolean(settings.sound, fallback);
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

  const sound = readSound(parsed, fallback.settings.sound);
  if (parsed.version !== SAVE_VERSION) {
    return { ...fallback, settings: { sound } };
  }

  const player = isRecord(parsed.player) ? parsed.player : null;
  const look = player ? parseLook(player.look) : null;
  const wallet = isRecord(parsed.wallet) ? parsed.wallet : {};
  const home = isRecord(parsed.home) ? parsed.home : {};
  const flags = isRecord(parsed.flags) ? parsed.flags : {};

  return {
    version: SAVE_VERSION,
    settings: { sound },
    player: look ? { look } : null,
    pet: parsePet(parsed.pet),
    wallet: { hearts: readCount(wallet.hearts, STARTING_HEARTS) },
    inventory: parseInventory(parsed.inventory),
    home: { furniture: parseFurniture(home.furniture) },
    flags: {
      tutorialDone: readBoolean(flags.tutorialDone, fallback.flags.tutorialDone),
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
      raw = this.storage.getItem(STORAGE_KEY) ?? this.storage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      this.storage = createMemoryStorage();
    }
    this.data = parseSave(raw);
  }

  get soundEnabled(): boolean {
    return this.data.settings.sound;
  }

  get playerLook(): CharacterLook | null {
    return this.data.player?.look ?? null;
  }

  get pet(): PetState | null {
    return this.data.pet;
  }

  get hearts(): number {
    return this.data.wallet.hearts;
  }

  get inventory(): Readonly<Record<string, number>> {
    return this.data.inventory;
  }

  get furniture(): readonly PlacedFurniture[] {
    return this.data.home.furniture;
  }

  get tutorialDone(): boolean {
    return this.data.flags.tutorialDone;
  }

  setSoundEnabled(enabled: boolean): void {
    if (this.data.settings.sound === enabled) {
      return;
    }
    this.data.settings.sound = enabled;
    this.persist();
  }

  setPlayerLook(look: CharacterLook): void {
    this.data.player = { look: { ...look } };
    this.persist();
  }

  setPet(pet: PetState): void {
    this.data.pet = { ...pet, needs: { ...pet.needs } };
    this.persist();
  }

  updateNeeds(needs: Needs): void {
    if (!this.data.pet) {
      return;
    }
    this.data.pet.needs = {
      hunger: clampNeed(needs.hunger),
      joy: clampNeed(needs.joy),
      energy: clampNeed(needs.energy),
    };
    this.persist();
  }

  addHearts(count: number): void {
    if (count <= 0) {
      return;
    }
    this.data.wallet.hearts += Math.floor(count);
    this.persist();
  }

  spendHearts(count: number): boolean {
    const cost = Math.max(0, Math.floor(count));
    if (cost > this.data.wallet.hearts) {
      return false;
    }
    this.data.wallet.hearts -= cost;
    this.persist();
    return true;
  }

  addItem(itemId: string, count = 1): void {
    if (!itemId || count <= 0) {
      return;
    }
    this.data.inventory[itemId] = (this.data.inventory[itemId] ?? 0) + Math.floor(count);
    this.persist();
  }

  consumeItem(itemId: string): boolean {
    const count = this.data.inventory[itemId] ?? 0;
    if (count <= 0) {
      return false;
    }
    if (count === 1) {
      delete this.data.inventory[itemId];
    } else {
      this.data.inventory[itemId] = count - 1;
    }
    this.persist();
    return true;
  }

  addFurniture(furniture: PlacedFurniture): void {
    this.data.home.furniture.push({ ...furniture });
    this.persist();
  }

  moveFurniture(uid: string, x: number, y: number): boolean {
    const furniture = this.data.home.furniture.find((item) => item.uid === uid);
    if (!furniture || !Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }
    furniture.x = x;
    furniture.y = y;
    this.persist();
    return true;
  }

  removeFurniture(uid: string): boolean {
    const index = this.data.home.furniture.findIndex((item) => item.uid === uid);
    if (index < 0) {
      return false;
    }
    this.data.home.furniture.splice(index, 1);
    this.persist();
    return true;
  }

  setTutorialDone(done: boolean): void {
    if (this.data.flags.tutorialDone === done) {
      return;
    }
    this.data.flags.tutorialDone = done;
    this.persist();
  }

  resetGame(): void {
    const sound = this.data.settings.sound;
    this.data = { ...createDefaultSave(), settings: { sound } };
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
