import { formatDurationForDisplay } from './time';

describe('formatDurationForDisplay', () => {
  it('should format seconds correctly', () => {
    expect(formatDurationForDisplay(30)).toBe('30 sec');
    expect(formatDurationForDisplay(45)).toBe('45 sec');
    expect(formatDurationForDisplay(59)).toBe('59 sec');
  });

  it('should format minutes correctly', () => {
    expect(formatDurationForDisplay(60)).toBe('1 min');
    expect(formatDurationForDisplay(120)).toBe('2 min');
    expect(formatDurationForDisplay(90)).toBe('2 min'); // Rounds 1.5 to 2
    expect(formatDurationForDisplay(150)).toBe('3 min'); // Rounds 2.5 to 3
  });

  it('should format hours correctly', () => {
    expect(formatDurationForDisplay(3600)).toBe('1 hr');
    expect(formatDurationForDisplay(5400)).toBe('2 hr'); // Rounds 1.5 to 2
    expect(formatDurationForDisplay(7200)).toBe('2 hr');
  });

  it('should handle edge cases', () => {
    expect(formatDurationForDisplay(0)).toBe('0 sec');
    expect(formatDurationForDisplay(3599)).toBe('1 hr'); // Shows as 1 hr since it's very close
    expect(formatDurationForDisplay(3601)).toBe('1 hr'); // Just over an hour
  });
});
