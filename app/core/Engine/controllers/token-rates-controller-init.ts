import { MessengerClientInitFunction } from '../types';
import {
  TokenRatesController,
  type TokenRatesControllerMessenger,
} from '@metamask/assets-controllers';
import { Duration, inMilliseconds } from '@metamask/utils';
import { selectIsControllerDeprecated } from '../../../selectors/featureFlagController/assetsUnifyState';
import { store } from '../../../store';

/**
 * Initialize the token rates controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenRatesControllerInit: MessengerClientInitFunction<
  TokenRatesController,
  TokenRatesControllerMessenger
> = ({ controllerMessenger, persistedState, codefiTokenApiV2 }) => {
  const controller = new TokenRatesController({
    messenger: controllerMessenger,
    state: persistedState.TokenRatesController ?? { marketData: {} },
    interval: inMilliseconds(30, Duration.Minute),
    tokenPricesService: codefiTokenApiV2,
    isDeprecated: () =>
      selectIsControllerDeprecated('TokenRatesController')(store.getState()),
  });

  return {
    controller,
  };
};
