import { useSelector } from 'react-redux';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { calcUsdAmountFromFiat } from '../../utils/exchange-rates';

const USD_CURRENCY = 'usd';

/**
 * Rate converting a value in the user's display currency to USD, i.e. `1` when
 * the display currency is already USD.
 *
 * Unlike {@link useTokenUsdRate} this prices a plain fiat amount rather than a
 * token, which is what the parts of the app that have to send USD to an API
 * need when the user is looking at another currency.
 *
 * @param chainId - Chain whose native currency rates are read. The ratio is the
 * same whichever chain it comes from, so this only picks the most likely entry
 * to be populated; any other entry carrying both rates is used as a fallback.
 * @returns The USD value of one unit of the display currency, or `undefined`
 * when no currency rate can price it.
 */
export const useFiatToUsdRate = (chainId?: string): number | undefined => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  // Already USD, so no rate has to be available for the conversion to be exact.
  if (currentCurrency?.toLowerCase() === USD_CURRENCY) {
    return 1;
  }

  return calcUsdAmountFromFiat({
    tokenFiatValue: 1,
    chainId,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
  });
};
