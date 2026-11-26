import {
  getIncrementalMarginInsufficientBalanceError,
  getOpenOrderMarginBalance,
} from './openOrderMarginValidation';

describe('openOrderMarginValidation', () => {
  it('returns insufficient balance only when an edit increases required margin', () => {
    expect(
      getIncrementalMarginInsufficientBalanceError({
        editedNotionalUsd: 200,
        currentNotionalUsd: 100,
        spendableBalance: 1,
        leverage: 10,
      }),
    ).toMatch(/Insufficient balance/);

    expect(
      getIncrementalMarginInsufficientBalanceError({
        editedNotionalUsd: 50,
        currentNotionalUsd: 100,
        spendableBalance: 0,
        leverage: 10,
      }),
    ).toBe('');

    expect(
      getIncrementalMarginInsufficientBalanceError({
        editedNotionalUsd: 200,
        currentNotionalUsd: 100,
        spendableBalance: 0,
        leverage: 10,
        reduceOnly: true,
      }),
    ).toBe('');
  });

  describe('getOpenOrderMarginBalance', () => {
    it('uses the venue figure when it is known', () => {
      expect(
        getOpenOrderMarginBalance({
          venueAvailableToTrade: 250,
          isAvailableToTradeStreamFailed: true,
          accountSpendableBalance: '1000',
        }),
      ).toBe(250);
    });

    it('stays undefined while the stream has not reported', () => {
      expect(
        getOpenOrderMarginBalance({
          venueAvailableToTrade: undefined,
          isAvailableToTradeStreamFailed: false,
          accountSpendableBalance: '1000',
        }),
      ).toBeUndefined();
    });

    it('falls back to the account spendable balance once the stream failed', () => {
      expect(
        getOpenOrderMarginBalance({
          venueAvailableToTrade: undefined,
          isAvailableToTradeStreamFailed: true,
          accountSpendableBalance: '1000',
        }),
      ).toBe(1000);
    });

    it.each([null, undefined, 'not-a-number'])(
      'stays undefined when the stream failed and the account balance is %p',
      (accountSpendableBalance) => {
        expect(
          getOpenOrderMarginBalance({
            venueAvailableToTrade: undefined,
            isAvailableToTradeStreamFailed: true,
            accountSpendableBalance,
          }),
        ).toBeUndefined();
      },
    );
  });
});
