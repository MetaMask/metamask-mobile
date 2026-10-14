import {
  formatSignedUsd,
  formatUsd,
  getClaimEarningsBreakdownRows,
  getEarningsHistory,
} from './rewardsUiFixtures';

describe('rewardsUiFixtures', () => {
  it('formats a dollar amount with two decimals', () => {
    expect(formatUsd(41.75)).toBe('$41.75');
  });

  it('pads a single-decimal amount to two decimals', () => {
    expect(formatUsd(91.2)).toBe('$91.20');
  });

  it('groups thousands', () => {
    expect(formatUsd(12345.6)).toBe('$12,345.60');
  });

  it('formats a signed dollar amount with a leading plus and two decimals', () => {
    expect(formatSignedUsd(18.2)).toBe('+$18.20');
  });

  it('formats a negative signed dollar amount with a leading minus', () => {
    expect(formatSignedUsd(-32.4)).toBe('-$32.40');
  });

  it('sums claim buckets to total earnings', () => {
    const rows = getClaimEarningsBreakdownRows();
    const total = rows.find((row) => row.id === 'total');
    const buckets = rows.filter((row) => row.id !== 'total');

    expect(total?.amount).toBe(
      buckets.reduce((sum, row) => sum + row.amount, 0),
    );
  });

  it('lists total earnings ahead of the claim buckets', () => {
    const rows = getClaimEarningsBreakdownRows();

    expect(rows.map((row) => row.id)).toEqual([
      'total',
      'available-to-claim',
      'held',
      'blocked',
      'voided',
      'pending',
      'claimed',
    ]);
  });

  it('drops referral history rows when asked', () => {
    expect(
      getEarningsHistory(true).some((item) => item.kind === 'referrals'),
    ).toBe(false);
  });
});
