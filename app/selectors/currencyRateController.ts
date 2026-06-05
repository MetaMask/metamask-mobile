import { createSelector, weakMapMemoize } from 'reselect';
import { CurrencyRateState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectEvmChainId,
  selectNativeCurrencyByChainId,
  selectEvmTicker,
  selectNetworkConfigurationByChainId,
} from './networkController';
import { isTestNet } from '../../app/util/networks';
import { Hex } from '@metamask/utils';
import {
  getCurrencyRateControllerCurrentCurrency,
  getCurrencyRateControllerCurrencyRates,
} from './assets/assets-migration';

export const selectConversionRate = createSelector(
  getCurrencyRateControllerCurrencyRates,
  selectEvmChainId,
  selectEvmTicker,
  (state: RootState) => state.settings.showFiatOnTestnets,
  (
    currencyRates: CurrencyRateState['currencyRates'],
    chainId: string,
    ticker: string,
    showFiatOnTestnets,
  ) => {
    if (chainId && isTestNet(chainId) && !showFiatOnTestnets) {
      return undefined;
    }
    return ticker ? currencyRates?.[ticker]?.conversionRate : undefined;
  },
);

export { getCurrencyRateControllerCurrencyRates as selectCurrencyRates };

export const selectCurrencyRateForChainId = createSelector(
  [
    getCurrencyRateControllerCurrencyRates,
    (_state: RootState, chainId: Hex) => chainId,
    (state: RootState, chainId: Hex) =>
      selectNetworkConfigurationByChainId(state, chainId),
  ],
  (currencyRates, _chainId, networkConfig): number =>
    (networkConfig?.nativeCurrency &&
      currencyRates?.[networkConfig.nativeCurrency]?.conversionRate) ||
    0,
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export { getCurrencyRateControllerCurrentCurrency as selectCurrentCurrency };

export const selectConversionRateBySymbol = createSelector(
  getCurrencyRateControllerCurrencyRates,
  (_: RootState, symbol: string) => symbol,
  (currencyRates: CurrencyRateState['currencyRates'], symbol: string) =>
    symbol ? currencyRates?.[symbol]?.conversionRate || 0 : 0,
);

export { getCurrencyRateControllerCurrencyRates as selectConversionRateFoAllChains };

export const selectConversionRateByChainId = createSelector(
  getCurrencyRateControllerCurrencyRates,
  (_state: RootState, chainId: string) => chainId,
  (state: RootState) => state.settings.showFiatOnTestnets,
  selectNativeCurrencyByChainId,
  (_state: RootState, _chainId: string, skipTestNetCheck?: boolean) =>
    skipTestNetCheck,
  (
    currencyRates: CurrencyRateState['currencyRates'],
    chainId,
    showFiatOnTestnets,
    nativeCurrency,
    skipTestNetCheck = false,
  ) => {
    if (isTestNet(chainId) && !showFiatOnTestnets && !skipTestNetCheck) {
      return undefined;
    }

    return currencyRates?.[nativeCurrency]?.conversionRate;
  },
);

export const selectUsdConversionRate = createSelector(
  getCurrencyRateControllerCurrencyRates,
  getCurrencyRateControllerCurrentCurrency,
  (currencyRates, currentCurrency) =>
    currencyRates?.[currentCurrency]?.usdConversionRate,
);

export const selectUSDConversionRateByChainId = createSelector(
  [
    getCurrencyRateControllerCurrencyRates,
    (_state: RootState, chainId: string) => chainId,
    (state: RootState, chainId: string) =>
      selectNetworkConfigurationByChainId(state, chainId),
  ],
  (currencyRates, _chainId, networkConfiguration) => {
    if (!networkConfiguration) {
      return undefined;
    }
    const { nativeCurrency } = networkConfiguration;
    return currencyRates?.[nativeCurrency]?.usdConversionRate;
  },
);
