import { formatDurationForDisplay } from './time';

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
