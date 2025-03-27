import {
  MultichainAssetsController,
  MultichainAssetsControllerMessenger,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import Logger from '../../../../util/Logger';

const defaultMultichainAssetsControllerState: MultichainAssetsControllerState =
  {
    accountsAssets: {},
    assetsMetadata: {},
  };

/**
 * Creates instance of MultichainAssetsController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of MultichainAssetsController
 * @returns - MultichainAssetsController instance
 */
export const createMultichainAssetsController = ({
  messenger,
  initialState,
}: {
  messenger: MultichainAssetsControllerMessenger;
  initialState?: MultichainAssetsControllerState;
}): MultichainAssetsController => {
  try {
    const multichainAssetsController = new MultichainAssetsController({
      messenger,
      state: initialState ?? defaultMultichainAssetsControllerState,
    });
    return multichainAssetsController;
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize MultichainAssetsController',
    );
    throw error;
  }
};
