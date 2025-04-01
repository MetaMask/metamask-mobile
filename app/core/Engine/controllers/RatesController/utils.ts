import {
  RatesController,
  RatesControllerState,
  RatesControllerMessenger,
} from '@metamask/assets-controllers';
import Logger from '../../../../util/Logger';

/**
 * Creates instance of RatesController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of RatesControllerState
 * @returns - RatesController instance
 */
export const createMultichainRatesController = ({
  messenger,
  initialState,
}: {
  messenger: RatesControllerMessenger;
  initialState?: RatesControllerState;
}): RatesController => {
  try {
    const multichainRatesController = new RatesController({
      messenger,
      state: initialState ?? {},
      includeUsdRate: true,
    });

    return multichainRatesController;
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize RatesController');
    throw error;
  }
};
