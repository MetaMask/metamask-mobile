import { formatTokenAge } from './formatTokenAge';

describe('formatTokenAge', () => {
  const NOW_SECONDS = 1_700_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW_SECONDS * 1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null for null input', () => {
    expect(formatTokenAge(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatTokenAge(undefined)).toBeNull();
  });

  it('returns null for zero', () => {
    expect(formatTokenAge(0)).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(formatTokenAge(-100)).toBeNull();
  });

  it('returns null for a future timestamp', () => {
    expect(formatTokenAge(NOW_SECONDS + 3600)).toBeNull();
  });

  it('formats seconds', () => {
    expect(formatTokenAge(NOW_SECONDS - 45, 'en')).toBe('45s');
  });

  it('formats minutes', () => {
    expect(formatTokenAge(NOW_SECONDS - 5 * 60, 'en')).toBe('5m');
  });

  it('formats hours', () => {
    expect(formatTokenAge(NOW_SECONDS - 3 * 3600, 'en')).toBe('3h');
  });

  it('formats days', () => {
    expect(formatTokenAge(NOW_SECONDS - 3 * 86400, 'en')).toBe('3d');
  });

  it('formats weeks', () => {
    expect(formatTokenAge(NOW_SECONDS - 2 * 7 * 86400, 'en')).toBe('2w');
  });

  it('formats months', () => {
    // Intl narrow: month and minute both use "m" in English
    expect(formatTokenAge(NOW_SECONDS - 90 * 86400, 'en')).toBe('3m');
  });

  it('formats years', () => {
    expect(formatTokenAge(NOW_SECONDS - 400 * 86400, 'en')).toBe('1y');
  });

  it('truncates rather than rounds', () => {
    // 23 hours and 59 minutes → still "23h", not "1d"
    expect(formatTokenAge(NOW_SECONDS - (23 * 3600 + 59 * 60), 'en')).toBe(
      '23h',
    );
  });
});
