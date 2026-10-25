import {
  getSeasonTheme,
  HOLIDAY_PRIORITY,
  type HolidayId,
  type SeasonId,
  type SeasonThemeDefinition,
  type SeasonThemeId,
} from '@/game/catalog/seasons';

const DAY_MS = 86_400_000;

function isValidDate(date: Date): boolean {
  return date instanceof Date && Number.isFinite(date.getTime());
}

function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12);
}

function addDays(date: Date, days: number): Date {
  const result = localDate(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function isWithin(date: Date, start: Date, end: Date): boolean {
  const value = dayNumber(date);
  return value >= dayNumber(start) && value <= dayNumber(end);
}

export function easterSunday(year: number): Date {
  const safeYear = Number.isFinite(year) ? Math.floor(year) : 0;
  const a = safeYear % 19;
  const b = Math.floor(safeYear / 100);
  const c = safeYear % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return localDate(safeYear, month - 1, day);
}

export function fastelavnWindow(year: number): { start: Date; end: Date } {
  const easter = easterSunday(year);
  return {
    start: addDays(easter, -50),
    end: addDays(easter, -47),
  };
}

export function easterWindow(year: number): { start: Date; end: Date } {
  const easter = easterSunday(year);
  return {
    start: addDays(easter, -7),
    end: addDays(easter, 1),
  };
}

export function holidayForDate(date: Date): HolidayId | null {
  if (!isValidDate(date)) {
    return null;
  }

  const year = date.getFullYear();
  const windows: Record<Exclude<HolidayId, 'newYear'>, { start: Date; end: Date }> = {
    fastelavn: fastelavnWindow(year),
    easter: easterWindow(year),
    halloween: {
      start: localDate(year, 9, 24),
      end: localDate(year, 10, 1),
    },
    christmas: {
      start: localDate(year, 11, 1),
      end: localDate(year, 11, 25),
    },
    sankthans: {
      start: localDate(year, 5, 22),
      end: localDate(year, 5, 24),
    },
  };

  for (const holiday of HOLIDAY_PRIORITY) {
    if (holiday === 'newYear') {
      const isDecember = date.getMonth() === 11 && date.getDate() >= 30;
      const isJanuary = date.getMonth() === 0 && date.getDate() <= 2;
      if (isDecember || isJanuary) {
        return holiday;
      }
      continue;
    }
    const window = windows[holiday];
    if (isWithin(date, window.start, window.end)) {
      return holiday;
    }
  }

  return null;
}

export function seasonForDate(date: Date): SeasonId {
  if (!isValidDate(date)) {
    return 'winter';
  }
  const month = date.getMonth();
  if (month >= 2 && month <= 4) {
    return 'spring';
  }
  if (month >= 5 && month <= 7) {
    return 'summer';
  }
  if (month >= 8 && month <= 10) {
    return 'autumn';
  }
  return 'winter';
}

export function seasonThemeForDate(date: Date = new Date()): SeasonThemeId {
  if (!isValidDate(date)) {
    return 'winter';
  }
  return holidayForDate(date) ?? seasonForDate(date);
}

export function currentSeasonTheme(date: Date = new Date()): SeasonThemeDefinition {
  return getSeasonTheme(seasonThemeForDate(date));
}
