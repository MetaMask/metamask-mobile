// TODO: Update import to @metamask/social-controllers once the package is released.
import {
  SocialService,
  type SocialServiceMessenger,
} from '@metamask-previews/social-controllers';
import type { ControllerInitFunction } from '../types';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';

/**
 * Initialize the SocialService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized SocialService.
 */
export const socialServiceInit: ControllerInitFunction<
  SocialService,
  SocialServiceMessenger
> = ({ controllerMessenger }) => {
  try {
    const controller = new SocialService({
      messenger: controllerMessenger,
      baseUrl: AppConstants.SOCIAL_API_URL,
    });

    return { controller };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize SocialService');
    throw error;
  }
};
