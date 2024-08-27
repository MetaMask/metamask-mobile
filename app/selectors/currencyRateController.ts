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
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state: any) => state.settings.showFiatOnTestnets,
  (
    currencyRateControllerState: CurrencyRateState,
    chainId,
    ticker: string,
    showFiatOnTestnets,
  ) =>
    isTestNet(chainId) && !showFiatOnTestnets
      ? undefined
      : currencyRateControllerState?.currencyRates?.[ticker]?.conversionRate,
);

export const selectCurrentCurrency = createSelector(
  selectCurrencyRateControllerState,
  selectTicker,

  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currentCurrency,
);
