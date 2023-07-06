import { createSelector } from 'reselect';
import { CurrencyRateState } from '@metamask/assets-controllers';
import { EngineState } from './types';

const selectCurrencyRateControllerState = (state: EngineState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.conversionRate,
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
