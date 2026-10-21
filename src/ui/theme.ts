import { MIN_TOUCH_TARGET } from '@/game/constants';

export const COLORS = {
  background: 0x101a2e,
  backgroundTop: 0x16233b,
  backgroundBottom: 0x0b1424,
  panel: 0x1b2740,
  panelLight: 0x243554,
  primary: 0xff6b6b,
  primaryDark: 0xd94f4f,
  accent: 0xffd166,
  accentDark: 0xe0a800,
  teal: 0x2ec4b6,
  tealDark: 0x1b9e8f,
  ground: 0x2e7d5b,
  groundDark: 0x246348,
  hill: 0x276a4f,
  text: '#f7f9fc',
  textDark: '#101a2e',
  textMuted: '#a9b4c7',
  textAccent: '#ffd166',
} as const;

export const FONT_FAMILY = "system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const BUTTON_SIZE = {
  width: 300,
  height: 96,
  smallWidth: 200,
  smallHeight: MIN_TOUCH_TARGET,
} as const;
