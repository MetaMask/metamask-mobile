import { ControllerInitFunction } from '../types';
import {
  RatesControllerInitMessenger,
  RatesControllerMessenger,
} from '../messengers/rates-controller-messenger';
import {
  CurrencyRateState,
  RatesController,
} from '@metamask/assets-controllers';
import Logger from '../../../util/Logger';

/**
 * Initialize the rates controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const ratesControllerInit: ControllerInitFunction<
  RatesController,
  RatesControllerMessenger,
  RatesControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const controller = new RatesController({
    messenger: controllerMessenger,
    state: persistedState.RatesController ?? {},
    includeUsdRate: true,
  });

  initMessenger.subscribe(
    'CurrencyRateController:stateChange',
    (state: CurrencyRateState) => {
      if (state.currentCurrency) {
        controller.setFiatCurrency(state.currentCurrency).catch((error) => {
          Logger.error(
            error as Error,
            'RatesController: Failed to sync fiat currency with CurrencyRateController.',
          );
        });
      }
    },
  );

  return {
    controller,
  };
};
