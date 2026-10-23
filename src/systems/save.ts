import { getItem } from '@/game/catalog/items';
import { createPetUid } from '@/game/catalog/pets';
import { text } from '@/game/text';
import {
  clampNeed,
  isPetId,
  isRoomId,
  QUIZ_SUBJECTS,
  type CharacterLook,
  type DeviceSettings,
  type Needs,
  type PetId,
  type PetState,
  type PlacedFurniture,
  type ProfileIndex,
  type ProfileMeta,
  type ProfileOverview,
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

const LEGACY_STORAGE_KEYS = ['gotar:save', 'spil:save'] as const;
const PROFILE_INDEX_KEY = 'gotar:profiles';
const PROFILE_SAVE_PREFIX = 'gotar:save:';
const SETTINGS_KEY = 'gotar:settings';
const SAVE_VERSION = 5;
const PROFILE_INDEX_VERSION = 1;
const SETTINGS_VERSION = 1;
const PROBE_KEY = 'gotar:probe';
const STARTING_HEARTS = 20;
export const MAX_PROFILES = 6;

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
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

export function createDefaultSettings(): DeviceSettings {
  return {
    version: SETTINGS_VERSION,
    sound: true,
    reduceMotion: false,
  };
}

export function createDefaultProfileIndex(): ProfileIndex {
  return {
    version: PROFILE_INDEX_VERSION,
    activeProfileId: null,
    profiles: [],
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

export function parseSettings(raw: string | null): DeviceSettings | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const fallback = createDefaultSettings();
  const source = isRecord(parsed.settings) ? parsed.settings : parsed;
  return {
    version: SETTINGS_VERSION,
    sound: readBoolean(source.sound, fallback.sound),
    reduceMotion: readBoolean(source.reduceMotion, fallback.reduceMotion),
  };
}

export function parseProfileIndex(raw: string | null): ProfileIndex | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed.version !== PROFILE_INDEX_VERSION) {
    return null;
  }

  const profiles: ProfileMeta[] = [];
  const seen = new Set<string>();
  const rawProfiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];

  for (const entry of rawProfiles) {
    if (profiles.length >= MAX_PROFILES || !isRecord(entry)) {
      continue;
    }
    const id = readText(entry.id);
    const name = readText(entry.name);
    if (!id || !name || seen.has(id)) {
      continue;
    }
    seen.add(id);
    profiles.push({
      id,
      name,
      createdAt: readCount(entry.createdAt, 0),
    });
  }

  const requestedActive = readText(parsed.activeProfileId);
  const activeProfileId =
    parsed.activeProfileId === null
      ? null
      : profiles.some((profile) => profile.id === requestedActive)
        ? requestedActive
        : (profiles[0]?.id ?? null);

  return {
    version: PROFILE_INDEX_VERSION,
    activeProfileId,
    profiles,
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

  if (
    parsed.version !== 2 &&
    parsed.version !== 3 &&
    parsed.version !== 4 &&
    parsed.version !== SAVE_VERSION
  ) {
    return fallback;
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

let profileIdCounter = 0;

function createProfileId(): string {
  profileIdCounter += 1;
  return `profile-${Date.now().toString(36)}-${profileIdCounter.toString(36)}`;
}

function nextProfileName(profiles: readonly ProfileMeta[]): string {
  const used = new Set(profiles.map((profile) => profile.name));
  for (let number = 1; number <= MAX_PROFILES; number += 1) {
    const name = text.profiles.name(number);
    if (!used.has(name)) {
      return name;
    }
  }
  return text.profiles.name(profiles.length + 1);
}

function hasLegacyProfileData(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) && parsed.version !== 1;
  } catch {
    return false;
  }
}

export class SaveManager {
  private data: SaveData;
  private settings: DeviceSettings;
  private index: ProfileIndex;

  constructor(private storage: StorageLike = resolveStorage()) {
    let indexRaw: string | null = null;
    let settingsRaw: string | null = null;
    let legacyRaw: string | null = null;
    try {
      indexRaw = this.storage.getItem(PROFILE_INDEX_KEY);
      settingsRaw = this.storage.getItem(SETTINGS_KEY);
      for (const key of LEGACY_STORAGE_KEYS) {
        legacyRaw ??= this.storage.getItem(key);
      }
    } catch {
      this.storage = createMemoryStorage();
    }

    this.settings =
      parseSettings(settingsRaw) ?? parseSettings(legacyRaw) ?? createDefaultSettings();
    const parsedIndex = parseProfileIndex(indexRaw);
    this.index = parsedIndex ?? createDefaultProfileIndex();
    this.data = this.loadProfile(this.index.activeProfileId);

    if (!parsedIndex && legacyRaw && hasLegacyProfileData(legacyRaw)) {
      const meta: ProfileMeta = {
        id: createProfileId(),
        name: nextProfileName([]),
        createdAt: Date.now(),
      };
      this.index = {
        version: PROFILE_INDEX_VERSION,
        activeProfileId: meta.id,
        profiles: [meta],
      };
      this.data = parseSave(legacyRaw);
      const profileSaved = this.writeProfile();
      const indexSaved = this.writeIndex();
      if (profileSaved && indexSaved) {
        this.removeLegacyKeys();
      }
    } else if (!parsedIndex) {
      this.writeIndex();
    }

    if (!parseSettings(settingsRaw)) {
      this.writeSettings();
    }
  }

  get soundEnabled(): boolean {
    return this.settings.sound;
  }

  get reduceMotion(): boolean {
    return this.settings.reduceMotion;
  }

  get profiles(): readonly ProfileMeta[] {
    return this.index.profiles;
  }

  get activeProfileId(): string | null {
    return this.index.activeProfileId;
  }

  get activeProfileName(): string | null {
    return (
      this.index.profiles.find((profile) => profile.id === this.index.activeProfileId)?.name ?? null
    );
  }

  getProfileOverviews(): readonly ProfileOverview[] {
    return this.index.profiles.map((meta) => {
      const data =
        meta.id === this.index.activeProfileId
          ? this.data
          : parseSave(this.readStored(PROFILE_SAVE_PREFIX + meta.id));
      const pet = data.pets.find((entry) => entry.uid === data.activePetId) ?? null;
      return {
        ...meta,
        active: meta.id === this.index.activeProfileId,
        look: data.player?.look ?? null,
        petId: pet?.id ?? null,
        petName: pet?.name ?? null,
        petAccessory: pet?.accessory ?? null,
      };
    });
  }

  createProfile(): ProfileMeta | null {
    if (this.index.profiles.length >= MAX_PROFILES) {
      return null;
    }

    this.writeProfile();
    const meta: ProfileMeta = {
      id: createProfileId(),
      name: nextProfileName(this.index.profiles),
      createdAt: Date.now(),
    };
    this.index.profiles.push(meta);
    this.index.activeProfileId = meta.id;
    this.data = createDefaultSave();
    this.writeProfile();
    this.writeIndex();
    return meta;
  }

  switchProfile(id: string): boolean {
    const exists = this.index.profiles.some((profile) => profile.id === id);
    if (!exists) {
      return false;
    }
    if (this.index.activeProfileId === id) {
      return true;
    }

    this.writeProfile();
    this.index.activeProfileId = id;
    this.data = this.loadProfile(id);
    this.writeIndex();
    return true;
  }

  deleteProfile(id: string): boolean {
    const index = this.index.profiles.findIndex((profile) => profile.id === id);
    if (index < 0) {
      return false;
    }

    this.index.profiles.splice(index, 1);
    this.removeStored(PROFILE_SAVE_PREFIX + id);
    if (this.index.activeProfileId === id) {
      this.index.activeProfileId = null;
      this.data = createDefaultSave();
    }
    this.writeIndex();
    return true;
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
    if (this.settings.sound === enabled) {
      return;
    }
    this.settings.sound = enabled;
    this.writeSettings();
  }

  setReduceMotion(enabled: boolean): void {
    if (this.settings.reduceMotion === enabled) {
      return;
    }
    this.settings.reduceMotion = enabled;
    this.writeSettings();
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
    if (!this.index.activeProfileId) {
      return;
    }
    this.data = createDefaultSave();
    this.persist();
  }

  private loadProfile(id: string | null): SaveData {
    if (!id) {
      return createDefaultSave();
    }
    return parseSave(this.readStored(PROFILE_SAVE_PREFIX + id));
  }

  private persist(): void {
    this.writeProfile();
  }

  private writeProfile(): boolean {
    const id = this.index.activeProfileId;
    if (!id) {
      return false;
    }
    return this.writeStored(PROFILE_SAVE_PREFIX + id, JSON.stringify(this.data));
  }

  private writeIndex(): boolean {
    return this.writeStored(PROFILE_INDEX_KEY, JSON.stringify(this.index));
  }

  private writeSettings(): boolean {
    return this.writeStored(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  private readStored(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      this.storage = createMemoryStorage();
      return null;
    }
  }

  private writeStored(key: string, value: string): boolean {
    try {
      this.storage.setItem(key, value);
      return true;
    } catch {
      this.storage = createMemoryStorage();
      return false;
    }
  }

  private removeStored(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      this.storage = createMemoryStorage();
    }
  }

  private removeLegacyKeys(): void {
    for (const key of LEGACY_STORAGE_KEYS) {
      this.removeStored(key);
    }
  }
}

export const save = new SaveManager();
