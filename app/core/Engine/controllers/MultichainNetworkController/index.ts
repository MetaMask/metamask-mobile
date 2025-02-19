import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
  MultichainNetworkControllerState,
} from '@metamask/multichain-network-controller';
import Logger from '../../../../util/Logger';

/**
 * Creates instance of MultichainNetworkController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of MultichainNetworkController
 * @returns - MultichainNetworkController instance
 */
export const createMultichainNetworkController = ({
  messenger,
  initialState,
}: {
  messenger: MultichainNetworkControllerMessenger;
  initialState?: MultichainNetworkControllerState;
}): MultichainNetworkController => {
  try {
    const multichainNetworkController = new MultichainNetworkController({
      messenger,
      state: initialState,
    });
    return multichainNetworkController;
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize MultichainNetworkController',
    );
    throw error;
  }
};
