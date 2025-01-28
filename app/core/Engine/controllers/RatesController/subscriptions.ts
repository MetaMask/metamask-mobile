import {
  RatesController,
  CurrencyRateState,
  CurrencyRateController,
} from '@metamask/assets-controllers';
import Logger from '../../../../util/Logger';

/**
 * Sets up subscription to sync CurrencyRateController changes with RatesController
 * @param controllerMessenger - The main controller messenger
 * @param ratesController - The RatesController instance to sync with
 */
export const setupCurrencyRateSync = (
  controllerMessenger: {
    subscribe: (
      eventName: string,
      handler: (state: CurrencyRateState) => void,
    ) => void;
  },
  ratesController: RatesController,
): void => {
  controllerMessenger.subscribe(
    `${CurrencyRateController.name}:stateChange`,
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
