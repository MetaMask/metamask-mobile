import { MessengerClientInitFunction } from '../types';
import {
  AiDigestController,
  AiDigestService,
  type AiDigestControllerMessenger,
} from '@metamask/ai-controllers';
import AppConstants from '../../AppConstants';

/**
 * Initialize the AiDigestController.
 *
 * Digest freshness is owned by React Query. Do not rehydrate leftover
 * `marketInsights` / `marketOverview` snapshots from older controller versions.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const aiDigestControllerInit: MessengerClientInitFunction<
  AiDigestController,
  AiDigestControllerMessenger
> = ({ controllerMessenger }) => {
  const digestService = new AiDigestService({
    baseUrl: AppConstants.DIGEST_API_URL,
  });

  const controller = new AiDigestController({
    messenger: controllerMessenger,
    digestService,
  });

  return {
    controller,
  };
};
