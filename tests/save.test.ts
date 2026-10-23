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

const pet: PetState = {
  uid: 'pet-baloo',
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

    expect(saved.version).toBe(4);
    expect(saved.settings.sound).toBe(false);
    expect(saved.settings.reduceMotion).toBe(false);
    expect(saved.player).toBeNull();
    expect(saved.pets).toEqual([]);
    expect(saved.activePetId).toBeNull();
  });

  it('migrates a version 2 save with a single pet', () => {
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

    expect(saved.version).toBe(4);
    expect(saved.settings.sound).toBe(false);
    expect(saved.settings.reduceMotion).toBe(false);
    expect(saved.player).toEqual({ look });
    expect(saved.pets).toEqual([pet]);
    expect(saved.activePetId).toBe(pet.uid);
    expect(saved.wallet.hearts).toBe(42);
    expect(saved.wallet.earnedHearts).toBe(0);
    expect(saved.inventory).toEqual({ rug: 2 });
    expect(saved.home.furniture).toHaveLength(1);
    expect(saved.flags.tutorialDone).toBe(true);
  });

  it('keeps a valid version 3 save with several pets', () => {
    const second = { ...pet, uid: 'pet-misse', id: 'cat' as const, name: 'Misse' };
    const saved = parseSave(
      JSON.stringify({
        version: 3,
        pets: [pet, second],
        activePetId: second.uid,
      }),
    );

    expect(saved.pets).toHaveLength(2);
    expect(saved.activePetId).toBe(second.uid);
    expect(saved.school.subjects).toEqual({});
  });

  it('keeps valid school progress and filters unknown subjects and stars', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 4,
        school: {
          subjects: {
            math: {
              rounds: 3,
              bestStars: 9,
              firstTryCorrect: 12,
              totalQuestions: 15,
              firstCompleted: true,
            },
            english: {
              rounds: 1,
              bestStars: 1,
              firstTryCorrect: 3,
              totalQuestions: 5,
            },
            dragon: { rounds: 4, bestStars: 3 },
          },
        },
      }),
    );

    expect(saved.school.subjects.math).toEqual({
      rounds: 3,
      bestStars: 3,
      firstTryCorrect: 12,
      totalQuestions: 15,
      firstCompleted: true,
    });
    expect(saved.school.subjects.english).toEqual({
      rounds: 1,
      bestStars: 1,
      firstTryCorrect: 3,
      totalQuestions: 5,
      firstCompleted: true,
    });
    expect(Object.keys(saved.school.subjects)).toEqual(['math', 'english']);
  });

  it('maps removed puppy and kitten pets to dog and cat', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 3,
        pets: [
          { ...pet, id: 'puppy' },
          { ...pet, uid: 'pet-miv', id: 'kitten', name: 'Miv' },
        ],
      }),
    );

    expect(saved.pets.map((entry) => entry.id)).toEqual(['dog', 'cat']);
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
    expect(saved.pets).toEqual([]);
    expect(saved.activePetId).toBeNull();
    expect(saved.wallet.hearts).toBe(20);
    expect(saved.wallet.earnedHearts).toBe(0);
    expect(saved.inventory).toEqual({});
    expect(saved.home.furniture).toEqual([]);
  });

  it('filters unknown catalog ids from inventory, furniture and accessories', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 2,
        pet: { id: 'dog', name: 'Baloo', accessory: 'dragon' },
        inventory: { 'made-up': 2, rug: 1 },
        home: {
          furniture: [
            { uid: 'a', itemId: 'made-up', room: 'living', x: 0, y: 0 },
            { uid: 'b', itemId: 'cookie', room: 'living', x: 0, y: 0 },
            { uid: 'c', itemId: 'rug', room: 'living', x: 0, y: 0 },
          ],
        },
      }),
    );

    expect(saved.inventory).toEqual({ rug: 1 });
    expect(saved.home.furniture.map((item) => item.itemId)).toEqual(['rug']);
    expect(saved.pets[0].accessory).toBeNull();
  });

  it('keeps furniture in every room of the home', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 3,
        home: {
          furniture: [
            { uid: 'k', itemId: 'rug', room: 'kitchen', x: 128, y: 384 },
            { uid: 'b', itemId: 'rug', room: 'bathroom', x: 128, y: 384 },
            { uid: 'p', itemId: 'rug', room: 'playroom', x: 128, y: 384 },
          ],
        },
      }),
    );

    expect(saved.home.furniture.map((item) => item.room)).toEqual([
      'kitchen',
      'bathroom',
      'playroom',
    ]);
  });

  it('normalizes unknown appearance ids to valid defaults', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 2,
        player: {
          look: { ...look, skin: 'alien', outfit: 'cape', accessory: 'jetpack' },
        },
      }),
    );

    expect(saved.player?.look.skin).toBe('medium');
    expect(saved.player?.look.outfit).toBe('tshirt');
    expect(saved.player?.look.accessory).toBeNull();
  });

  it('keeps paid wardrobe items equipped in older saves owned', () => {
    const paidLook: CharacterLook = {
      ...look,
      hair: 'braid',
      hairColor: 'purple',
      outfit: 'hoodie',
      outfitColor: 'coral',
      accessory: 'glasses',
    };
    const saved = parseSave(
      JSON.stringify({
        version: 4,
        player: { look: paidLook },
        wallet: { hearts: 10 },
      }),
    );

    expect(saved.purchases).toMatchObject({
      'hair-braid': 1,
      'hair-color-purple': 1,
      'outfit-hoodie': 1,
    });
    expect(saved.purchases['outfit-color-coral']).toBeUndefined();
    expect(saved.purchases['accessory-glasses']).toBeUndefined();
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

    expect(saved.pets[0].needs).toEqual({ hunger: 100, joy: 0, energy: 55 });
  });

  it('seeds purchase history from owned items in older saves', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 3,
        inventory: { rug: 2 },
        home: {
          furniture: [{ uid: 'a1', itemId: 'rug', room: 'living', x: 4, y: 5 }],
        },
      }),
    );

    expect(saved.purchases).toEqual({ rug: 3 });
  });

  it('ignores saves from a future version', () => {
    const saved = parseSave(
      JSON.stringify({ version: 99, settings: { sound: false }, pets: [pet] }),
    );

    expect(saved).toEqual({
      ...createDefaultSave(),
      settings: { sound: false, reduceMotion: false },
    });
  });

  it('gives duplicate pet ids a fresh uid', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 3,
        pets: [pet, { ...pet }],
        activePetId: pet.uid,
      }),
    );

    expect(saved.pets).toHaveLength(2);
    expect(saved.pets[0].uid).not.toBe(saved.pets[1].uid);
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

  it('records school rounds and keeps the best result', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);

    const first = manager.recordSchoolRound('math', {
      stars: 2,
      firstTryCorrect: 4,
      totalQuestions: 5,
    });
    expect(first.firstCompletion).toBe(true);
    expect(manager.schoolProgress('math')).toMatchObject({
      rounds: 1,
      bestStars: 2,
      firstTryCorrect: 4,
      totalQuestions: 5,
      firstCompleted: true,
    });

    const second = manager.recordSchoolRound('math', {
      stars: 3,
      firstTryCorrect: 5,
      totalQuestions: 5,
    });
    expect(second.firstCompletion).toBe(false);
    expect(manager.schoolProgress('math')).toMatchObject({
      rounds: 2,
      bestStars: 3,
      firstTryCorrect: 9,
      totalQuestions: 10,
      firstCompleted: true,
    });

    const reloaded = new SaveManager(storage);
    expect(reloaded.schoolProgress('math').rounds).toBe(2);
    expect(reloaded.schoolProgress('danish').firstCompleted).toBe(false);
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

  it('keeps purchase history after items are consumed or placed', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);

    manager.recordPurchase('cookie');
    manager.addItem('cookie');
    manager.consumeItem('cookie');
    manager.recordPurchase('rug');
    manager.addItem('rug');
    manager.consumeItem('rug');
    manager.addFurniture({ uid: 'r1', itemId: 'rug', room: 'living', x: 1, y: 1 });

    expect(manager.purchases).toEqual({ cookie: 1, rug: 1 });

    const reloaded = new SaveManager(storage);
    expect(reloaded.purchases).toEqual({ cookie: 1, rug: 1 });
  });

  it('buys wardrobe items once without putting them in the inventory', () => {
    const manager = new SaveManager(createMemoryStorage());

    expect(manager.ownsWardrobeItem('hair-short')).toBe(true);
    expect(manager.ownsWardrobeItem('outfit-princess')).toBe(false);
    expect(manager.buyWardrobeItem('outfit-princess')).toBe(false);
    expect(manager.hearts).toBe(20);

    expect(manager.buyWardrobeItem('outfit-hoodie')).toBe(true);
    expect(manager.hearts).toBe(6);
    expect(manager.ownsWardrobeItem('outfit-hoodie')).toBe(true);
    expect(manager.purchases['outfit-hoodie']).toBe(1);
    expect(manager.inventory['outfit-hoodie']).toBeUndefined();

    expect(manager.buyWardrobeItem('outfit-hoodie')).toBe(false);
    expect(manager.buyWardrobeItem('hair-short')).toBe(false);
    expect(manager.hearts).toBe(6);
  });

  it('adds and removes furniture', () => {
    const manager = new SaveManager(createMemoryStorage());
    const item = { uid: 'a1', itemId: 'rug', room: 'living', x: 2, y: 3 } as const;

    manager.addFurniture(item);
    expect(manager.furniture).toHaveLength(1);

    expect(manager.moveFurniture('a1', 5, 6)).toBe(true);
    expect(manager.furniture[0]).toMatchObject({ x: 5, y: 6 });
    expect(manager.moveFurniture('missing', 1, 2)).toBe(false);

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
    manager.recordSchoolRound('math', { stars: 3, firstTryCorrect: 5, totalQuestions: 5 });

    manager.resetGame();

    expect(manager.playerLook).toBeNull();
    expect(manager.pet).toBeNull();
    expect(manager.pets).toEqual([]);
    expect(manager.activePetId).toBeNull();
    expect(manager.hearts).toBe(20);
    expect(manager.earnedHearts).toBe(0);
    expect(manager.schoolProgress('math').rounds).toBe(0);
    expect(manager.soundEnabled).toBe(false);
    expect(manager.reduceMotion).toBe(true);
  });

  it('adopts more pets and switches the active pet', () => {
    const manager = new SaveManager(createMemoryStorage());
    manager.setPet(pet);
    const cat = { ...pet, uid: 'pet-misse', id: 'cat' as const, name: 'Misse' };

    manager.addPet(cat, false);
    expect(manager.pets).toHaveLength(2);
    expect(manager.pet?.name).toBe('Baloo');

    expect(manager.setActivePet('pet-misse')).toBe(true);
    expect(manager.pet?.name).toBe('Misse');
    expect(manager.setActivePet('missing')).toBe(false);
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
