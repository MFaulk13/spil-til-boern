import { text } from '@/game/text';

export const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'] as const;

export type SeasonId = (typeof SEASON_IDS)[number];

export const HOLIDAY_IDS = [
  'halloween',
  'christmas',
  'easter',
  'newYear',
  'fastelavn',
  'sankthans',
] as const;

export type HolidayId = (typeof HOLIDAY_IDS)[number];

export const SEASON_THEME_IDS = [...SEASON_IDS, ...HOLIDAY_IDS] as const;

export type SeasonThemeId = SeasonId | HolidayId;

export type SeasonParticle =
  'petals' | 'sun' | 'leaves' | 'snow' | 'sparks' | 'confetti' | 'embers' | 'fireworks';

export interface SeasonPalette {
  top: number;
  bottom: number;
  accent: number;
  wash: number;
  washAlpha: number;
  ground: number;
  groundAlpha: number;
}

export interface SeasonThemeDefinition {
  id: SeasonThemeId;
  kind: 'season' | 'holiday';
  label: string;
  greeting: string;
  info: string;
  decorKey: string;
  particle: SeasonParticle;
  particleColors: readonly number[];
  palette: SeasonPalette;
}

export const HOLIDAY_PRIORITY: readonly HolidayId[] = [
  'fastelavn',
  'easter',
  'halloween',
  'christmas',
  'newYear',
  'sankthans',
];

const THEMES: Record<SeasonThemeId, SeasonThemeDefinition> = {
  spring: {
    id: 'spring',
    kind: 'season',
    label: text.seasons.names.spring,
    greeting: text.seasons.greetings.spring,
    info: text.seasons.descriptions.spring,
    decorKey: 'season-spring',
    particle: 'petals',
    particleColors: [0xf7a8c4, 0xffd1e0, 0xfff1a8, 0x9ad9a0],
    palette: {
      top: 0xdff5e3,
      bottom: 0xffe3ee,
      accent: 0x7bc47f,
      wash: 0x9ad9a0,
      washAlpha: 0.09,
      ground: 0x8fd18a,
      groundAlpha: 0.14,
    },
  },
  summer: {
    id: 'summer',
    kind: 'season',
    label: text.seasons.names.summer,
    greeting: text.seasons.greetings.summer,
    info: text.seasons.descriptions.summer,
    decorKey: 'season-summer',
    particle: 'sun',
    particleColors: [0xffd166, 0xfff1a8, 0xfff8dd],
    palette: {
      top: 0xbdeeff,
      bottom: 0xffeead,
      accent: 0xffb703,
      wash: 0xffc94d,
      washAlpha: 0.08,
      ground: 0x7fbb7a,
      groundAlpha: 0.12,
    },
  },
  autumn: {
    id: 'autumn',
    kind: 'season',
    label: text.seasons.names.autumn,
    greeting: text.seasons.greetings.autumn,
    info: text.seasons.descriptions.autumn,
    decorKey: 'season-autumn',
    particle: 'leaves',
    particleColors: [0xd9772a, 0xe88b3a, 0xb85a24, 0xffc94d],
    palette: {
      top: 0xffe3bf,
      bottom: 0xe8b27a,
      accent: 0xd9772a,
      wash: 0xd9772a,
      washAlpha: 0.08,
      ground: 0xd9a05b,
      groundAlpha: 0.18,
    },
  },
  winter: {
    id: 'winter',
    kind: 'season',
    label: text.seasons.names.winter,
    greeting: text.seasons.greetings.winter,
    info: text.seasons.descriptions.winter,
    decorKey: 'season-winter',
    particle: 'snow',
    particleColors: [0xffffff, 0xe4f2ff],
    palette: {
      top: 0xdceeff,
      bottom: 0xf7fbff,
      accent: 0x7aa7d9,
      wash: 0xa8d8f0,
      washAlpha: 0.1,
      ground: 0xffffff,
      groundAlpha: 0.24,
    },
  },
  halloween: {
    id: 'halloween',
    kind: 'holiday',
    label: text.seasons.names.halloween,
    greeting: text.seasons.greetings.halloween,
    info: text.seasons.descriptions.halloween,
    decorKey: 'season-halloween',
    particle: 'sparks',
    particleColors: [0xff8c42, 0xffc94d, 0x9b6fcf],
    palette: {
      top: 0xd9c2ee,
      bottom: 0xffcf9e,
      accent: 0xff7b3d,
      wash: 0x9b6fcf,
      washAlpha: 0.08,
      ground: 0x7a5a9b,
      groundAlpha: 0.12,
    },
  },
  christmas: {
    id: 'christmas',
    kind: 'holiday',
    label: text.seasons.names.christmas,
    greeting: text.seasons.greetings.christmas,
    info: text.seasons.descriptions.christmas,
    decorKey: 'season-christmas',
    particle: 'snow',
    particleColors: [0xffffff, 0xffe7b0],
    palette: {
      top: 0xe4f6e6,
      bottom: 0xffe0e0,
      accent: 0xc0392b,
      wash: 0x2f8f5b,
      washAlpha: 0.07,
      ground: 0xf7fbff,
      groundAlpha: 0.2,
    },
  },
  easter: {
    id: 'easter',
    kind: 'holiday',
    label: text.seasons.names.easter,
    greeting: text.seasons.greetings.easter,
    info: text.seasons.descriptions.easter,
    decorKey: 'season-easter',
    particle: 'petals',
    particleColors: [0xf7a8c4, 0xfff1a8, 0xb8e4ff, 0xc9f2c7],
    palette: {
      top: 0xfff5c4,
      bottom: 0xdff3cf,
      accent: 0xe39ac0,
      wash: 0xffd166,
      washAlpha: 0.07,
      ground: 0x9ad9a0,
      groundAlpha: 0.12,
    },
  },
  newYear: {
    id: 'newYear',
    kind: 'holiday',
    label: text.seasons.names.newYear,
    greeting: text.seasons.greetings.newYear,
    info: text.seasons.descriptions.newYear,
    decorKey: 'season-new-year',
    particle: 'fireworks',
    particleColors: [0xffc94d, 0xff8b7d, 0x8f7bd9, 0x62c9b8],
    palette: {
      top: 0xf3e8ff,
      bottom: 0xd9e8ff,
      accent: 0xffc94d,
      wash: 0x8f7bd9,
      washAlpha: 0.08,
      ground: 0x8f7bd9,
      groundAlpha: 0.1,
    },
  },
  fastelavn: {
    id: 'fastelavn',
    kind: 'holiday',
    label: text.seasons.names.fastelavn,
    greeting: text.seasons.greetings.fastelavn,
    info: text.seasons.descriptions.fastelavn,
    decorKey: 'season-fastelavn',
    particle: 'confetti',
    particleColors: [0xff8b7d, 0xffc94d, 0x62c9b8, 0xc9b2e8, 0xfff1a8],
    palette: {
      top: 0xffe4f0,
      bottom: 0xe8e0ff,
      accent: 0xff8b7d,
      wash: 0xff8b7d,
      washAlpha: 0.07,
      ground: 0xff8b7d,
      groundAlpha: 0.1,
    },
  },
  sankthans: {
    id: 'sankthans',
    kind: 'holiday',
    label: text.seasons.names.sankthans,
    greeting: text.seasons.greetings.sankthans,
    info: text.seasons.descriptions.sankthans,
    decorKey: 'season-sankthans',
    particle: 'embers',
    particleColors: [0xff7b54, 0xffc94d, 0xffe7b0],
    palette: {
      top: 0xffe9b8,
      bottom: 0xffcf9e,
      accent: 0xff7b54,
      wash: 0xff7b54,
      washAlpha: 0.08,
      ground: 0xffb703,
      groundAlpha: 0.14,
    },
  },
};

export const SEASON_THEMES: readonly SeasonThemeDefinition[] = SEASON_THEME_IDS.map(
  (id) => THEMES[id],
);

export function getSeasonTheme(id: SeasonThemeId): SeasonThemeDefinition {
  return THEMES[id];
}

export function isSeasonThemeId(value: unknown): value is SeasonThemeId {
  return typeof value === 'string' && (SEASON_THEME_IDS as readonly string[]).includes(value);
}
