import { createSelector } from 'reselect';
import { CurrencyRateState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectChainId, selectTicker } from './networkController';
import { isTestNet } from '../../app/util/networks';

const selectCurrencyRateControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  selectChainId,
  selectTicker,
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

export const selectCurrentCurrency = createSelector(
  selectCurrencyRateControllerState,
  selectTicker,

  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currentCurrency,
);

export const selectCurrencyRates = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

// TODO: @salim controller work: Mock selector for all currency rates:
// Currently our currency rate controller ALMOST has the ability to be
// multi chain. What I mean by that is when you first initialize the app,
// you get one value which is the ETH currency rate. If you switch networks
// you get a new network value append into the currency rate controller. Meaning that
// to be multi chain you have to manually select each network so it can be added
// into the currency rate controller.
// The best solution is to get ALL values that are enabled in the networks controller
// when the app first initializes
export const selectAllCurrencyRates = {
  BNB: {
    conversionDate: 1731286685.117,
    conversionRate: 636.8,
    usdConversionRate: 636.8,
  },
  ETH: {
    conversionDate: 1731286797.922,
    conversionRate: 3195.6,
    usdConversionRate: 3195.6,
  },
  POL: {
    conversionDate: 1731286703.749,
    conversionRate: 0.411,
    usdConversionRate: 0.411,
  },
  'linea-mainnet': {
    conversionDate: null,
    conversionRate: null,
    usdConversionRate: null,
  },
  mainnet: {
    conversionDate: null,
    conversionRate: null,
    usdConversionRate: null,
  },
};
