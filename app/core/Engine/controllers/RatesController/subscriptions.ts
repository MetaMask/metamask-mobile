import {
  RatesController,
  CurrencyRateState,
  CurrencyRateController,
  CurrencyRateControllerEvents,
} from '@metamask/assets-controllers';
import Logger from '../../../../util/Logger';
import { RestrictedMessenger } from '@metamask/base-controller';

// FIXME: This messenger type is not exported on `@metamask/assets-controllers`, so declare it here for now:
type CurrencyRateControllerMessenger = RestrictedMessenger<
  CurrencyRateController['name'],
  never,
  CurrencyRateControllerEvents,
  never,
  CurrencyRateControllerEvents['type']
>;

/**
 * Sets up subscription to sync CurrencyRateController changes with RatesController
 * @param controllerMessenger - The main controller messenger
 * @param ratesController - The RatesController instance to sync with
 */
export const setupCurrencyRateSync = (
  controllerMessenger: CurrencyRateControllerMessenger,
  ratesController: RatesController,
): void => {
  controllerMessenger.subscribe(
    'CurrencyRateController:stateChange',
    (state: CurrencyRateState) => {
      if (state.currentCurrency) {
        ratesController
          .setFiatCurrency(state.currentCurrency)
          .catch((error) => {
            Logger.error(
              error as Error,
              'RatesController: Failed to sync fiat currency with CurrencyRateController',
            );
          });
      }
    },
  );
};
