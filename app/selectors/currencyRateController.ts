import { createSelector } from 'reselect';
import { EngineState } from './types';

const selectCurrencyRateControllerState = (state: EngineState) => ({
  conversionRate:
    state?.engine?.backgroundState?.CurrencyRateController?.conversionRate,
  currentCurrency:
    state?.engine?.backgroundState?.CurrencyRateController?.currentCurrency,
  nativeCurrency:
    state?.engine?.backgroundState?.CurrencyRateController?.nativeCurrency,
});

export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  (
    currencyRateControllerState: ReturnType<
      typeof selectCurrencyRateControllerState
    >,
  ) => currencyRateControllerState?.conversionRate,
);

export const selectCurrentCurrency = createSelector(
  selectCurrencyRateControllerState,
  (
    currencyRateControllerState: ReturnType<
      typeof selectCurrencyRateControllerState
    >,
  ) => currencyRateControllerState?.currentCurrency,
);

export const selectNativeCurrency = createSelector(
  selectCurrencyRateControllerState,
  (
    currencyRateControllerState: ReturnType<
      typeof selectCurrencyRateControllerState
    >,
  ) => currencyRateControllerState?.nativeCurrency,
);
