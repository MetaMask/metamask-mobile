import type { MessengerClientInitFunction } from '../../types';
import {
  PredictController,
  PredictControllerMessenger,
  getDefaultPredictControllerState,
} from '../../../../components/UI/Predict/controllers/PredictController';

/**
 * Initialize the PredictController.
 *
 * @param request - The request object.
 * @returns The PredictController.
 */
export const predictControllerInit: MessengerClientInitFunction<
  PredictController,
  PredictControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const predictControllerState =
    persistedState.PredictController ?? getDefaultPredictControllerState();

  const controller = new PredictController({
    messenger: controllerMessenger,
    state: predictControllerState,
  });

  return { controller };
};
