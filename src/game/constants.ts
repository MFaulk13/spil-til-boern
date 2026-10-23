export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const MIN_TOUCH_TARGET = 64;

export const EGG_TAP_COUNT = 5;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  PROFILE: 'ProfileScene',
  MENU: 'MenuScene',
  CHARACTER: 'CharacterScene',
  PET_SELECT: 'PetSelectScene',
  HATCH: 'HatchScene',
  HOME: 'HomeScene',
  TOWN: 'TownScene',
  PARK: 'ParkScene',
  SHOP: 'ShopScene',
  SCHOOL: 'SchoolScene',
  QUIZ: 'QuizScene',
  HUD: 'HudScene',
} as const;

export const HOME_BOUNDS = {
  left: 130,
  right: GAME_WIDTH - 130,
  top: 500,
  bottom: 592,
} as const;
