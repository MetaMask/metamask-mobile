import {
  formatUsd,
  formatUsdcAmount,
  parseBaseUnits,
  parseInsuredValue,
  parseTimestamp,
  parseUsdcAmount,
} from './format';

describe('parseBaseUnits', () => {
  it.each([
    ['42000000', 42_000_000n],
    ['-1500000', -1_500_000n],
    ['4.2', 0n],
    [undefined, 0n],
  ])('parses %p as %p', (amount, expected) => {
    const result = parseBaseUnits(amount);

    expect(result).toBe(expected);
  });
});

describe('parseUsdcAmount', () => {
  it.each([
    [50, 50_000_000n],
    ['42.5', 42_500_000n],
    ['0.000001', 1n],
    ['1.1234567', 1_123_456n],
    ['1e-6', 1n],
    [9e-7, 0n],
    ['9007199254740993.000001', 9_007_199_254_740_993_000_001n],
  ])('converts %p to %p without rounding up', (amount, expected) => {
    const result = parseUsdcAmount(amount);

    expect(result).toBe(expected);
  });

  it.each([undefined, '-3', 'abc', '', Number.NaN, Number.POSITIVE_INFINITY])(
    'returns zero for %p',
    (amount) => {
      const result = parseUsdcAmount(amount);

      expect(result).toBe(0n);
    },
  );
});

describe('formatUsdcAmount', () => {
  it.each([
    ['42500000', '42.50'],
    ['50000000', '50.00'],
    ['1', '0.000001'],
    ['1234567', '1.234567'],
    ['0', '0.00'],
    ['280000000000', '280000.00'],
  ])('formats %s base units as %s', (baseUnits, expected) => {
    expect(formatUsdcAmount(baseUnits)).toBe(expected);
  });

  it('formats bigint base units', () => {
    expect(formatUsdcAmount(162000000n)).toBe('162.00');
  });

  it('formats negative amounts', () => {
    expect(formatUsdcAmount(-1500000n)).toBe('-1.50');
  });

  it('returns zero for malformed input', () => {
    expect(formatUsdcAmount('12.5')).toBe('0.00');
  });
});

describe('formatUsd', () => {
  it('formats whole values without cents', () => {
    expect(formatUsd(1234)).toBe('$1,234');
  });

  it('formats fractional values with cents', () => {
    expect(formatUsd(45.5)).toBe('$45.50');
  });
});

describe('parseInsuredValue', () => {
  it.each([
    ['37', 37],
    ['$45.00', 45],
    ['1,200', 1200],
    [37, 37],
    [0, 0],
  ])('parses %p as %p', (raw, expected) => {
    const result = parseInsuredValue(raw);

    expect(result).toBe(expected);
  });

  it.each([undefined, null, 'n/a', Number.NaN, -5, {}])(
    'returns undefined for %p',
    (raw) => {
      const result = parseInsuredValue(raw);

      expect(result).toBeUndefined();
    },
  );
});

describe('parseTimestamp', () => {
  it('reads ISO dates in milliseconds', () => {
    const timestamp = '2026-09-01T10:00:00.000Z';

    const result = parseTimestamp(timestamp);

    expect(result).toBe(Date.UTC(2026, 8, 1, 10));
  });

  it.each([undefined, null, 'not a date'])('rejects %p', (value) => {
    const result = parseTimestamp(value);

    expect(result).toBeUndefined();
  });
});
