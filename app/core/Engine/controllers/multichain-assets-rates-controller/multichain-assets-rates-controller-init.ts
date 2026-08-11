import {
  MultichainAssetsRatesController,
  type MultichainAssetsRatesControllerMessenger,
  MultichainAssetsRatesControllerState,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';
import { selectIsControllerDeprecated } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { store } from '../../../../store';

/**
 * Initialize the MultichainAssetsRatesController.
 *
 * @param request - The request object.
 * @returns The MultichainAssetsRatesController.
 */
export const multichainAssetsRatesControllerInit: MessengerClientInitFunction<
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainAssetsRatesControllerState =
    persistedState.MultichainAssetsRatesController as MultichainAssetsRatesControllerState;

  const controller = new MultichainAssetsRatesController({
    messenger: controllerMessenger,
    state: multichainAssetsRatesControllerState,
    interval: 180000,
    isDeprecated: () =>
      selectIsControllerDeprecated('MultichainAssetsRatesController')(
        store.getState(),
      ),
  });

  return { controller };
};
