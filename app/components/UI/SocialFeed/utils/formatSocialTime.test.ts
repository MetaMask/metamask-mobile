import { DAY, HOUR, MINUTE, SECOND } from '../../../../constants/time';
import {
  formatSocialElapsed,
  formatSocialRelativeAge,
  formatSocialSecondsAgo,
} from './formatSocialTime';

const NOW = new Date('2026-07-09T12:00:00Z').getTime();

describe('formatSocialRelativeAge', () => {
  it('renders Just now under a minute, including clock skew', () => {
    expect(formatSocialRelativeAge(NOW - 21 * SECOND, NOW)).toBe('Just now');
    expect(formatSocialRelativeAge(NOW - 59 * SECOND, NOW)).toBe('Just now');
    expect(formatSocialRelativeAge(NOW + 5 * SECOND, NOW)).toBe('Just now');
  });

  it('uses compact minutes and hours with no space before the unit', () => {
    expect(formatSocialRelativeAge(NOW - MINUTE, NOW)).toBe('1m ago');
    expect(formatSocialRelativeAge(NOW - 4 * MINUTE, NOW)).toBe('4m ago');
    expect(formatSocialRelativeAge(NOW - 40 * MINUTE, NOW)).toBe('40m ago');
    expect(formatSocialRelativeAge(NOW - HOUR, NOW)).toBe('1h ago');
    expect(formatSocialRelativeAge(NOW - 4 * HOUR, NOW)).toBe('4h ago');
    expect(formatSocialRelativeAge(NOW - 23 * HOUR, NOW)).toBe('23h ago');
  });

  it('keeps days through 59 days so an 11 day post stays 11d ago', () => {
    expect(formatSocialRelativeAge(NOW - DAY, NOW)).toBe('1d ago');
    expect(formatSocialRelativeAge(NOW - 11 * DAY, NOW)).toBe('11d ago');
    expect(formatSocialRelativeAge(NOW - 33 * DAY, NOW)).toBe('33d ago');
    expect(formatSocialRelativeAge(NOW - 59 * DAY, NOW)).toBe('59d ago');
  });

  it('promotes 60 days to weeks, 90 days to months, and a year to years', () => {
    expect(formatSocialRelativeAge(NOW - 60 * DAY, NOW)).toBe('8w ago');
    expect(formatSocialRelativeAge(NOW - 90 * DAY, NOW)).toBe('3mo ago');
    expect(formatSocialRelativeAge(NOW - 365 * DAY, NOW)).toBe('1y ago');
    expect(formatSocialRelativeAge(NOW - 400 * DAY, NOW)).toBe('1y ago');
  });

  it('accepts a seconds-precision timestamp', () => {
    expect(
      formatSocialRelativeAge(Math.floor((NOW - 40 * MINUTE) / 1000), NOW),
    ).toBe('40m ago');
  });
});

describe('formatSocialElapsed', () => {
  it('rounds a sub-minute hold up to 1m and rejects a non-positive span', () => {
    expect(formatSocialElapsed(20 * SECOND)).toBe('1m');
    expect(formatSocialElapsed(0)).toBe('—');
    expect(formatSocialElapsed(-HOUR)).toBe('—');
  });

  it('uses one unit under a day and drops leftover minutes', () => {
    expect(formatSocialElapsed(45 * MINUTE)).toBe('45m');
    expect(formatSocialElapsed(8 * HOUR)).toBe('8h');
    expect(formatSocialElapsed(8 * HOUR + 13 * MINUTE)).toBe('8h');
  });

  it('keeps days plus leftover hours through 59 days', () => {
    expect(formatSocialElapsed(DAY + 20 * HOUR)).toBe('1d 20h');
    expect(formatSocialElapsed(6 * DAY)).toBe('6d');
    expect(formatSocialElapsed(33 * DAY + 6 * HOUR)).toBe('33d 6h');
    expect(formatSocialElapsed(59 * DAY + 3 * HOUR)).toBe('59d 3h');
  });

  it('promotes longer holds to weeks, months, and years', () => {
    expect(formatSocialElapsed(60 * DAY)).toBe('8w 4d');
    expect(formatSocialElapsed(70 * DAY)).toBe('10w');
    expect(formatSocialElapsed(90 * DAY)).toBe('3mo');
    expect(formatSocialElapsed(100 * DAY)).toBe('3mo 10d');
    expect(formatSocialElapsed(365 * DAY)).toBe('1y');
    expect(formatSocialElapsed(400 * DAY)).toBe('1y 1mo');
  });
});

describe('formatSocialSecondsAgo', () => {
  it('formats an explicit second count and collapses zero to Just now', () => {
    expect(formatSocialSecondsAgo(2)).toBe('2s ago');
    expect(formatSocialSecondsAgo(0)).toBe('Just now');
  });
});
