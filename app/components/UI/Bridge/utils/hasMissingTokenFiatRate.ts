import type { BridgeToken } from '../types';

/**
 * Tells whether a token's fiat rate is unusable for pricing.
 *
 * A missing, zero, or non-finite rate is not a real price: it renders as a
 * `$0.00` fiat value rather than the token's worth, so the user has to be
 * warned instead of shown that figure.
 */
export const hasMissingTokenFiatRate = (
  token: BridgeToken | undefined,
  fiatRate: number | undefined,
) => {
  if (!token) {
    return false;
  }

  if (fiatRate === undefined || !Number.isFinite(fiatRate)) {
    return true;
  }

  return fiatRate <= 0;
};
