import { MIN_TOUCH_TARGET } from '@/game/constants';
import type { CareNeed, ItemCategory } from '@/game/types';
import type { CareAction, Mood } from '@/systems/pet';

export const COLORS = {
  background: 0xfff6e5,
  backgroundTop: 0xffe9c7,
  backgroundBottom: 0xffd7a8,
  panel: 0xfff8ee,
  panelLight: 0xfff1dd,
  primary: 0xff8b7d,
  primaryDark: 0xe06a5e,
  accent: 0xffc94d,
  accentDark: 0xe0a800,
  teal: 0x62c9b8,
  tealDark: 0x3fa697,
  sky: 0xa8d8f0,
  lavender: 0xc9b2e8,
  ground: 0xa7d8a0,
  groundDark: 0x7fbb7a,
  hill: 0x8acb8a,
  ink: 0x3a2e2a,
  text: '#3a2e2a',
  textDark: '#3a2e2a',
  textMuted: '#5f514a',
  textAccent: '#b5561f',
  white: '#ffffff',
} as const;

export const FONT_FAMILY =
  "'Nunito', 'Segoe UI Rounded', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const NEED_COLORS: Record<CareNeed, number> = {
  hunger: 0xff8b7d,
  joy: 0xffc94d,
  energy: 0x62c9b8,
};

export const CARE_COLORS: Record<CareAction, number> = {
  feed: 0xff8b7d,
  play: 0xffc94d,
  pet: 0xc9b2e8,
  sleep: 0x62c9b8,
  treat: 0xff9f70,
};

export const CATEGORY_COLORS: Record<ItemCategory, number> = {
  furniture: 0x62c9b8,
  toy: 0xffc94d,
  accessory: 0xc9b2e8,
  treat: 0xff9f70,
};

export const MOOD_COLORS: Record<Mood, string> = {
  happy: '#3fa697',
  okay: '#b5561f',
  sad: '#4f6699',
};

export const BUTTON_SIZE = {
  width: 300,
  height: 96,
  smallWidth: 200,
  smallHeight: MIN_TOUCH_TARGET,
} as const;
