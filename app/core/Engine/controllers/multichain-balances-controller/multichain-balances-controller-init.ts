import {
  MultichainBalancesController,
  MultichainBalancesControllerState,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';
import { selectIsControllerDeprecated } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { store } from '../../../../store';

/**
 * Initialize the MultichainBalancesController.
 *
 * @param request - The request object.
 * @returns The MultichainBalancesController.
 */
export const multichainBalancesControllerInit: MessengerClientInitFunction<
  MultichainBalancesController,
  MultichainBalancesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const multichainBalancesControllerState =
    persistedState.MultichainBalancesController as MultichainBalancesControllerState;

  const controller = new MultichainBalancesController({
    messenger: controllerMessenger,
    state: multichainBalancesControllerState,
    isDeprecated: () =>
      selectIsControllerDeprecated('MultichainBalancesController')(
        store.getState(),
      ),
  });

  return { controller };
};
