import { describe, expect, it } from 'vitest';
import { clamp, distance, moveTowards } from '@/utils/math';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps values outside the range', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe('distance', () => {
  it('calculates the distance between two points', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(distance(2, 2, 2, 2)).toBe(0);
  });
});

describe('moveTowards', () => {
  it('moves at most the given delta', () => {
    expect(moveTowards(0, 10, 3)).toBe(3);
    expect(moveTowards(10, 0, 3)).toBe(7);
  });

  it('stops exactly at the target', () => {
    expect(moveTowards(0, 2, 5)).toBe(2);
    expect(moveTowards(5, 5, 1)).toBe(5);
  });
});
