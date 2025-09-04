import {
  toHumanDuration,
  toHumanEstimatedTimeRange,
  toHumanSeconds,
} from './time';

describe('toHumanEstimatedTimeRange', () => {
  it('return undefined for invalid inputs', () => {
    expect(toHumanEstimatedTimeRange(0, 0)).toBeUndefined();
    expect(toHumanEstimatedTimeRange(0, 10000)).toBeUndefined();
    expect(toHumanEstimatedTimeRange(10000, 0)).toBeUndefined();
  });

  it('format times in minutes when max is 60 seconds or more', () => {
    // 1 - 1.5 min
    expect(toHumanEstimatedTimeRange(60000, 90000)).toBe('1 - 1.5 min');

    // 0.5 - 1.5 min
    expect(toHumanEstimatedTimeRange(30000, 90000)).toBe('0.5 - 1.5 min');
  });

  it('format times in seconds when max is less than 60 seconds', () => {
    // 10 - 20 sec
    expect(toHumanEstimatedTimeRange(10000, 20000)).toBe('10 - 20 sec');

    // 5 - 30 sec
    expect(toHumanEstimatedTimeRange(5000, 30000)).toBe('5 - 30 sec');
  });

  it('handle edge cases around 60 seconds', () => {
    // Just under a minute should use seconds
    expect(toHumanEstimatedTimeRange(55000, 59000)).toBe('55 - 59 sec');

    // Just over a minute should use minutes
    expect(toHumanEstimatedTimeRange(59000, 61000)).toBe('1 - 1 min');
  });
});

describe('toHumanSeconds', () => {
  it('converts milliseconds to seconds with no decimal places', () => {
    expect(toHumanSeconds(1000)).toBe('1 sec');
    expect(toHumanSeconds(5000)).toBe('5 sec');
    expect(toHumanSeconds(10000)).toBe('10 sec');
    expect(toHumanSeconds(30000)).toBe('30 sec');
  });

  it('handles fractional seconds by truncating decimals', () => {
    expect(toHumanSeconds(1500)).toBe('1 sec');
    expect(toHumanSeconds(2750)).toBe('2 sec');
    expect(toHumanSeconds(9900)).toBe('9 sec');
  });

  it('handles edge cases', () => {
    expect(toHumanSeconds(0)).toBe('0 sec');
    expect(toHumanSeconds(100)).toBe('0 sec');
    expect(toHumanSeconds(999)).toBe('0 sec');
  });

  it('handles large values', () => {
    expect(toHumanSeconds(60000)).toBe('60 sec');
    expect(toHumanSeconds(120000)).toBe('120 sec');
    expect(toHumanSeconds(3600000)).toBe('3600 sec');
  });
});

describe('toHumanDuration', () => {
  it('should format seconds correctly', () => {
    expect(toHumanDuration(30)).toBe('30 sec');
    expect(toHumanDuration(45)).toBe('45 sec');
    expect(toHumanDuration(59)).toBe('59 sec');
  });

  it('should format minutes correctly', () => {
    expect(toHumanDuration(60)).toBe('1 min');
    expect(toHumanDuration(120)).toBe('2 min');
    expect(toHumanDuration(90)).toBe('1.5 min');
    expect(toHumanDuration(150)).toBe('2.5 min');
  });

  it('should format hours correctly', () => {
    expect(toHumanDuration(3600)).toBe('1 hr');
    expect(toHumanDuration(5400)).toBe('1.5 hr');
    expect(toHumanDuration(7200)).toBe('2 hr');
  });

  it('should handle edge cases', () => {
    expect(toHumanDuration(0)).toBe('0 sec');
    expect(toHumanDuration(3599)).toBe('60 min'); // Just under an hour
    expect(toHumanDuration(3601)).toBe('1 hr'); // Just over an hour
  });
});
