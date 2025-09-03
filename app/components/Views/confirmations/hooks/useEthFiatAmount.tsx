import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { decEthToConvertedCurrency } from '../../../../util/conversions';
import { formatCurrency } from '../../../../util/confirm-tx';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';

interface UseEthFiatAmountOverrides {
  showFiat?: boolean;
}

type UseEthFiatAmountReturn = string | undefined;

/**
 * Get an Eth amount converted to fiat and formatted for display
 *
 * @param {string | BigNumber | undefined} ethAmount - The eth amount to convert
 * @param {UseEthFiatAmountOverrides} [overrides] - A configuration object that allows the caller to explicitly
 * ensure fiat is shown even if the property is not set in state.
 * @param {boolean} [hideCurrencySymbol] - Indicates whether the returned formatted amount should include the trailing currency symbol
 * @returns {UseEthFiatAmountReturn} The formatted token amount in the user's chosen fiat currency
 */
export function useEthFiatAmount(
  ethAmount?: string | BigNumber,
  overrides: UseEthFiatAmountOverrides = {},
  hideCurrencySymbol?: boolean,
): UseEthFiatAmountReturn {
  const currentRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const showFiat = overrides.showFiat;
  const conversionRate = currentRates?.ETH?.conversionRate;

  const formattedFiat = useMemo(
    () => decEthToConvertedCurrency(ethAmount, currentCurrency, conversionRate),
    [conversionRate, currentCurrency, ethAmount],
  );

  if (
    !conversionRate ||
    !showFiat ||
    currentCurrency.toUpperCase() === 'ETH' ||
    conversionRate <= 0 ||
    ethAmount === undefined
  ) {
    return undefined;
  }

  // Calculate the fiat amount
  const fiatAmount = new BigNumber(ethAmount.toString()).times(conversionRate);

  // Handle small fiat amounts
  if (
    ethAmount &&
    fiatAmount.lt(new BigNumber(0.01)) &&
    fiatAmount.isGreaterThan(new BigNumber(0))
  ) {
    return hideCurrencySymbol
      ? `< ${formatCurrency(0.01, currentCurrency)}`
      : `< ${formatCurrency(
          0.01,
          currentCurrency,
        )} ${currentCurrency.toUpperCase()}`;
  }

  // Return the formatted fiat amount
  return hideCurrencySymbol
    ? formatCurrency(formattedFiat, currentCurrency)
    : `${formatCurrency(
        formattedFiat,
        currentCurrency,
      )} ${currentCurrency.toUpperCase()}`;
}
