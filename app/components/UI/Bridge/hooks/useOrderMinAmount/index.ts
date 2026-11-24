import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import type { BridgeToken } from '../../types';
import { formatCurrency } from '../../utils/currencyUtils';
import { useFiatToUsdRate } from '../useFiatToUsdRate';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';

const FIAT_DECIMALS = 2;
const USD_CURRENCY = 'USD';

interface UseOrderMinAmountParams {
  minAmountUsd: number | undefined;
  sourceAmount?: string;
  sourceToken?: BridgeToken;
}

export interface UseOrderMinAmountResult {
  minAmountUsd: number | undefined;
  formattedMinAmountInSelectedCurrency: string | undefined;
  hasError: boolean;
  isBelowMinAmount: boolean;
}

function isValidRate(rate: number | undefined): rate is number {
  return rate !== undefined && Number.isFinite(rate) && rate > 0;
}

function formatMinAmount(amount: BigNumber.Value, currency: string): string {
  const roundedAmount = new BigNumber(amount).decimalPlaces(
    FIAT_DECIMALS,
    BigNumber.ROUND_HALF_UP,
  );

  return formatCurrency(roundedAmount.toNumber(), currency, {
    minimumFractionDigits: roundedAmount.isInteger() ? 0 : FIAT_DECIMALS,
    maximumFractionDigits: FIAT_DECIMALS,
  });
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
  const currentCurrency =
    useSelector(selectCurrentCurrency)?.toUpperCase() ?? USD_CURRENCY;
  const hasError =
    minAmountUsd !== undefined &&
    (!isValidRate(sourceTokenFiatRate) || !isValidRate(fiatToUsdRate));

  const formattedMinAmountInSelectedCurrency = useMemo(() => {
    if (minAmountUsd === undefined || !isValidRate(fiatToUsdRate)) {
      return undefined;
    }

    if (currentCurrency === USD_CURRENCY) {
      return formatMinAmount(minAmountUsd, USD_CURRENCY);
    }

    const minAmountInCurrentCurrency = new BigNumber(minAmountUsd).dividedBy(
      fiatToUsdRate,
    );

    return minAmountInCurrentCurrency.isFinite()
      ? formatMinAmount(minAmountInCurrentCurrency, currentCurrency)
      : undefined;
  }, [currentCurrency, fiatToUsdRate, minAmountUsd]);

  const isBelowMinAmount = useMemo(() => {
    if (
      minAmountUsd === undefined ||
      !isValidRate(sourceTokenFiatRate) ||
      !isValidRate(fiatToUsdRate)
    ) {
      return false;
    }

    // Fiat input is converted to a token amount rounded down to the token's
    // decimals, so entering exactly the minimum lands a fraction of a cent
    // below it. Comparing whole cents keeps that amount at the minimum.
    const sourceAmountUsd = new BigNumber(sourceAmount || 0)
      .times(sourceTokenFiatRate)
      .times(fiatToUsdRate)
      .decimalPlaces(FIAT_DECIMALS, BigNumber.ROUND_HALF_UP);

    return sourceAmountUsd.isFinite() && sourceAmountUsd.lt(minAmountUsd);
  }, [fiatToUsdRate, minAmountUsd, sourceAmount, sourceTokenFiatRate]);

  return {
    minAmountUsd,
    formattedMinAmountInSelectedCurrency,
    hasError,
    isBelowMinAmount,
  };
}
