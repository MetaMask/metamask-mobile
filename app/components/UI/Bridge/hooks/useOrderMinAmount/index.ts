import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import type { BridgeToken } from '../../types';
import { useFiatToUsdRate } from '../useFiatToUsdRate';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';

const USD_CENT_DECIMALS = 2;

interface UseOrderMinAmountParams {
  minAmountUsd: number | undefined;
  sourceAmount?: string;
  sourceToken?: BridgeToken;
}

export interface UseOrderMinAmountResult {
  minAmountUsd: number | undefined;
  isBelowMinAmount: boolean;
}

/**
 * Values an order's source amount in USD and compares it with the supplied
 * minimum.
 */
export function useOrderMinAmount({
  minAmountUsd,
  sourceAmount,
  sourceToken,
}: UseOrderMinAmountParams): UseOrderMinAmountResult {
  const sourceTokenFiatRate = useLiveTokenFiatRate(sourceToken);
  const fiatToUsdRate = useFiatToUsdRate(sourceToken?.chainId);

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
}
