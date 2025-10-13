import { ControllerInitFunction } from '../types';
import { TokenRatesController } from '@metamask/assets-controllers';
import { TokenRatesControllerMessenger } from '../messengers/token-rates-controller-messenger';
import { Duration, inMilliseconds } from '@metamask/utils';

/**
 * Initialize the token rates controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenRatesControllerInit: ControllerInitFunction<
  TokenRatesController,
  TokenRatesControllerMessenger
> = ({ controllerMessenger, persistedState, codefiTokenApiV2 }) => {
  const controller = new TokenRatesController({
    messenger: controllerMessenger,
    state: persistedState.TokenRatesController ?? { marketData: {} },
    interval: inMilliseconds(30, Duration.Minute),
    tokenPricesService: codefiTokenApiV2,
  });

  return {
    controller,
  };
};
