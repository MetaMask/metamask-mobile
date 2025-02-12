import {
  MultichainBalancesController,
  MultichainBalancesControllerState,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import Logger from '../../../../util/Logger';

export const defaultMultichainBalancesControllerState: MultichainBalancesControllerState =
  {
    balances: {},
  };

/**
 * Creates instance of MultichainBalancesController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of MultichainBalancesController
 * @returns - MultichainBalancesController instance
 */
export const createMultichainBalancesController = ({
  messenger,
  initialState,
}: {
  messenger: MultichainBalancesControllerMessenger;
  initialState?: MultichainBalancesControllerState;
}): MultichainBalancesController => {
  try {
    const multichainBalancesController = new MultichainBalancesController({
      messenger,
      state: initialState ?? defaultMultichainBalancesControllerState,
    });
    return multichainBalancesController;
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize MultichainBalancesController',
    );
    throw error;
  }
};
