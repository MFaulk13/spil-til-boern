import { describe, expect, it } from 'vitest';
import { createPetState } from '@/game/catalog/pets';
import { NeedsClock } from '@/systems/needs';
import { createMemoryStorage, SaveManager } from '@/systems/save';

function createManager(storage = createMemoryStorage()): SaveManager {
  const manager = new SaveManager(storage);
  manager.createProfile();
  manager.addPet(createPetState('dog', 'Baloo', 1, 'pet-baloo'));
  return manager;
}

describe('NeedsClock', () => {
  it('advances the active pet with its species decay', () => {
    const manager = createManager();
    const clock = new NeedsClock(manager);

    clock.advance(60);

    expect(manager.pet?.needs.hunger).toBeCloseTo(94.25);
    expect(manager.pet?.needs.joy).toBeCloseTo(95.2);
    expect(manager.pet?.needs.energy).toBeCloseTo(97);
  });

  it('ignores invalid or negative time and pets without a pet', () => {
    const manager = createManager();
    const clock = new NeedsClock(manager);
    const before = manager.pet?.needs;

    clock.advance(0);
    clock.advance(-10);
    clock.advance(Number.NaN);
    expect(manager.pet?.needs).toEqual(before);

    const empty = new SaveManager(createMemoryStorage());
    empty.createProfile();
    expect(() => new NeedsClock(empty).advance(60)).not.toThrow();
  });

  it('clamps needs at zero', () => {
    const manager = createManager();
    const clock = new NeedsClock(manager);

    clock.advance(100_000);

    expect(manager.pet?.needs).toEqual({ hunger: 0, joy: 0, energy: 0 });
  });

  it('keeps changes in memory until they are persisted', () => {
    const storage = createMemoryStorage();
    const manager = createManager(storage);
    const clock = new NeedsClock(manager);

    clock.advance(60);
    const beforePersist = new SaveManager(storage);
    expect(beforePersist.pet?.needs.hunger).toBeCloseTo(100);

    manager.persistNeeds();
    const afterPersist = new SaveManager(storage);
    expect(afterPersist.pet?.needs.hunger).toBeCloseTo(94.25);
  });
});

describe('bond', () => {
  it('adds only positive whole bond points', () => {
    const manager = createManager();

    manager.addBond(3);
    expect(manager.pet?.bond).toBe(3);

    manager.addBond(0);
    manager.addBond(-2);
    manager.addBond(Number.NaN);
    expect(manager.pet?.bond).toBe(3);
  });
});
