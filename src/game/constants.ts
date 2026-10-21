export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAY_AREA_TOP = 150;
export const PLAYER_SPEED = 460;
export const PLAYER_SIZE = 120;
export const STAR_SIZE = 92;
export const STAR_GOAL = 10;

export const MIN_TOUCH_TARGET = 64;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  UI: 'UiScene',
} as const;

export const REGISTRY_KEYS = {
  STARS: 'stars',
  GOAL: 'goal',
  BEST: 'best',
  NEW_RECORD: 'newRecord',
  COMPLETE: 'complete',
} as const;

export const PLAY_BOUNDS = {
  left: 80,
  right: GAME_WIDTH - 80,
  top: PLAY_AREA_TOP + 60,
  bottom: GAME_HEIGHT - 80,
} as const;
