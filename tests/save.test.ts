import { describe, expect, it } from 'vitest';
import {
  createDefaultSave,
  createMemoryStorage,
  parseSave,
  SaveManager,
  type StorageLike,
} from '@/systems/save';
import type { CharacterLook, PetState } from '@/game/types';

const look: CharacterLook = {
  skin: 'medium',
  hair: 'short',
  hairColor: 'brown',
  eyes: 'round',
  mouth: 'smile',
  outfit: 'tshirt',
  outfitColor: 'teal',
  accessory: null,
};

const pet: PetState = {
  id: 'dog',
  name: 'Baloo',
  needs: { hunger: 80, joy: 70, energy: 60 },
  bond: 2,
  hatchedAt: 1234,
  accessory: 'bow',
};

describe('parseSave', () => {
  it('returns defaults when there is no saved data', () => {
    expect(parseSave(null)).toEqual(createDefaultSave());
  });

  it('returns defaults when the saved data is corrupt', () => {
    expect(parseSave('{not json')).toEqual(createDefaultSave());
  });

  it('migrates version 1 saves and keeps the sound setting', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 1,
        settings: { sound: false },
        progress: { stars: 12, bestScore: 8 },
      }),
    );

    expect(saved.version).toBe(2);
    expect(saved.settings.sound).toBe(false);
    expect(saved.settings.reduceMotion).toBe(false);
    expect(saved.player).toBeNull();
    expect(saved.pet).toBeNull();
  });

  it('keeps a valid version 2 save', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 2,
        settings: { sound: false },
        player: { look },
        pet,
        wallet: { hearts: 42 },
        inventory: { rug: 2, bowl: 0 },
        home: {
          furniture: [{ uid: 'a1', itemId: 'rug', room: 'living', x: 4, y: 5 }],
        },
        flags: { tutorialDone: true },
      }),
    );

    expect(saved.settings.sound).toBe(false);
    expect(saved.settings.reduceMotion).toBe(false);
    expect(saved.player).toEqual({ look });
    expect(saved.pet).toEqual(pet);
    expect(saved.wallet.hearts).toBe(42);
    expect(saved.wallet.earnedHearts).toBe(0);
    expect(saved.inventory).toEqual({ rug: 2 });
    expect(saved.home.furniture).toHaveLength(1);
    expect(saved.flags.tutorialDone).toBe(true);
  });

  it('replaces invalid values with safe fallbacks', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 2,
        settings: { sound: 'ja' },
        player: { look: { skin: 'light' } },
        pet: { id: 'dragon', name: 'Ukendt' },
        wallet: { hearts: -4 },
        inventory: { rug: 'mange' },
        home: {
          furniture: [
            { uid: 'a', itemId: 'rug', room: 'attic', x: 1, y: 2 },
            { uid: 'b', itemId: 'rug', room: 'living', x: '1', y: 2 },
          ],
        },
      }),
    );

    expect(saved.settings.sound).toBe(true);
    expect(saved.player).toBeNull();
    expect(saved.pet).toBeNull();
    expect(saved.wallet.hearts).toBe(20);
    expect(saved.wallet.earnedHearts).toBe(0);
    expect(saved.inventory).toEqual({});
    expect(saved.home.furniture).toEqual([]);
  });

  it('clamps pet needs to the valid range', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 2,
        pet: {
          id: 'cat',
          name: 'Misse',
          needs: { hunger: 180, joy: -20, energy: 55 },
          bond: 1,
          hatchedAt: 2,
        },
      }),
    );

    expect(saved.pet?.needs).toEqual({ hunger: 100, joy: 0, energy: 55 });
  });

  it('ignores saves from a future version', () => {
    const saved = parseSave(JSON.stringify({ version: 99, settings: { sound: false }, pet }));

    expect(saved).toEqual({
      ...createDefaultSave(),
      settings: { sound: false, reduceMotion: false },
    });
  });
});

describe('SaveManager', () => {
  it('persists the sound and motion settings', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);

    manager.setSoundEnabled(false);
    manager.setReduceMotion(true);

    const reloaded = new SaveManager(storage);
    expect(reloaded.soundEnabled).toBe(false);
    expect(reloaded.reduceMotion).toBe(true);
  });

  it('persists the player look and pet', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);

    manager.setPlayerLook(look);
    manager.setPet(pet);

    const reloaded = new SaveManager(storage);
    expect(reloaded.playerLook).toEqual(look);
    expect(reloaded.pet).toEqual(pet);
  });

  it('updates and clamps pet needs', () => {
    const manager = new SaveManager(createMemoryStorage());
    manager.setPet(pet);

    manager.updateNeeds({ hunger: 120, joy: -5, energy: 40 });

    expect(manager.pet?.needs).toEqual({ hunger: 100, joy: 0, energy: 40 });
  });

  it('adds and spends hearts without going negative', () => {
    const manager = new SaveManager(createMemoryStorage());
    const start = manager.hearts;

    manager.addHearts(5);
    expect(manager.hearts).toBe(start + 5);
    expect(manager.earnedHearts).toBe(5);

    expect(manager.spendHearts(3)).toBe(true);
    expect(manager.hearts).toBe(start + 2);

    expect(manager.spendHearts(999)).toBe(false);
    expect(manager.hearts).toBe(start + 2);
  });

  it('tracks inventory counts and consumes items', () => {
    const manager = new SaveManager(createMemoryStorage());

    manager.addItem('treat', 2);
    expect(manager.inventory.treat).toBe(2);

    expect(manager.consumeItem('treat')).toBe(true);
    expect(manager.inventory.treat).toBe(1);

    expect(manager.consumeItem('treat')).toBe(true);
    expect(manager.consumeItem('treat')).toBe(false);
    expect(manager.inventory.treat).toBeUndefined();
  });

  it('adds and removes furniture', () => {
    const manager = new SaveManager(createMemoryStorage());
    const item = { uid: 'a1', itemId: 'rug', room: 'living', x: 2, y: 3 } as const;

    manager.addFurniture(item);
    expect(manager.furniture).toHaveLength(1);

    expect(manager.removeFurniture('a1')).toBe(true);
    expect(manager.furniture).toHaveLength(0);
    expect(manager.removeFurniture('a1')).toBe(false);
  });

  it('resets the game but keeps the sound setting', () => {
    const manager = new SaveManager(createMemoryStorage());
    manager.setSoundEnabled(false);
    manager.setPlayerLook(look);
    manager.setPet(pet);
    manager.addHearts(10);
    manager.setReduceMotion(true);

    manager.resetGame();

    expect(manager.playerLook).toBeNull();
    expect(manager.pet).toBeNull();
    expect(manager.hearts).toBe(20);
    expect(manager.earnedHearts).toBe(0);
    expect(manager.soundEnabled).toBe(false);
    expect(manager.reduceMotion).toBe(true);
  });

  it('sets and clears a pet accessory', () => {
    const manager = new SaveManager(createMemoryStorage());
    manager.setPet(pet);

    manager.setPetAccessory('hat');
    expect(manager.pet?.accessory).toBe('hat');

    manager.setPetAccessory(null);
    expect(manager.pet?.accessory).toBeNull();
  });

  it('reads a legacy spil save on first load', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'spil:save',
      JSON.stringify({ version: 1, settings: { sound: false }, progress: {} }),
    );

    const manager = new SaveManager(storage);

    expect(manager.soundEnabled).toBe(false);
  });

  it('keeps working when storage throws', () => {
    const brokenStorage: StorageLike = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
      removeItem: () => {
        throw new Error('storage unavailable');
      },
    };

    const manager = new SaveManager(brokenStorage);
    manager.addHearts(2);

    expect(manager.hearts).toBe(22);
    expect(manager.soundEnabled).toBe(true);
  });
});
