import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import type { BridgeToken } from '../../types';
import { useTokenUsdRate } from '../useTokenFiatRate';
import { getLimitOrderMinAmountUsd } from '../../utils/limitOrders/getLimitOrderMinAmountUsd';

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
 * Without a USD price for the source token the amount cannot be checked, so it
 * is not reported as below the minimum; the missing price banner blocks the
 * order in that case instead.
 */
export const useLimitOrderMinAmount = ({
  sourceToken,
  sourceAmount,
}: UseLimitOrderMinAmountParams): UseLimitOrderMinAmountResult => {
  const sourceTokenUsdRate = useTokenUsdRate(sourceToken);
  const minAmountUsd = getLimitOrderMinAmountUsd(sourceToken?.chainId);

  const isBelowMinAmount = useMemo(() => {
    if (minAmountUsd === undefined || sourceTokenUsdRate === undefined) {
      return false;
    }

    const sourceAmountUsd = new BigNumber(sourceAmount || 0).times(
      sourceTokenUsdRate,
    );

    return sourceAmountUsd.isFinite() && sourceAmountUsd.lt(minAmountUsd);
  }, [minAmountUsd, sourceAmount, sourceTokenUsdRate]);

  return { minAmountUsd, isBelowMinAmount };
};
