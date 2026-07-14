import {
  formatDurationForDisplay,
  isWithinLast30Days,
  isRecentlyListed,
  formatTimeSinceListing,
} from './time';

describe('formatDurationForDisplay', () => {
  it('should format seconds correctly', () => {
    expect(formatDurationForDisplay(1)).toBe('1 second');
    expect(formatDurationForDisplay(30)).toBe('30 seconds');
    expect(formatDurationForDisplay(45)).toBe('45 seconds');
    expect(formatDurationForDisplay(59)).toBe('59 seconds');
  });

  it('should format minutes correctly', () => {
    expect(formatDurationForDisplay(60)).toBe('1 minute');
    expect(formatDurationForDisplay(120)).toBe('2 minutes');
    expect(formatDurationForDisplay(90)).toBe('2 minutes'); // Rounds 1.5 to 2
    expect(formatDurationForDisplay(150)).toBe('3 minutes'); // Rounds 2.5 to 3
  });

  it('should format hours correctly', () => {
    expect(formatDurationForDisplay(3600)).toBe('1 hour');
    expect(formatDurationForDisplay(5400)).toBe('2 hours'); // Rounds 1.5 to 2
    expect(formatDurationForDisplay(7200)).toBe('2 hours');
  });

  it('should handle edge cases', () => {
    expect(formatDurationForDisplay(0)).toBe('0 seconds');
    expect(formatDurationForDisplay(1)).toBe('1 second');
    expect(formatDurationForDisplay(3599)).toBe('1 hour'); // Shows as 1 hr since it's very close
    expect(formatDurationForDisplay(3601)).toBe('1 hour'); // Just over an hour
  });
});

describe('isWithinLast30Days', () => {
  const NOW = 1_700_000_000_000; // fixed epoch ms for determinism

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true for a timestamp 1 hour ago', () => {
    expect(isWithinLast30Days(NOW - 60 * 60 * 1000)).toBe(true);
  });

  it('returns true for a timestamp 29 days ago', () => {
    expect(isWithinLast30Days(NOW - 29 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it('returns true at exactly 30 days minus 1 ms', () => {
    expect(isWithinLast30Days(NOW - 30 * 24 * 60 * 60 * 1000 + 1)).toBe(true);
  });

  it('returns false at exactly 30 days', () => {
    expect(isWithinLast30Days(NOW - 30 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('returns false for a timestamp 31 days ago', () => {
    expect(isWithinLast30Days(NOW - 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});

describe('isRecentlyListed', () => {
  const NOW = 1_700_000_000_000; // fixed epoch ms for determinism

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true for a listedAt timestamp within the last 30 days', () => {
    expect(isRecentlyListed(NOW - 5 * 24 * 60 * 60 * 1000)).toBe(true);
  });

  it('returns false for a listedAt timestamp older than 30 days', () => {
    expect(isRecentlyListed(NOW - 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('returns false when listedAt is undefined', () => {
    expect(isRecentlyListed(undefined)).toBe(false);
  });
});

describe('formatTimeSinceListing', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns "1h ago" for a sub-hour listing (minimum display)', () => {
    expect(formatTimeSinceListing(NOW - 30 * 60 * 1000)).toBe('1h ago');
  });

  it('returns "1h ago" for exactly 1 hour ago', () => {
    expect(formatTimeSinceListing(NOW - 60 * 60 * 1000)).toBe('1h ago');
  });

  it('returns "3h ago" for 3 hours ago', () => {
    expect(formatTimeSinceListing(NOW - 3 * 60 * 60 * 1000)).toBe('3h ago');
  });

  it('returns "23h ago" for 23 hours ago', () => {
    expect(formatTimeSinceListing(NOW - 23 * 60 * 60 * 1000)).toBe('23h ago');
  });

  it('returns "1 day ago" for exactly 1 day ago', () => {
    expect(formatTimeSinceListing(NOW - 24 * 60 * 60 * 1000)).toBe('1 day ago');
  });

  it('returns "1 day ago" for 1 day and 3 hours ago', () => {
    expect(formatTimeSinceListing(NOW - 27 * 60 * 60 * 1000)).toBe('1 day ago');
  });

  it('returns "2 days ago" for 2 days ago', () => {
    expect(formatTimeSinceListing(NOW - 2 * 24 * 60 * 60 * 1000)).toBe(
      '2 days ago',
    );
  });

  it('returns "12 days ago" for 12 days ago', () => {
    expect(formatTimeSinceListing(NOW - 12 * 24 * 60 * 60 * 1000)).toBe(
      '12 days ago',
    );
  });

  it('returns "29 days ago" for 29 days ago', () => {
    expect(formatTimeSinceListing(NOW - 29 * 24 * 60 * 60 * 1000)).toBe(
      '29 days ago',
    );
  });
});
