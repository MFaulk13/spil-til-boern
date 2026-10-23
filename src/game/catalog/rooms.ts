import { text } from '@/game/text';
import type { HomeFixture, Point, RoomId, WorldRect } from '@/game/types';

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
  fixtures: readonly HomeFixture[];
  doors: readonly RoomDoor[];
}

const ROOM_BOUNDS: WorldRect = { left: 130, right: 1150, top: 500, bottom: 602 };
const PLACEMENT_AREA: WorldRect = { left: 128, right: 1152, top: 320, bottom: 640 };

const BACK_TO_LIVING: RoomDoor = {
  target: 'living',
  x: 150,
  y: 278,
  label: text.rooms.toLiving,
};

export const ROOMS: Record<RoomId, RoomDefinition> = {
  living: {
    id: 'living',
    label: text.rooms.living,
    assetKey: 'room-living',
    bounds: ROOM_BOUNDS,
    placementArea: PLACEMENT_AREA,
    spawn: { x: 590, y: 586 },
    fixtures: [
      { id: 'bowl', x: 236, y: 586 },
      { id: 'ball', x: 1032, y: 584 },
      { id: 'cushion', x: 916, y: 574 },
    ],
    doors: [
      {
        target: 'kitchen',
        x: 286,
        y: 250,
        label: text.rooms.toKitchen,
      },
      {
        target: 'bathroom',
        x: 522,
        y: 250,
        label: text.rooms.toBathroom,
      },
      {
        target: 'playroom',
        x: 758,
        y: 250,
        label: text.rooms.toPlayroom,
      },
      {
        target: 'bedroom',
        x: 994,
        y: 250,
        label: text.rooms.toBedroom,
      },
    ],
  },
  bedroom: {
    id: 'bedroom',
    label: text.rooms.bedroom,
    assetKey: 'room-bedroom',
    bounds: ROOM_BOUNDS,
    placementArea: PLACEMENT_AREA,
    spawn: { x: 300, y: 586 },
    fixtures: [{ id: 'cushion', x: 916, y: 574 }],
    doors: [BACK_TO_LIVING],
  },
  kitchen: {
    id: 'kitchen',
    label: text.rooms.kitchen,
    assetKey: 'room-kitchen',
    bounds: ROOM_BOUNDS,
    placementArea: PLACEMENT_AREA,
    spawn: { x: 640, y: 586 },
    fixtures: [{ id: 'bowl', x: 262, y: 586 }],
    doors: [BACK_TO_LIVING],
  },
  bathroom: {
    id: 'bathroom',
    label: text.rooms.bathroom,
    assetKey: 'room-bathroom',
    bounds: ROOM_BOUNDS,
    placementArea: PLACEMENT_AREA,
    spawn: { x: 640, y: 586 },
    fixtures: [],
    doors: [BACK_TO_LIVING],
  },
  playroom: {
    id: 'playroom',
    label: text.rooms.playroom,
    assetKey: 'room-playroom',
    bounds: ROOM_BOUNDS,
    placementArea: PLACEMENT_AREA,
    spawn: { x: 300, y: 586 },
    fixtures: [
      { id: 'ball', x: 1032, y: 584 },
      { id: 'cushion', x: 916, y: 574 },
    ],
    doors: [BACK_TO_LIVING],
  },
};

export function getRoom(id: RoomId): RoomDefinition {
  return ROOMS[id];
}
