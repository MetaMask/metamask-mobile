import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';

import I18n from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useTransactionPayCurrency } from './useTransactionPayCurrency';

export type AssetFiatFormatter = (
  amount: BigNumber.Value | undefined,
) => string | undefined;

/**
 * Returns a currency formatter whose target currency follows the pay-flow
 * override: USD inside `PAY_TRANSACTION_TYPES` confirmations, otherwise the
 * user's preferred currency.
 *
 * This hook only formats — it does not derive rates or convert values.
 * Callers must pass an `amount` already denominated in `fiatCurrency`. Rate
 * derivation should go through `useTokenFiatRates`, which owns the
 * stablecoin exception and the USD/preferred-currency rate selection.
 *
 * Returns `undefined` when the input amount is `undefined`, so callers can
 * pass through a missing rate as "hide fiat".
 */
export function useAssetFiatFormatter(): {
  format: AssetFiatFormatter;
  fiatCurrency: string;
} {
  const preferredCurrency = useSelector(selectCurrentCurrency);
  const payCurrency = useTransactionPayCurrency();
  const fiatCurrency = payCurrency ?? preferredCurrency;

  const format = useCallback<AssetFiatFormatter>(
    (amount) => {
      if (amount === undefined) {
        return undefined;
      }

      const value = new BigNumber(amount);
      const hasDecimals = !value.isInteger();

      try {
        return getIntlNumberFormatter(I18n.locale, {
          style: 'currency',
          currency: fiatCurrency,
          minimumFractionDigits: hasDecimals ? 2 : 0,
        }).format(value.toFixed() as unknown as number);
      } catch (error) {
        Logger.error(error as Error);
        return `${value.toFixed()} ${fiatCurrency}`;
      }
    },
    [fiatCurrency],
  );

  return { format, fiatCurrency };
}
