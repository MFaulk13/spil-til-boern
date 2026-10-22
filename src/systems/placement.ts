import { getItem, type ItemDefinition } from '@/game/catalog/items';
import type { PlacedFurniture, Point, RoomId, WorldRect } from '@/game/types';

export const PLACEMENT_GRID = 64;

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

let uidCounter = 0;

export function snapToGrid(value: number): number {
  const snapped = Math.round(value / PLACEMENT_GRID) * PLACEMENT_GRID;
  return snapped === 0 ? 0 : snapped;
}

export function footprintOf(item: ItemDefinition): { width: number; height: number } {
  return {
    width: item.gridWidth * PLACEMENT_GRID,
    height: item.gridHeight * PLACEMENT_GRID,
  };
}

export function rectAt(item: ItemDefinition, x: number, y: number): Rect {
  const { width, height } = footprintOf(item);
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

export function snapCenter(item: ItemDefinition, x: number, y: number): Point {
  const { width, height } = footprintOf(item);
  return {
    x: snapToGrid(x - width / 2) + width / 2,
    y: snapToGrid(y - height / 2) + height / 2,
  };
}

export function clampCenter(item: ItemDefinition, x: number, y: number, area: WorldRect): Point {
  const { width, height } = footprintOf(item);
  const minX = area.left + width / 2;
  const maxX = area.right - width / 2;
  const minY = area.top + height / 2;
  const maxY = area.bottom - height / 2;

  const snapped = snapCenter(item, x, y);
  return {
    x: minX > maxX ? (area.left + area.right) / 2 : Math.min(Math.max(snapped.x, minX), maxX),
    y: minY > maxY ? (area.top + area.bottom) / 2 : Math.min(Math.max(snapped.y, minY), maxY),
  };
}

export function isInsideArea(rect: Rect, area: WorldRect): boolean {
  const tolerance = 0.01;
  return (
    rect.left >= area.left - tolerance &&
    rect.right <= area.right + tolerance &&
    rect.top >= area.top - tolerance &&
    rect.bottom <= area.bottom + tolerance
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function canPlace(
  item: ItemDefinition,
  x: number,
  y: number,
  area: WorldRect,
  room: RoomId,
  placed: readonly PlacedFurniture[],
  ignoreUid?: string,
): boolean {
  if (!item.placeable || item.gridWidth <= 0 || item.gridHeight <= 0) {
    return false;
  }

  const rect = rectAt(item, x, y);
  if (!isInsideArea(rect, area)) {
    return false;
  }

  for (const furniture of placed) {
    if (furniture.room !== room || furniture.uid === ignoreUid) {
      continue;
    }
    const other = getItem(furniture.itemId);
    if (!other) {
      continue;
    }
    if (rectsOverlap(rect, rectAt(other, furniture.x, furniture.y))) {
      return false;
    }
  }

  return true;
}

export function findFreeSpot(
  item: ItemDefinition,
  area: WorldRect,
  room: RoomId,
  placed: readonly PlacedFurniture[],
): Point | null {
  const { width, height } = footprintOf(item);
  if (width <= 0 || height <= 0) {
    return null;
  }

  for (let top = area.top; top + height <= area.bottom; top += PLACEMENT_GRID) {
    for (let left = area.left; left + width <= area.right; left += PLACEMENT_GRID) {
      const x = left + width / 2;
      const y = top + height / 2;
      if (canPlace(item, x, y, area, room, placed)) {
        return { x, y };
      }
    }
  }

  return null;
}

export function createFurnitureUid(): string {
  uidCounter += 1;
  return `furniture-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}
