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
import { createDeepEqualSelector } from './util';
import { Hex } from '@metamask/utils';

const selectCurrencyRateControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  selectEvmChainId,
  selectEvmTicker,
  (state: RootState) => state.settings.showFiatOnTestnets,
  (
    currencyRateControllerState: CurrencyRateState,
    chainId: string,
    ticker: string,
    showFiatOnTestnets,
  ) => {
    if (chainId && isTestNet(chainId) && !showFiatOnTestnets) {
      return undefined;
    }
    return ticker
      ? currencyRateControllerState?.currencyRates?.[ticker]?.conversionRate
      : undefined;
  },
);

export const selectCurrencyRates = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

export const selectCurrencyRateForChainId = createSelector(
  [
    (state, chainId: Hex) => {
      const currencyRates = selectCurrencyRates(state);
      const networkConfig = selectNetworkConfigurationByChainId(state, chainId);
      const conversionRate =
        currencyRates?.[networkConfig?.nativeCurrency]?.conversionRate || 0;
      return conversionRate;
    },
  ],
  (conversionRate): number => conversionRate,
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

export const selectCurrentCurrency = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currentCurrency,
);

export const selectConversionRateBySymbol = createSelector(
  selectCurrencyRateControllerState,
  (_: RootState, symbol: string) => symbol,
  (currencyRateControllerState: CurrencyRateState, symbol: string) =>
    symbol
      ? currencyRateControllerState?.currencyRates?.[symbol]?.conversionRate ||
        0
      : 0,
);

export const selectConversionRateFoAllChains = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

export const selectConversionRateByChainId = createSelector(
  selectConversionRateFoAllChains,
  (_state: RootState, chainId: string) => chainId,
  (state: RootState) => state.settings.showFiatOnTestnets,
  selectNativeCurrencyByChainId,
  (_state: RootState, _chainId: string, skipTestNetCheck?: boolean) => skipTestNetCheck,
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
  selectCurrencyRates,
  selectCurrentCurrency,
  (currencyRates, currentCurrency) => currencyRates?.[currentCurrency]?.usdConversionRate,
);
