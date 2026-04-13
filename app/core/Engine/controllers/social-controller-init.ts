import {
  SocialController,
  type SocialControllerMessenger,
} from '@metamask/social-controllers';
import type { MessengerClientInitFunction } from '../types';
import Logger from '../../../util/Logger';

/**
 * Initialize the SocialController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const socialControllerInit: MessengerClientInitFunction<
  SocialController,
  SocialControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  try {
    const controller = new SocialController({
      messenger: controllerMessenger,
      state: persistedState.SocialController,
    });

    return { messengerClient: controller };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize SocialController');
    throw error;
  }
};
