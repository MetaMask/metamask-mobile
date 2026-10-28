import BigNumber from 'bignumber.js';

/**
 * Converts an Accounts API v6 `balance` into a readable decimal.
 *
 * Unit finding (do not invert this): `V6BalanceItem.balance` is a readable
 * decimal string, not a minimal unit. See `fixtures/v6BalanceFixture.ts`.
 * `decimals` is accepted so every caller shares this helper, and is unused
 * because the API value is already scaled.
 */
export const toReadableAmount = (
  balance: string,
  _decimals: number,
): BigNumber | undefined => {
  if (typeof balance !== 'string' || balance.trim() === '') {
    return undefined;
  }
  const readable = new BigNumber(balance);
  if (!readable.isFinite()) {
    return undefined;
  }
  return readable;
};

export const isPositiveReadableAmount = (amount: BigNumber): boolean =>
  amount.gt(0);
