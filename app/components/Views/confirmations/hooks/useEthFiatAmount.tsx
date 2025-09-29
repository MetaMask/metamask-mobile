import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { decEthToConvertedCurrency } from '../../../../util/conversions';
import { formatCurrency } from '../../../../util/confirm-tx';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { RootState } from '../../../../reducers';

interface UseEthFiatAmountOverrides {
  showFiat?: boolean;
}

/**
 * Get an Eth amount converted to fiat and formatted for display
 *
 * @param {string | BigNumber | undefined} ethAmount - The eth amount to convert
 * @param {UseEthFiatAmountOverrides} [overrides] - A configuration object that allows the caller to explicitly
 * ensure fiat is shown even if the property is not set in state.
 * @param {boolean} [hideCurrencySymbol] - Indicates whether the returned formatted amount should include the trailing currency symbol
 * @returns {string | undefined} The formatted token amount in the user's chosen fiat currency
 */
export function useEthFiatAmount(
  ethAmount?: string | BigNumber,
  overrides: UseEthFiatAmountOverrides = {},
  hideCurrencySymbol?: boolean,
  chainId?: string,
): string | undefined {
  const conversionRate =
    useSelector((state: RootState) =>
      selectConversionRateByChainId(state, chainId),
    ) ?? 0;
  const currentCurrency = useSelector(selectCurrentCurrency);

  const showFiat = overrides.showFiat;

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
