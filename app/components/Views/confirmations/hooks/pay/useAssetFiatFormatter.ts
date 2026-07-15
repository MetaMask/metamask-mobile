import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';

import I18n from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { useTransactionPayCurrency } from './useTransactionPayCurrency';

export type AssetFiatFormatter = (
  preferredBalance: BigNumber.Value | undefined,
  chainId: string | undefined,
) => string | undefined;

/**
 * Returns a formatter that converts a preferred-currency fiat balance into a
 * localized currency string, honoring the pay-flow currency override.
 *
 * `asset.fiat.balance` from `@metamask/assets-controllers` is denominated in
 * the user's preferred currency. When the active confirmation forces a
 * different pay currency (currently only USD), the numeric value must be
 * re-scaled by `(native→pay) / (native→preferred)` — not just relabeled.
 *
 * Returns `undefined` when the value cannot be safely rendered in the target
 * currency (missing conversion rate, missing chain config). Callers should
 * treat `undefined` as "hide fiat", matching the existing testnet-hidden
 * fallback in `useAccountTokens`.
 */
export function useAssetFiatFormatter(): {
  format: AssetFiatFormatter;
  fiatCurrency: string;
} {
  const preferredCurrency = useSelector(selectCurrentCurrency);
  const payCurrency = useTransactionPayCurrency();
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const fiatCurrency = payCurrency ?? preferredCurrency;

  const needsConversion =
    payCurrency === 'USD' &&
    preferredCurrency?.toLowerCase() !== payCurrency.toLowerCase();

  const format = useCallback<AssetFiatFormatter>(
    (preferredBalance, chainId) => {
      const preferredAmount = new BigNumber(preferredBalance ?? 0);

      let payAmount: BigNumber | undefined = preferredAmount;
      // Zero is currency-invariant, so we skip the rate lookup even when a
      // pay-currency conversion would otherwise be required. Keeps the
      // enrichment "$0" placeholder working when rates or chain config are
      // missing.
      if (needsConversion && !preferredAmount.isZero()) {
        const nativeCurrency =
          networkConfigurationsByChainId?.[chainId as Hex]?.nativeCurrency;
        const rateEntry = nativeCurrency
          ? currencyRates?.[nativeCurrency]
          : undefined;
        const preferredRate = rateEntry?.conversionRate;
        const usdRate = rateEntry?.usdConversionRate;

        payAmount =
          preferredRate && usdRate
            ? preferredAmount.multipliedBy(usdRate).dividedBy(preferredRate)
            : undefined;
      }

      if (payAmount === undefined) {
        return undefined;
      }

      const hasDecimals = !payAmount.isInteger();

      try {
        return getIntlNumberFormatter(I18n.locale, {
          style: 'currency',
          currency: fiatCurrency,
          minimumFractionDigits: hasDecimals ? 2 : 0,
        }).format(payAmount.toFixed() as unknown as number);
      } catch (error) {
        Logger.error(error as Error);
        return `${payAmount.toFixed()} ${fiatCurrency}`;
      }
    },
    [
      needsConversion,
      networkConfigurationsByChainId,
      currencyRates,
      fiatCurrency,
    ],
  );

  return { format, fiatCurrency };
}
