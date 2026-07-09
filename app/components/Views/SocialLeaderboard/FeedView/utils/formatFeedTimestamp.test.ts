import {
  formatFeedDateLabel,
  formatFeedTimestamp,
} from './formatFeedTimestamp';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatFeedTimestamp', () => {
  const now = new Date('2026-07-09T12:00:00Z').getTime();

  it('formats seconds within the last minute', () => {
    expect(formatFeedTimestamp(now - 21 * SECOND, now)).toBe('21s');
  });

  it('formats minutes within the last hour', () => {
    expect(formatFeedTimestamp(now - 4 * MINUTE, now)).toBe('4m');
  });

  it('formats hours within the last day', () => {
    expect(formatFeedTimestamp(now - 3 * HOUR, now)).toBe('3h');
  });

  it('clamps future timestamps to 0 seconds', () => {
    expect(formatFeedTimestamp(now + 5 * SECOND, now)).toBe('0s');
  });

  it('formats an absolute clock time for timestamps older than 24h', () => {
    const result = formatFeedTimestamp(now - DAY - HOUR, now);
    // Absolute time is locale/timezone dependent, so assert the shape only.
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/u);
  });
});

describe('formatFeedDateLabel', () => {
  it('formats a full date label', () => {
    const label = formatFeedDateLabel(
      new Date('2026-07-01T15:00:00Z').getTime(),
    );
    expect(label).toMatch(/2026/u);
    expect(label).toMatch(/July|Jun|Jul/u);
  });
});
