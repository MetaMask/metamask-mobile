import {
  MultichainAssetsController,
  type MultichainAssetsControllerMessenger,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';
import { selectIsControllerDeprecated } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { store } from '../../../../store';

/**
 * Initialize the MultichainAssetsController.
 *
 * @param request - The request object.
 * @returns The MultichainAssetsController.
 */
export const multichainAssetsControllerInit: MessengerClientInitFunction<
  MultichainAssetsController,
  MultichainAssetsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainAssetsControllerState =
    persistedState.MultichainAssetsController as MultichainAssetsControllerState;

  const controller = new MultichainAssetsController({
    messenger: controllerMessenger,
    state: multichainAssetsControllerState,
    isDeprecated: () =>
      selectIsControllerDeprecated('MultichainAssetsController')(
        store.getState(),
      ),
  });

  return { controller };
};
