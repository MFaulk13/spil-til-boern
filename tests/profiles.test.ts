import { describe, expect, it } from 'vitest';
import { text } from '@/game/text';
import type { CharacterLook } from '@/game/types';
import {
  createMemoryStorage,
  MAX_PROFILES,
  parseProfileIndex,
  parseSettings,
  SaveManager,
} from '@/systems/save';

const look: CharacterLook = {
  gender: 'boy',
  skin: 'medium',
  hair: 'short',
  hairColor: 'brown',
  eyes: 'round',
  mouth: 'smile',
  outfit: 'tshirt',
  outfitColor: 'teal',
  accessory: null,
};

const otherLook: CharacterLook = {
  ...look,
  gender: 'girl',
  hair: 'ponytail',
  outfit: 'dress',
  outfitColor: 'pink',
};

const pet = {
  uid: 'pet-baloo',
  id: 'dog' as const,
  name: 'Baloo',
  needs: { hunger: 80, joy: 70, energy: 60 },
  bond: 2,
  hatchedAt: 1234,
  accessory: 'bow',
};

describe('profiles', () => {
  it('keeps progress isolated per profile and reloads the active profile', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);
    const first = manager.createProfile();
    expect(first).not.toBeNull();

    manager.setPlayerLook(look);
    manager.addHearts(5);

    const second = manager.createProfile();
    expect(second).not.toBeNull();
    expect(manager.activeProfileId).toBe(second?.id);

    manager.setPlayerLook(otherLook);
    manager.addHearts(3);

    expect(manager.hearts).toBe(23);
    expect(manager.switchProfile(first?.id ?? '')).toBe(true);
    expect(manager.playerLook).toEqual(look);
    expect(manager.hearts).toBe(25);

    const reloaded = new SaveManager(storage);
    expect(reloaded.profiles).toHaveLength(2);
    expect(reloaded.activeProfileId).toBe(first?.id);
    expect(reloaded.playerLook).toEqual(look);

    expect(reloaded.switchProfile(second?.id ?? '')).toBe(true);
    expect(reloaded.playerLook).toEqual(otherLook);
    expect(reloaded.hearts).toBe(23);
  });

  it('migrates an existing single-player save into the first profile', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'gotar:save',
      JSON.stringify({
        version: 4,
        settings: { sound: false, reduceMotion: true },
        player: { look },
        pet,
        wallet: { hearts: 42 },
        flags: { tutorialDone: true },
      }),
    );

    const manager = new SaveManager(storage);

    expect(manager.profiles).toHaveLength(1);
    expect(manager.profiles[0].name).toBe(text.profiles.name(1));
    expect(manager.activeProfileId).toBe(manager.profiles[0].id);
    expect(manager.playerLook).toEqual(look);
    expect(manager.pet).toEqual(pet);
    expect(manager.hearts).toBe(42);
    expect(manager.soundEnabled).toBe(false);
    expect(manager.reduceMotion).toBe(true);
    expect(storage.getItem('gotar:save')).toBeNull();
    expect(storage.getItem('spil:save')).toBeNull();
    expect(storage.getItem('gotar:settings')).not.toBeNull();
  });

  it('only migrates settings from a version 1 save', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'spil:save',
      JSON.stringify({ version: 1, settings: { sound: false }, progress: {} }),
    );

    const manager = new SaveManager(storage);

    expect(manager.profiles).toHaveLength(0);
    expect(manager.activeProfileId).toBeNull();
    expect(manager.soundEnabled).toBe(false);
  });

  it('shares sound and motion settings across profiles', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);
    const first = manager.createProfile();
    const second = manager.createProfile();

    manager.setSoundEnabled(false);
    manager.setReduceMotion(true);
    manager.switchProfile(first?.id ?? '');
    expect(manager.soundEnabled).toBe(false);
    expect(manager.reduceMotion).toBe(true);
    manager.switchProfile(second?.id ?? '');

    const reloaded = new SaveManager(storage);
    expect(reloaded.soundEnabled).toBe(false);
    expect(reloaded.reduceMotion).toBe(true);
  });

  it('limits the number of profiles and reuses the lowest free name', () => {
    const manager = new SaveManager(createMemoryStorage());
    for (let index = 0; index < MAX_PROFILES; index += 1) {
      expect(manager.createProfile()).not.toBeNull();
    }

    expect(manager.profiles).toHaveLength(MAX_PROFILES);
    expect(manager.createProfile()).toBeNull();

    const removed = manager.profiles[1];
    expect(manager.deleteProfile(removed.id)).toBe(true);
    expect(manager.createProfile()?.name).toBe(text.profiles.name(2));
  });

  it('deletes only the selected profile and its saved data', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);
    const first = manager.createProfile();
    manager.setPlayerLook(look);
    const second = manager.createProfile();
    manager.setPlayerLook(otherLook);

    expect(manager.switchProfile(first?.id ?? '')).toBe(true);
    expect(manager.deleteProfile(first?.id ?? '')).toBe(true);

    expect(manager.profiles).toHaveLength(1);
    expect(manager.activeProfileId).toBeNull();
    expect(storage.getItem(`gotar:save:${first?.id}`)).toBeNull();

    const reloaded = new SaveManager(storage);
    expect(reloaded.profiles).toHaveLength(1);
    expect(reloaded.activeProfileId).toBeNull();
    expect(reloaded.switchProfile(second?.id ?? '')).toBe(true);
    expect(reloaded.playerLook).toEqual(otherLook);
  });

  it('resets only the active profile', () => {
    const manager = new SaveManager(createMemoryStorage());
    const first = manager.createProfile();
    manager.setPlayerLook(look);
    manager.addHearts(10);
    const second = manager.createProfile();
    manager.setPlayerLook(otherLook);
    manager.switchProfile(first?.id ?? '');

    manager.resetGame();

    expect(manager.playerLook).toBeNull();
    expect(manager.hearts).toBe(20);
    expect(manager.switchProfile(second?.id ?? '')).toBe(true);
    expect(manager.playerLook).toEqual(otherLook);
  });

  it('exposes look and pet summaries for the profile cards', () => {
    const manager = new SaveManager(createMemoryStorage());
    manager.createProfile();
    manager.setPlayerLook(look);
    manager.setPet(pet);

    const overview = manager.getProfileOverviews()[0];
    expect(overview.look).toEqual(look);
    expect(overview.petId).toBe('dog');
    expect(overview.petName).toBe('Baloo');
    expect(overview.petAccessory).toBe('bow');
    expect(overview.active).toBe(true);
  });
});

describe('profile index and settings parsing', () => {
  it('filters invalid and duplicate profiles', () => {
    const index = parseProfileIndex(
      JSON.stringify({
        version: 1,
        activeProfileId: 'missing',
        profiles: [
          { id: 'a', name: 'Profil 1', createdAt: 1 },
          { id: 'a', name: 'Dobbelt', createdAt: 2 },
          { id: 'b', name: '', createdAt: 3 },
          { id: 'c', name: 'Profil 3', createdAt: 4 },
        ],
      }),
    );

    expect(index?.profiles.map((profile) => profile.id)).toEqual(['a', 'c']);
    expect(index?.activeProfileId).toBe('a');
  });

  it('keeps an explicit empty active profile', () => {
    const index = parseProfileIndex(
      JSON.stringify({
        version: 1,
        activeProfileId: null,
        profiles: [{ id: 'a', name: 'Profil 1', createdAt: 1 }],
      }),
    );

    expect(index?.activeProfileId).toBeNull();
  });

  it('reads both legacy and current settings formats', () => {
    expect(parseSettings(JSON.stringify({ version: 4, settings: { sound: false } }))).toEqual({
      version: 1,
      sound: false,
      reduceMotion: false,
    });
    expect(parseSettings(JSON.stringify({ version: 1, sound: true, reduceMotion: true }))).toEqual({
      version: 1,
      sound: true,
      reduceMotion: true,
    });
  });

  it('ignores corrupt profile indexes', () => {
    expect(parseProfileIndex('{not json')).toBeNull();
    expect(parseProfileIndex(JSON.stringify({ version: 99, profiles: [] }))).toBeNull();
  });
});
