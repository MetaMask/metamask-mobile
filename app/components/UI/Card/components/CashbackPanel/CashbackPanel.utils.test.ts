import {
  CASHBACK_PAYOUT_INCREMENT,
  formatClaimAmount,
  getCashbackPayoutBreakdown,
} from './CashbackPanel.utils';

describe('getCashbackPayoutBreakdown', () => {
  it('pays whole $5 steps and carries the rest over', () => {
    expect(getCashbackPayoutBreakdown('12.30')).toEqual({
      available: 12.3,
      claimable: 10,
      remainder: 2.3,
      progress: 0.46,
    });
  });

  it('has nothing to claim below the first increment', () => {
    expect(getCashbackPayoutBreakdown('4.99')).toMatchObject({
      claimable: 0,
      remainder: 4.99,
    });
  });

  it('claims everything on an exact multiple', () => {
    expect(getCashbackPayoutBreakdown(15)).toMatchObject({
      claimable: 15,
      remainder: 0,
      progress: 0,
    });
  });

  it.each([undefined, '', 'abc', '-3'])(
    'treats %p as an empty balance',
    (balance) => {
      expect(getCashbackPayoutBreakdown(balance)).toEqual({
        available: 0,
        claimable: 0,
        remainder: 0,
        progress: 0,
      });
    },
  );

  it('uses $5 as the default increment', () => {
    expect(CASHBACK_PAYOUT_INCREMENT).toBe(5);
  });
});

describe('formatClaimAmount', () => {
  it('formats with two decimals', () => {
    expect(formatClaimAmount(10)).toBe('10.00');
  });

  it('rounds down so the claim never exceeds the balance', () => {
    expect(formatClaimAmount(10.009)).toBe('10.00');
  });
});
