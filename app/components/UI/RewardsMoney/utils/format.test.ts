import { daysUntil, formatMusd, formatRateBps } from './format';

describe('formatMusd', () => {
  it('renders whole mUSD with two decimals', () => {
    const result = formatMusd('12000000');

    expect(result).toBe('12.00');
  });

  it('renders a fractional amount at the requested precision', () => {
    const result = formatMusd('1250000');

    expect(result).toBe('1.25');
  });

  it('renders zero for a null amount', () => {
    const result = formatMusd(null);

    expect(result).toBe('0.00');
  });

  it('renders zero for a malformed amount rather than throwing', () => {
    const result = formatMusd('not-a-number');

    expect(result).toBe('0.00');
  });

  it('prefixes a negative amount with a minus sign', () => {
    const result = formatMusd('-2500000');

    expect(result).toBe('-2.50');
  });

  it('renders an amount above Number.MAX_SAFE_INTEGER without dropping the whole part', () => {
    const result = formatMusd('12345678901234500000');

    expect(result).toBe('12,345,678,901,234.50');
  });

  it('renders no decimals when asked for zero fraction digits', () => {
    const result = formatMusd('12500000', 0);

    expect(result).toBe('13');
  });
});

describe('formatRateBps', () => {
  it('renders 2500 basis points as 25%', () => {
    const result = formatRateBps(2500);

    expect(result).toBe('25%');
  });

  it('renders 50 basis points as 0.5%', () => {
    const result = formatRateBps(50);

    expect(result).toBe('0.5%');
  });

  it('returns null for an unconfigured program', () => {
    const result = formatRateBps(null);

    expect(result).toBeNull();
  });

  it('renders a zero rate as 0% rather than omitting it', () => {
    const result = formatRateBps(0);

    expect(result).toBe('0%');
  });
});

describe('daysUntil', () => {
  const now = Date.parse('2026-09-02T00:00:00.000Z');

  it('counts whole days remaining until the window closes', () => {
    const result = daysUntil('2026-09-12T00:00:00.000Z', now);

    expect(result).toBe(10);
  });

  it('returns zero once the window has closed', () => {
    const result = daysUntil('2026-08-01T00:00:00.000Z', now);

    expect(result).toBe(0);
  });

  it('returns null when there is no end date', () => {
    const result = daysUntil(null, now);

    expect(result).toBeNull();
  });

  it('returns null for an unparseable date', () => {
    const result = daysUntil('not-a-date', now);

    expect(result).toBeNull();
  });
});
