import {
  formatSignedUsd,
  formatUsd,
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

  it('drops referral history rows when asked', () => {
    expect(
      getEarningsHistory(true).some((item) => item.kind === 'referrals'),
    ).toBe(false);
  });
});
