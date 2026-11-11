import { formatCombinedSinceInceptionInterest } from './formatCombinedSinceInceptionInterest';

const premium = (usd: string | undefined, failed = false) => ({
  usd,
  failed,
});

const base = (usd: string | undefined, failed = false) => ({
  usd,
  failed,
});

describe('formatCombinedSinceInceptionInterest', () => {
  it('adds premium and base since-inception interest', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium('12.5'),
      base: base('2.5'),
    });

    expect(result).toBe('+$15.00');
  });

  it('counts a missing amount that did not fail as zero', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium('12.5'),
      base: base(undefined),
    });

    expect(result).toBe('+$12.50');
  });

  it('returns $0.00 when both amounts are missing and neither query failed', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium(undefined),
      base: base(undefined),
    });

    expect(result).toBe('$0.00');
  });

  it('returns an em dash when premium interest failed with no amount', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium(undefined, true),
      base: base('2.5'),
    });

    expect(result).toBe('—');
  });

  it('returns an em dash when base interest failed with no amount', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium('12.5'),
      base: base(undefined, true),
    });

    expect(result).toBe('—');
  });

  it('uses a finite amount from a query that also failed', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium('12.5', true),
      base: base('2.5'),
    });

    expect(result).toBe('+$15.00');
  });

  it('counts a non-finite amount that did not fail as zero', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium('not-a-number'),
      base: base('2.5'),
    });

    expect(result).toBe('+$2.50');
  });

  it('returns an em dash when a failed query has a non-finite amount', () => {
    const result = formatCombinedSinceInceptionInterest({
      premium: premium('12.5'),
      base: base('not-a-number', true),
    });

    expect(result).toBe('—');
  });
});
