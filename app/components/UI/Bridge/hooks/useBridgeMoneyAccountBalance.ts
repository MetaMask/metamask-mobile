import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';
import { moneyFormatFiat } from '../../Money/utils/moneyFormatFiat';
import { getUsdToFiatConversionRate } from '../../Money/utils/moneyActivityFiat';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';

const USD_CURRENCY = 'usd';

const convertUsdAmount = (
  usdAmount: BigNumber | undefined,
  {
    currency,
    usdToFiatRate,
  }: { currency: string; usdToFiatRate: number | undefined },
) => {
  if (!usdAmount) {
    return undefined;
  }

  if (currency.toLowerCase() === USD_CURRENCY) {
    return usdAmount;
  }

  if (usdToFiatRate === undefined) {
    return undefined;
  }

  return usdAmount.multipliedBy(usdToFiatRate);
};

/**
 * Hook for fetching the money account balance and converting it to the user's selected currency.
 * @returns The money account balance info.
 */
export const useBridgeMoneyAccountBalance = () => {
  const { tokenTotal, withdrawableMusd } = useMoneyAccountBalance();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const usdToFiatRate = getUsdToFiatConversionRate(
    useSelector(selectCurrencyRates),
  );

  return useMemo(() => {
    const totalFiat = convertUsdAmount(tokenTotal, {
      currency: currentCurrency,
      usdToFiatRate,
    });
    const withdrawableFiat = convertUsdAmount(withdrawableMusd, {
      currency: currentCurrency,
      usdToFiatRate,
    });

    return {
      currency: currentCurrency,
      tokenTotal,
      withdrawableMusd,
      totalFiat,
      withdrawableFiat,
      totalFiatFormatted: totalFiat
        ? moneyFormatFiat(totalFiat, currentCurrency)
        : undefined,
      withdrawableFiatFormatted: withdrawableFiat
        ? moneyFormatFiat(withdrawableFiat, currentCurrency)
        : undefined,
    };
  }, [currentCurrency, tokenTotal, usdToFiatRate, withdrawableMusd]);
};
