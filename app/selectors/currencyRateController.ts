import { createSelector } from 'reselect';
import { CurrencyRateState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectChainId } from './networkController';
import { isTestNet } from '../../app/util/networks';

const selectCurrencyRateControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  selectChainId,
  (state) => state.settings.showFiatOnTestnets,
  (currencyRateControllerState, chainId, showFiatOnTestnets) =>
    isTestNet(chainId) && !showFiatOnTestnets
      ? undefined
      : currencyRateControllerState?.conversionRate,
);

export const selectCurrentCurrency = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currentCurrency,
);

export const selectNativeCurrency = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.nativeCurrency,
);
