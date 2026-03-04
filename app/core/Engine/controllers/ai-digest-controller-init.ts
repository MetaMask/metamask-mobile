import { ControllerInitFunction } from '../types';
import {
  AiDigestController,
  AiDigestService,
  type AiDigestControllerMessenger,
} from '@metamask/ai-controllers';
import AppConstants from '../../AppConstants';

/**
 * Initialize the AiDigestController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const aiDigestControllerInit: ControllerInitFunction<
  AiDigestController,
  AiDigestControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const digestService = new AiDigestService({
    baseUrl: AppConstants.TERMINAL_API_URL,
  });

  const controller = new AiDigestController({
    messenger: controllerMessenger,
    state: persistedState.AiDigestController,
    digestService,
  });

  return {
    controller,
  };
};
