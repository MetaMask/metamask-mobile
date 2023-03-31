import { createSelector } from 'reselect';
import { EngineState } from './types';

const selectCurrencyRateControllerState = (state: EngineState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

/**
 * Select the conversion rate for the current network.
 *
 * `null` is being normalized to `0` here as a workaround for certain UI components not handling
 * `null` appropriately.
 *
 * TODO: Handle `null` currencyRate by hiding fiat values instead.
 */
// Using a named export because we will be adding more selectors soon
// eslint-disable-next-line import/prefer-default-export
export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState) =>
    currencyRateControllerState?.conversionRate === null
      ? 0
      : currencyRateControllerState?.conversionRate,
);
