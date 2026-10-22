import { text } from '@/game/text';
import type { Point, RoomId, WorldRect } from '@/game/types';

export interface RoomDoor {
  target: RoomId;
  x: number;
  y: number;
  label: string;
}

export interface RoomDefinition {
  id: RoomId;
  label: string;
  assetKey: string;
  bounds: WorldRect;
  placementArea: WorldRect;
  spawn: Point;
  doors: readonly RoomDoor[];
}

export const ROOMS: Record<RoomId, RoomDefinition> = {
  living: {
    id: 'living',
    label: text.rooms.living,
    assetKey: 'room-living',
    bounds: { left: 130, right: 1150, top: 500, bottom: 602 },
    placementArea: { left: 128, right: 1152, top: 320, bottom: 640 },
    spawn: { x: 590, y: 586 },
    doors: [
      {
        target: 'bedroom',
        x: 1117,
        y: 278,
        label: text.rooms.toBedroom,
      },
    ],
  },
  bedroom: {
    id: 'bedroom',
    label: text.rooms.bedroom,
    assetKey: 'room-bedroom',
    bounds: { left: 130, right: 1150, top: 500, bottom: 602 },
    placementArea: { left: 128, right: 1152, top: 320, bottom: 640 },
    spawn: { x: 300, y: 586 },
    doors: [
      {
        target: 'living',
        x: 150,
        y: 278,
        label: text.rooms.toLiving,
      },
    ],
  },
};

export function getRoom(id: RoomId): RoomDefinition {
  return ROOMS[id];
}
