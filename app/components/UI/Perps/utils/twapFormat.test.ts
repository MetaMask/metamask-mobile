import { formatTwapDuration, formatTwapProgressPercent } from './twapFormat';

describe('formatTwapDuration', () => {
  it('omits zero-valued units', () => {
    // Arrange / Act
    const result = formatTwapDuration(60);

    // Assert
    expect(result).toBe('1 hour');
  });

  it('combines hours and minutes', () => {
    // Arrange / Act
    const result = formatTwapDuration(90);

    // Assert
    expect(result).toBe('1 hour 30 minutes');
  });

  it('renders days for durations beyond 24 hours', () => {
    // Arrange / Act
    const result = formatTwapDuration(1500);

    // Assert
    expect(result).toBe('1 day 1 hour');
  });

  it('floors a fractional duration', () => {
    // Arrange / Act
    const result = formatTwapDuration(30.9);

    // Assert
    expect(result).toBe('30 minutes');
  });

  it('renders zero minutes rather than an empty string', () => {
    // Arrange / Act
    const result = formatTwapDuration(0);

    // Assert: a bare '' would render as " / 30 minutes" in an elapsed/total pair
    expect(result).toBe('0 minutes');
  });

  it('treats a negative duration as zero', () => {
    // Arrange / Act
    const result = formatTwapDuration(-10);

    // Assert
    expect(result).toBe('0 minutes');
  });
});

describe('formatTwapProgressPercent', () => {
  it('converts basis points to whole percent', () => {
    // Arrange / Act
    const result = formatTwapProgressPercent(2500);

    // Assert
    expect(result).toBe('25%');
  });

  it('clamps above the full range', () => {
    // Arrange / Act
    const result = formatTwapProgressPercent(12000);

    // Assert
    expect(result).toBe('100%');
  });

  it('clamps a negative value to zero', () => {
    // Arrange / Act
    const result = formatTwapProgressPercent(-500);

    // Assert
    expect(result).toBe('0%');
  });
});
