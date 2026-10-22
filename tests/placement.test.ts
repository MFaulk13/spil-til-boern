import { describe, expect, it } from 'vitest';
import { getItem } from '@/game/catalog/items';
import { ROOMS } from '@/game/catalog/rooms';
import type { PlacedFurniture } from '@/game/types';
import {
  PLACEMENT_GRID,
  canPlace,
  clampCenter,
  createFurnitureUid,
  findFreeSpot,
  footprintOf,
  isInsideArea,
  rectAt,
  rectsOverlap,
  snapCenter,
  snapToGrid,
} from '@/systems/placement';

const area = ROOMS.living.placementArea;
const sofa = getItem('sofa')!;
const lamp = getItem('lamp')!;

function placedAt(uid: string, itemId: string, x: number, y: number): PlacedFurniture {
  return { uid, itemId, room: 'living', x, y };
}

describe('placement grid', () => {
  it('snaps values to the nearest 64 px cell', () => {
    expect(PLACEMENT_GRID).toBe(64);
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(31)).toBe(0);
    expect(snapToGrid(33)).toBe(64);
    expect(snapToGrid(96)).toBe(128);
    expect(snapToGrid(-20)).toBe(0);
  });

  it('snaps an item by its top-left corner so footprints align', () => {
    expect(footprintOf(sofa)).toEqual({ width: 256, height: 128 });
    expect(snapCenter(sofa, 230, 430)).toEqual({ x: 256, y: 448 });
    expect(snapCenter(sofa, 300, 500)).toEqual({ x: 320, y: 512 });
    expect(snapCenter(lamp, 160, 448)).toEqual({ x: 160, y: 448 });
  });

  it('clamps items inside the placement area', () => {
    const topLeft = clampCenter(sofa, -200, -200, area);
    expect(topLeft.x).toBe(area.left + 128);
    expect(topLeft.y).toBe(area.top + 64);

    const bottomRight = clampCenter(sofa, 5000, 5000, area);
    expect(bottomRight.x).toBe(area.right - 128);
    expect(bottomRight.y).toBe(area.bottom - 64);

    expect(isInsideArea(rectAt(sofa, topLeft.x, topLeft.y), area)).toBe(true);
    expect(isInsideArea(rectAt(sofa, bottomRight.x, bottomRight.y), area)).toBe(true);
  });
});

describe('placement collisions', () => {
  it('detects overlapping rectangles but allows shared edges', () => {
    const a = rectAt(sofa, 320, 512);
    const b = rectAt(sofa, 320, 512);
    const edge = rectAt(lamp, 512, 512);
    const apart = rectAt(lamp, 704, 512);

    expect(rectsOverlap(a, b)).toBe(true);
    expect(rectsOverlap(a, edge)).toBe(false);
    expect(rectsOverlap(a, apart)).toBe(false);
  });

  it('rejects furniture outside the room, overlaps and non-placeable items', () => {
    const placed = [placedAt('sofa-1', 'sofa', 320, 512)];

    expect(canPlace(sofa, 320, 512, area, 'living', [])).toBe(true);
    expect(canPlace(sofa, 320, 512, area, 'living', placed)).toBe(false);
    expect(canPlace(sofa, 320, 512, area, 'bedroom', placed)).toBe(true);
    expect(canPlace(sofa, 0, 0, area, 'living', [])).toBe(false);
    expect(canPlace(getItem('cookie')!, 320, 512, area, 'living', [])).toBe(false);
  });

  it('ignores the item being moved', () => {
    const placed = [placedAt('sofa-1', 'sofa', 320, 512)];

    expect(canPlace(sofa, 512, 512, area, 'living', placed, 'sofa-1')).toBe(true);
    expect(canPlace(sofa, 320, 512, area, 'living', placed, 'sofa-1')).toBe(true);
  });

  it('finds the first free cell for an item', () => {
    const placed = [placedAt('sofa-1', 'sofa', area.left + 128, area.top + 64)];
    const spot = findFreeSpot(sofa, area, 'living', placed);

    expect(spot).not.toBeNull();
    expect(spot?.x).not.toBe(area.left + 128);
    expect(canPlace(sofa, spot!.x, spot!.y, area, 'living', placed)).toBe(true);
  });

  it('returns null when the room is full', () => {
    const huge = { ...sofa, gridWidth: 40, gridHeight: 20, width: 2560, height: 1280 };

    expect(findFreeSpot(huge, area, 'living', [])).toBeNull();
  });

  it('creates unique furniture uids', () => {
    const first = createFurnitureUid();
    const second = createFurnitureUid();

    expect(first).not.toBe(second);
    expect(first.startsWith('furniture-')).toBe(true);
  });
});
