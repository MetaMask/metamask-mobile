import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import type { BridgeToken } from '../../types';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';
import { useFiatToUsdRate } from '../useFiatToUsdRate';
import { getLimitOrderMinAmountUsd } from '../../utils/limitOrders/getLimitOrderMinAmountUsd';

const USD_CENT_DECIMALS = 2;

interface UseLimitOrderMinAmountParams {
  sourceToken?: BridgeToken;
  sourceAmount?: string;
}

interface UseLimitOrderMinAmountResult {
  /**
   * USD value the source amount has to reach on the source token's chain, or
   * `undefined` when no minimum is configured for it.
   */
  minAmountUsd: number | undefined;
  /**
   * Whether the source amount is worth less than {@link minAmountUsd}.
   */
  isBelowMinAmount: boolean;
}

/**
 * Checks the limit order source amount against the minimum USD value
 * configured for its chain.
 *
 * The amount is valued at the live market rate, which is what the API checks
 * the minimum against when the order is created.
 *
 * Without a USD price for the source token the amount cannot be checked, so it
 * is not reported as below the minimum; the missing price banner blocks the
 * order in that case instead.
 */
export const useLimitOrderMinAmount = ({
  sourceToken,
  sourceAmount,
}: UseLimitOrderMinAmountParams): UseLimitOrderMinAmountResult => {
  const sourceTokenFiatRate = useLiveTokenFiatRate(sourceToken);
  const fiatToUsdRate = useFiatToUsdRate(sourceToken?.chainId);
  const minAmountUsd = getLimitOrderMinAmountUsd(sourceToken?.chainId);

  const isBelowMinAmount = useMemo(() => {
    if (
      minAmountUsd === undefined ||
      sourceTokenFiatRate === undefined ||
      fiatToUsdRate === undefined
    ) {
      return false;
    }

    // Fiat input is converted to a token amount rounded down to the token's
    // decimals, so entering exactly the minimum lands a fraction of a cent
    // below it. Comparing whole cents keeps that amount at the minimum.
    const sourceAmountUsd = new BigNumber(sourceAmount || 0)
      .times(sourceTokenFiatRate)
      .times(fiatToUsdRate)
      .decimalPlaces(USD_CENT_DECIMALS, BigNumber.ROUND_HALF_UP);

    return sourceAmountUsd.isFinite() && sourceAmountUsd.lt(minAmountUsd);
  }, [fiatToUsdRate, minAmountUsd, sourceAmount, sourceTokenFiatRate]);

  return { minAmountUsd, isBelowMinAmount };
};
