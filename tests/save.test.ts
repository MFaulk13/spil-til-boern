import { describe, expect, it } from 'vitest';
import {
  createDefaultSave,
  createMemoryStorage,
  parseSave,
  SaveManager,
  type StorageLike,
} from '@/systems/save';

describe('parseSave', () => {
  it('returns defaults when there is no saved data', () => {
    expect(parseSave(null)).toEqual(createDefaultSave());
  });

  it('returns defaults when the saved data is corrupt', () => {
    expect(parseSave('{not json')).toEqual(createDefaultSave());
  });

  it('keeps valid saved values', () => {
    const saved = parseSave(
      JSON.stringify({
        version: 1,
        settings: { sound: false },
        progress: { stars: 12, bestScore: 8 },
      }),
    );

    expect(saved.settings.sound).toBe(false);
    expect(saved.progress).toEqual({ stars: 12, bestScore: 8 });
  });

  it('replaces invalid values with defaults', () => {
    const saved = parseSave(
      JSON.stringify({
        settings: { sound: 'ja' },
        progress: { stars: -4, bestScore: 'mange' },
      }),
    );

    expect(saved.settings.sound).toBe(true);
    expect(saved.progress).toEqual({ stars: 0, bestScore: 0 });
  });
});

describe('SaveManager', () => {
  it('persists the sound setting', () => {
    const storage = createMemoryStorage();
    const manager = new SaveManager(storage);

    manager.setSoundEnabled(false);

    expect(new SaveManager(storage).soundEnabled).toBe(false);
  });

  it('adds stars and tracks the best score', () => {
    const manager = new SaveManager(createMemoryStorage());

    manager.addStars(3);
    manager.recordRun(7);

    expect(manager.stars).toBe(3);
    expect(manager.bestScore).toBe(7);
  });

  it('never lowers the best score', () => {
    const manager = new SaveManager(createMemoryStorage());

    manager.recordRun(9);
    manager.recordRun(4);

    expect(manager.bestScore).toBe(9);
  });

  it('resets progress without touching settings', () => {
    const manager = new SaveManager(createMemoryStorage());
    manager.setSoundEnabled(false);
    manager.addStars(5);
    manager.recordRun(5);

    manager.resetProgress();

    expect(manager.stars).toBe(0);
    expect(manager.bestScore).toBe(0);
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
    manager.addStars(2);

    expect(manager.stars).toBe(2);
    expect(manager.soundEnabled).toBe(true);
  });
});
