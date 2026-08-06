import { getIncrementalMarginInsufficientBalanceError } from './openOrderMarginValidation';

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
});
