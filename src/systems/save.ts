import { getItem } from '@/game/catalog/items';
import { createPetUid } from '@/game/catalog/pets';
import {
  clampNeed,
  isPetId,
  isRoomId,
  QUIZ_SUBJECTS,
  type CharacterLook,
  type Needs,
  type PetId,
  type PetState,
  type PlacedFurniture,
  type QuizSubject,
  type SaveData,
  type SchoolProgress,
} from '@/game/types';
import { normalizeLook } from '@/systems/appearance';
import {
  EMPTY_SCHOOL_PROGRESS,
  nextSchoolProgress,
  type SchoolRoundResult,
} from '@/systems/school';
import { seedEquippedWardrobePurchases } from '@/systems/wardrobe';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = 'gotar:save';
const LEGACY_STORAGE_KEY = 'spil:save';
const SAVE_VERSION = 4;
const PROBE_KEY = 'gotar:probe';
const STARTING_HEARTS = 20;

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: { sound: true, reduceMotion: false },
    player: null,
    pets: [],
    activePetId: null,
    wallet: { hearts: STARTING_HEARTS, earnedHearts: 0 },
    inventory: {},
    purchases: {},
    home: { furniture: [] },
    school: { subjects: {} },
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
  const gender = readText(value.gender);

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

  return normalizeLook({
    gender: gender ?? undefined,
    skin,
    hair,
    hairColor,
    eyes,
    mouth,
    outfit,
    outfitColor,
    accessory,
  });
}

function parseNeeds(value: unknown): Needs {
  const record = isRecord(value) ? value : {};
  return {
    hunger: clampNeed(typeof record.hunger === 'number' ? record.hunger : 100),
    joy: clampNeed(typeof record.joy === 'number' ? record.joy : 100),
    energy: clampNeed(typeof record.energy === 'number' ? record.energy : 100),
  };
}

function normalizePetId(value: unknown): PetId | null {
  if (value === 'puppy') {
    return 'dog';
  }
  if (value === 'kitten') {
    return 'cat';
  }
  return isPetId(value) ? value : null;
}

function parsePet(value: unknown, fallbackUid?: string): PetState | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = normalizePetId(value.id);
  if (!id) {
    return null;
  }

  const name = readText(value.name);
  if (!name) {
    return null;
  }

  const accessoryId = readText(value.accessory);
  const accessory = accessoryId ? getItem(accessoryId) : undefined;
  const uid = readText(value.uid) ?? fallbackUid ?? createPetUid();

  return {
    uid,
    id,
    name,
    needs: parseNeeds(value.needs),
    bond: readCount(value.bond, 0),
    hatchedAt: readCount(value.hatchedAt, 0),
    accessory: accessory?.category === 'accessory' ? accessoryId : null,
  };
}

function parsePets(value: unknown, legacyPet: unknown): PetState[] {
  const rawPets = Array.isArray(value) ? value : legacyPet !== undefined ? [legacyPet] : [];
  const pets: PetState[] = [];
  const seen = new Set<string>();

  for (const entry of rawPets) {
    const pet = parsePet(entry);
    if (!pet) {
      continue;
    }
    if (seen.has(pet.uid)) {
      pet.uid = createPetUid();
    }
    seen.add(pet.uid);
    pets.push(pet);
  }

  return pets;
}

function parseInventory(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const inventory: Record<string, number> = {};
  for (const [itemId, count] of Object.entries(value)) {
    if (!getItem(itemId)) {
      continue;
    }
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

function parsePurchases(
  value: unknown,
  legacyCounts: Readonly<Record<string, number>>,
): Record<string, number> {
  const purchases: Record<string, number> = {};

  if (!isRecord(value)) {
    for (const [itemId, count] of Object.entries(legacyCounts)) {
      if (getItem(itemId) && count > 0) {
        purchases[itemId] = Math.floor(count);
      }
    }
    return purchases;
  }

  for (const [itemId, count] of Object.entries(value)) {
    if (!getItem(itemId)) {
      continue;
    }
    const parsed = readCount(count, 0);
    if (parsed > 0) {
      purchases[itemId] = parsed;
    }
  }
  return purchases;
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
    if (!uid || !itemId || !isRoomId(entry.room) || !getItem(itemId)?.placeable) {
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

function parseSchool(value: unknown): SaveData['school'] {
  const record = isRecord(value) ? value : {};
  const rawSubjects = isRecord(record.subjects) ? record.subjects : {};
  const subjects: Partial<Record<QuizSubject, SchoolProgress>> = {};

  for (const subject of QUIZ_SUBJECTS) {
    const entry = rawSubjects[subject];
    if (!isRecord(entry)) {
      continue;
    }
    const rounds = readCount(entry.rounds, 0);
    const bestStars = Math.min(readCount(entry.bestStars, 0), 3);
    const firstTryCorrect = readCount(entry.firstTryCorrect, 0);
    const totalQuestions = readCount(entry.totalQuestions, 0);
    if (rounds === 0 && bestStars === 0 && firstTryCorrect === 0 && totalQuestions === 0) {
      continue;
    }
    subjects[subject] = {
      rounds,
      bestStars,
      firstTryCorrect,
      totalQuestions,
      firstCompleted: readBoolean(entry.firstCompleted, rounds > 0),
    };
  }

  return { subjects };
}

function readSettings(
  parsed: Record<string, unknown>,
  fallback: SaveData['settings'],
): SaveData['settings'] {
  const settings = isRecord(parsed.settings) ? parsed.settings : {};
  return {
    sound: readBoolean(settings.sound, fallback.sound),
    reduceMotion: readBoolean(settings.reduceMotion, fallback.reduceMotion),
  };
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

  const settings = readSettings(parsed, fallback.settings);
  if (parsed.version !== 2 && parsed.version !== 3 && parsed.version !== SAVE_VERSION) {
    return { ...fallback, settings };
  }

  const player = isRecord(parsed.player) ? parsed.player : null;
  const look = player ? parseLook(player.look) : null;
  const wallet = isRecord(parsed.wallet) ? parsed.wallet : {};
  const home = isRecord(parsed.home) ? parsed.home : {};
  const flags = isRecord(parsed.flags) ? parsed.flags : {};
  const pets = parsePets(parsed.pets, parsed.pet);
  const requestedActive = readText(parsed.activePetId);
  const activePetId = pets.some((pet) => pet.uid === requestedActive)
    ? requestedActive
    : (pets[0]?.uid ?? null);
  const inventory = parseInventory(parsed.inventory);
  const furniture = parseFurniture(home.furniture);
  const school = parseSchool(parsed.school);
  const legacyPurchaseCounts: Record<string, number> = { ...inventory };
  for (const placed of furniture) {
    legacyPurchaseCounts[placed.itemId] = (legacyPurchaseCounts[placed.itemId] ?? 0) + 1;
  }
  const purchases = parsePurchases(parsed.purchases, legacyPurchaseCounts);
  seedEquippedWardrobePurchases(purchases, look);

  return {
    version: SAVE_VERSION,
    settings,
    player: look ? { look } : null,
    pets,
    activePetId,
    wallet: {
      hearts: readCount(wallet.hearts, STARTING_HEARTS),
      earnedHearts: readCount(wallet.earnedHearts, 0),
    },
    inventory,
    purchases,
    home: { furniture },
    school,
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

  get reduceMotion(): boolean {
    return this.data.settings.reduceMotion;
  }

  get playerLook(): CharacterLook | null {
    return this.data.player?.look ?? null;
  }

  get pets(): readonly PetState[] {
    return this.data.pets;
  }

  get activePetId(): string | null {
    return this.data.activePetId;
  }

  get pet(): PetState | null {
    return this.data.pets.find((pet) => pet.uid === this.data.activePetId) ?? null;
  }

  get hearts(): number {
    return this.data.wallet.hearts;
  }

  get earnedHearts(): number {
    return this.data.wallet.earnedHearts;
  }

  get inventory(): Readonly<Record<string, number>> {
    return this.data.inventory;
  }

  get purchases(): Readonly<Record<string, number>> {
    return this.data.purchases;
  }

  get furniture(): readonly PlacedFurniture[] {
    return this.data.home.furniture;
  }

  get tutorialDone(): boolean {
    return this.data.flags.tutorialDone;
  }

  schoolProgress(subject: QuizSubject): SchoolProgress {
    return this.data.school.subjects[subject] ?? EMPTY_SCHOOL_PROGRESS;
  }

  setSoundEnabled(enabled: boolean): void {
    if (this.data.settings.sound === enabled) {
      return;
    }
    this.data.settings.sound = enabled;
    this.persist();
  }

  setReduceMotion(enabled: boolean): void {
    if (this.data.settings.reduceMotion === enabled) {
      return;
    }
    this.data.settings.reduceMotion = enabled;
    this.persist();
  }

  setPlayerLook(look: CharacterLook): void {
    this.data.player = { look: { ...look } };
    this.persist();
  }

  setPet(pet: PetState): void {
    const index = this.data.pets.findIndex((entry) => entry.uid === pet.uid);
    const copy = { ...pet, needs: { ...pet.needs } };
    if (index >= 0) {
      this.data.pets[index] = copy;
    } else {
      this.data.pets.push(copy);
    }
    this.data.activePetId = pet.uid;
    this.persist();
  }

  addPet(pet: PetState, makeActive = true): void {
    if (!this.data.pets.some((entry) => entry.uid === pet.uid)) {
      this.data.pets.push({ ...pet, needs: { ...pet.needs } });
    }
    if (makeActive || !this.pet) {
      this.data.activePetId = pet.uid;
    }
    this.persist();
  }

  setActivePet(uid: string): boolean {
    if (!this.data.pets.some((pet) => pet.uid === uid)) {
      return false;
    }
    if (this.data.activePetId !== uid) {
      this.data.activePetId = uid;
      this.persist();
    }
    return true;
  }

  setPetAccessory(accessory: string | null): void {
    const pet = this.pet;
    if (!pet) {
      return;
    }
    pet.accessory = accessory;
    this.persist();
  }

  updateNeeds(needs: Needs): void {
    const pet = this.pet;
    if (!pet) {
      return;
    }
    pet.needs = {
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
    const amount = Math.floor(count);
    this.data.wallet.hearts += amount;
    this.data.wallet.earnedHearts += amount;
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

  recordPurchase(itemId: string): void {
    if (!getItem(itemId)) {
      return;
    }
    this.data.purchases[itemId] = (this.data.purchases[itemId] ?? 0) + 1;
    this.persist();
  }

  ownsWardrobeItem(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item || item.category !== 'wardrobe') {
      return false;
    }
    return item.price <= 0 || (this.data.purchases[itemId] ?? 0) > 0;
  }

  buyWardrobeItem(itemId: string): boolean {
    const item = getItem(itemId);
    if (!item || item.category !== 'wardrobe' || item.price <= 0) {
      return false;
    }
    if (this.ownsWardrobeItem(itemId) || item.price > this.data.wallet.hearts) {
      return false;
    }

    this.data.wallet.hearts -= item.price;
    this.data.purchases[itemId] = 1;
    this.persist();
    return true;
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

  recordSchoolRound(
    subject: QuizSubject,
    result: SchoolRoundResult,
  ): { progress: SchoolProgress; firstCompletion: boolean } {
    const current = this.data.school.subjects[subject];
    const outcome = nextSchoolProgress(current, result);
    this.data.school.subjects[subject] = outcome.progress;
    this.persist();
    return outcome;
  }

  resetGame(): void {
    const { sound, reduceMotion } = this.data.settings;
    this.data = { ...createDefaultSave(), settings: { sound, reduceMotion } };
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
