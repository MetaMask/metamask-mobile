import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the DeFiPositionsController.
 *
 * @param request - The request object.
 * @returns The DeFiPositionsController.
 */
export const defiPositionsControllerInit: ControllerInitFunction<
  DeFiPositionsController,
  DeFiPositionsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const controller = new DeFiPositionsController({
    messenger: controllerMessenger,
    state: persistedState.DeFiPositionsController,
    apiUrl: 'http://localhost:3000',
  });

  return { controller };
};
