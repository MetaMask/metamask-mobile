import {
  formatWindowCountdown,
  getAlignedWindowStartMs,
  getWindowDurationMs,
  getWindowProgressRemaining,
  getWindowTimeRemainingMs,
} from './windowClock';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const WINDOW = {
  startsAt: '2026-11-26T23:00:00.000Z',
  endsAt: '2026-11-26T23:15:00.000Z',
};

describe('windowClock', () => {
  describe('getAlignedWindowStartMs', () => {
    it('rounds the time down to the start of its window', () => {
      expect(getAlignedWindowStartMs(5 * 60 * 1000, 305_000)).toBe(300_000);
    });

    it('returns 0 for a non-positive duration', () => {
      expect(getAlignedWindowStartMs(0, 305_000)).toBe(0);
      expect(getAlignedWindowStartMs(-1, 305_000)).toBe(0);
    });

    it('returns 0 for a non-finite time', () => {
      expect(getAlignedWindowStartMs(300_000, Number.NaN)).toBe(0);
    });
  });

  describe('getWindowDurationMs', () => {
    it('returns the length between startsAt and endsAt', () => {
      expect(getWindowDurationMs(WINDOW)).toBe(FIFTEEN_MINUTES_MS);
    });

    it('returns 0 when a bound is missing', () => {
      expect(getWindowDurationMs({ endsAt: WINDOW.endsAt })).toBe(0);
      expect(getWindowDurationMs({ startsAt: WINDOW.startsAt })).toBe(0);
    });

    it('returns 0 when a bound is not a date', () => {
      expect(getWindowDurationMs({ startsAt: 'nope', endsAt: 'nope' })).toBe(0);
    });

    it('returns 0 when the window ends before it starts', () => {
      expect(
        getWindowDurationMs({
          startsAt: WINDOW.endsAt,
          endsAt: WINDOW.startsAt,
        }),
      ).toBe(0);
    });
  });

  describe('getWindowTimeRemainingMs', () => {
    it('returns the time left until endsAt', () => {
      expect(
        getWindowTimeRemainingMs(
          { endsAt: '2026-01-01T00:05:01.000Z' },
          Date.UTC(2026, 0, 1, 0, 4, 0),
        ),
      ).toBe(61_000);
    });

    it('never returns less than 0', () => {
      expect(
        getWindowTimeRemainingMs(WINDOW, Date.parse(WINDOW.endsAt) + 5_000),
      ).toBe(0);
    });

    it('returns undefined when endsAt is missing or invalid', () => {
      expect(getWindowTimeRemainingMs({})).toBeUndefined();
      expect(getWindowTimeRemainingMs({ endsAt: 'nope' })).toBeUndefined();
    });
  });

  describe('formatWindowCountdown', () => {
    it('formats a time under one hour as M:SS', () => {
      expect(
        formatWindowCountdown(
          { endsAt: '2026-01-01T00:05:01.000Z' },
          Date.UTC(2026, 0, 1, 0, 4, 0),
        ),
      ).toBe('1:01');
    });

    it('formats a time of one hour or more as H:MM:SS', () => {
      expect(
        formatWindowCountdown(
          { endsAt: '2026-01-01T04:00:01.000Z' },
          Date.UTC(2026, 0, 1, 0, 0, 0),
        ),
      ).toBe('4:00:01');
    });

    it('rounds a part of a second up', () => {
      expect(
        formatWindowCountdown(WINDOW, Date.parse(WINDOW.endsAt) - 1_500),
      ).toBe('0:02');
    });

    it('returns 00:00 at and after the end', () => {
      expect(formatWindowCountdown(WINDOW, Date.parse(WINDOW.endsAt))).toBe(
        '00:00',
      );
      expect(
        formatWindowCountdown(WINDOW, Date.parse(WINDOW.endsAt) + 1_000),
      ).toBe('00:00');
    });

    it('returns --:-- when endsAt is missing', () => {
      expect(formatWindowCountdown({})).toBe('--:--');
    });
  });

  describe('getWindowProgressRemaining', () => {
    it('derives the duration from startsAt and endsAt', () => {
      expect(
        getWindowProgressRemaining(
          WINDOW,
          Date.parse(WINDOW.startsAt) + FIFTEEN_MINUTES_MS / 2,
        ),
      ).toBe(0.5);
    });

    it('uses the duration the caller passes', () => {
      expect(
        getWindowProgressRemaining(
          { endsAt: '2026-01-01T00:04:00.000Z' },
          Date.UTC(2026, 0, 1, 0, 2, 0),
          5 * 60 * 1000,
        ),
      ).toBe(0.4);
    });

    it('caps the result at 1 before the window opens', () => {
      expect(
        getWindowProgressRemaining(
          WINDOW,
          Date.parse(WINDOW.startsAt) - 60_000,
        ),
      ).toBe(1);
    });

    it('returns 0 at the end', () => {
      expect(
        getWindowProgressRemaining(WINDOW, Date.parse(WINDOW.endsAt)),
      ).toBe(0);
    });

    it('returns 0 for a zero duration', () => {
      expect(getWindowProgressRemaining({ endsAt: WINDOW.endsAt })).toBe(0);
      expect(getWindowProgressRemaining(WINDOW, Date.now(), 0)).toBe(0);
    });

    it('returns 0 when endsAt is missing', () => {
      expect(getWindowProgressRemaining({}, Date.now(), 60_000)).toBe(0);
    });
  });
});
