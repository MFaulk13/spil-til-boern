import { describe, expect, it } from 'vitest';
import { HOLIDAY_IDS, SEASON_THEME_IDS } from '@/game/catalog/seasons';
import {
  easterSunday,
  easterWindow,
  fastelavnWindow,
  holidayForDate,
  seasonForDate,
  seasonThemeForDate,
} from '@/systems/season';

function date(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12);
}

describe('season dates', () => {
  it('maps months to the four seasons', () => {
    expect(seasonForDate(date(2026, 3, 1))).toBe('spring');
    expect(seasonForDate(date(2026, 5, 31))).toBe('spring');
    expect(seasonForDate(date(2026, 6, 1))).toBe('summer');
    expect(seasonForDate(date(2026, 8, 31))).toBe('summer');
    expect(seasonForDate(date(2026, 9, 1))).toBe('autumn');
    expect(seasonForDate(date(2026, 11, 30))).toBe('autumn');
    expect(seasonForDate(date(2026, 12, 1))).toBe('winter');
    expect(seasonForDate(date(2027, 2, 28))).toBe('winter');
  });

  it('handles leap days', () => {
    expect(seasonForDate(date(2024, 2, 29))).toBe('winter');
  });

  it('returns winter for invalid dates', () => {
    expect(seasonForDate(new Date(Number.NaN))).toBe('winter');
    expect(seasonThemeForDate(new Date(Number.NaN))).toBe('winter');
  });
});

describe('easter and fastelavn', () => {
  it('calculates easter sunday for known years', () => {
    expect(easterSunday(2024)).toEqual(date(2024, 3, 31));
    expect(easterSunday(2025)).toEqual(date(2025, 4, 20));
    expect(easterSunday(2026)).toEqual(date(2026, 4, 5));
    expect(easterSunday(2027)).toEqual(date(2027, 3, 28));
  });

  it('builds the easter window from palm sunday to easter monday', () => {
    const window = easterWindow(2026);
    expect(window.start).toEqual(date(2026, 3, 29));
    expect(window.end).toEqual(date(2026, 4, 6));
  });

  it('builds the fastelavn window around fastelavn sunday', () => {
    const window = fastelavnWindow(2026);
    expect(window.start).toEqual(date(2026, 2, 14));
    expect(window.end).toEqual(date(2026, 2, 17));
    expect(window.start.getDay()).toBe(6);
    expect(window.end.getDay()).toBe(2);
  });
});

describe('holiday windows', () => {
  it('detects halloween', () => {
    expect(holidayForDate(date(2026, 10, 23))).toBeNull();
    expect(holidayForDate(date(2026, 10, 24))).toBe('halloween');
    expect(holidayForDate(date(2026, 11, 1))).toBe('halloween');
    expect(holidayForDate(date(2026, 11, 2))).toBeNull();
  });

  it('detects christmas and new year across the year boundary', () => {
    expect(holidayForDate(date(2026, 11, 30))).toBeNull();
    expect(holidayForDate(date(2026, 12, 1))).toBe('christmas');
    expect(holidayForDate(date(2026, 12, 25))).toBe('christmas');
    expect(holidayForDate(date(2026, 12, 26))).toBeNull();
    expect(holidayForDate(date(2026, 12, 30))).toBe('newYear');
    expect(holidayForDate(date(2027, 1, 2))).toBe('newYear');
    expect(holidayForDate(date(2027, 1, 3))).toBeNull();
  });

  it('detects easter and fastelavn', () => {
    expect(holidayForDate(date(2026, 3, 28))).toBeNull();
    expect(holidayForDate(date(2026, 3, 29))).toBe('easter');
    expect(holidayForDate(date(2026, 4, 6))).toBe('easter');
    expect(holidayForDate(date(2026, 4, 7))).toBeNull();

    expect(holidayForDate(date(2026, 2, 13))).toBeNull();
    expect(holidayForDate(date(2026, 2, 14))).toBe('fastelavn');
    expect(holidayForDate(date(2026, 2, 17))).toBe('fastelavn');
    expect(holidayForDate(date(2026, 2, 18))).toBeNull();
  });

  it('detects sankthans', () => {
    expect(holidayForDate(date(2026, 6, 21))).toBeNull();
    expect(holidayForDate(date(2026, 6, 22))).toBe('sankthans');
    expect(holidayForDate(date(2026, 6, 24))).toBe('sankthans');
    expect(holidayForDate(date(2026, 6, 25))).toBeNull();
  });
});

describe('theme resolution', () => {
  it('lets holidays win over seasons', () => {
    expect(seasonThemeForDate(date(2026, 10, 31))).toBe('halloween');
    expect(seasonThemeForDate(date(2026, 12, 24))).toBe('christmas');
    expect(seasonThemeForDate(date(2026, 2, 15))).toBe('fastelavn');
    expect(seasonThemeForDate(date(2026, 4, 1))).toBe('easter');
    expect(seasonThemeForDate(date(2026, 12, 31))).toBe('newYear');
    expect(seasonThemeForDate(date(2026, 6, 23))).toBe('sankthans');
  });

  it('falls back to the season outside holidays', () => {
    expect(seasonThemeForDate(date(2026, 5, 1))).toBe('spring');
    expect(seasonThemeForDate(date(2026, 7, 15))).toBe('summer');
    expect(seasonThemeForDate(date(2026, 9, 15))).toBe('autumn');
    expect(seasonThemeForDate(date(2026, 1, 15))).toBe('winter');
  });

  it('resolves every day in 2024-2030 to a known theme', () => {
    for (let year = 2024; year <= 2030; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day += 1) {
          expect(SEASON_THEME_IDS).toContain(seasonThemeForDate(date(year, month, day)));
        }
      }
    }
  });

  it('lets every holiday appear at least once every year', () => {
    for (let year = 2024; year <= 2030; year += 1) {
      const themes = new Set<string>();
      for (let month = 1; month <= 12; month += 1) {
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day += 1) {
          themes.add(seasonThemeForDate(date(year, month, day)));
        }
      }
      for (const holiday of HOLIDAY_IDS) {
        expect(themes.has(holiday), `missing ${holiday} in ${year}`).toBe(true);
      }
    }
  });
});
