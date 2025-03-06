import { CurrencyRateState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectEvmChainId,
  selectNativeCurrencyByChainId,
  selectEvmTicker,
} from './networkController';
import { isTestNet } from '../../app/util/networks';
import { createDeepEqualSelector } from './util';

const selectCurrencyRateControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

export const selectConversionRate = createDeepEqualSelector(
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

export const selectCurrencyRates = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

export const selectCurrentCurrency = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currentCurrency,
);

export const selectConversionRateBySymbol = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (_: RootState, symbol: string) => symbol,
  (currencyRateControllerState: CurrencyRateState, symbol: string) =>
    symbol
      ? currencyRateControllerState?.currencyRates?.[symbol]?.conversionRate ||
        0
      : 0,
);

export const selectConversionRateFoAllChains = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

export const selectConversionRateByChainId = createDeepEqualSelector(
  selectConversionRateFoAllChains,
  (_state: RootState, chainId: string) => chainId,
  (state: RootState) => state.settings.showFiatOnTestnets,
  selectNativeCurrencyByChainId,
  (
    currencyRates: CurrencyRateState['currencyRates'],
    chainId,
    showFiatOnTestnets,
    nativeCurrency,
  ) => {
    if (isTestNet(chainId) && !showFiatOnTestnets) {
      return undefined;
    }

    return currencyRates?.[nativeCurrency]?.conversionRate;
  },
);
