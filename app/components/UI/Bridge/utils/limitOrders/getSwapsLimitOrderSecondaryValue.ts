import { formatAmountWithLocaleSeparators } from '../formatAmountWithLocaleSeparators';
import {
  formatFiatInputAmount,
  formatSecondaryTokenAmount,
  formatTokenInputAmountFromFiat,
} from '../sourceAmountInputMode';
import { formatCurrency } from '../currencyUtils';

/**
 * Secondary-row label for the limit price: Build the ≈ 0.0561 ETH row
 */
export const getSwapsLimitOrderSecondaryValue = ({
  counterFiatRate,
  counterTokenDecimals,
  counterTokenSymbol,
  currentCurrency,
  isLimitFiatMode,
  limitPrice,
}: {
  counterFiatRate: number | undefined;
  counterTokenDecimals: number | undefined;
  counterTokenSymbol: string | undefined;
  currentCurrency: string | undefined;
  isLimitFiatMode: boolean;
  limitPrice: string | undefined;
}): string | undefined => {
  if (!counterTokenSymbol) {
    return undefined;
  }

  const currency = currentCurrency || 'usd';

  if (isLimitFiatMode) {
    const counterFromFiat = formatTokenInputAmountFromFiat({
      fiatAmount: limitPrice,
      tokenFiatRate: counterFiatRate,
      tokenDecimals: counterTokenDecimals,
    });

    if (counterFromFiat && Number(counterFromFiat) > 0) {
      const formattedCounterAmount =
        formatSecondaryTokenAmount(counterFromFiat);

      return `${formatAmountWithLocaleSeparators(
        formattedCounterAmount ?? counterFromFiat,
      )} ${counterTokenSymbol}`;
    }

    return `0 ${counterTokenSymbol}`;
  }

  const fiatFromCounter = formatFiatInputAmount(limitPrice, counterFiatRate);
  if (fiatFromCounter && Number(fiatFromCounter) > 0) {
    return formatCurrency(fiatFromCounter, currency);
  }

  return formatCurrency(0, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
