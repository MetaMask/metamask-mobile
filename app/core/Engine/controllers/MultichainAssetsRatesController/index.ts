import {
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerMessenger,
  MultichainAssetsRatesControllerState,
} from '@metamask/assets-controllers';
import Logger from '../../../../util/Logger';

export const defaultMultichainBalancesControllerState: MultichainAssetsRatesControllerState =
  {
    conversionRates: {},
  };

/**
 * Creates instance of MultichainAssetsRatesController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of MultichainAssetsRatesController
 * @returns - MultichainAssetsRatesController instance
 */
export const createMultichainAssetsRatesController = ({
  messenger,
  initialState,
}: {
  messenger: MultichainAssetsRatesControllerMessenger;
  initialState?: MultichainAssetsRatesControllerState;
}): MultichainAssetsRatesController => {
  try {
    const multichainAssetsRatesController = new MultichainAssetsRatesController(
      {
        messenger,
        state: initialState ?? defaultMultichainBalancesControllerState,
      },
    );
    return multichainAssetsRatesController;
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize multichainAssetsRatesController',
    );
    throw error;
  }
};
