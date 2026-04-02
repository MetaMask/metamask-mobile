// TODO: Update import to @metamask/social-controllers once the package is released.
import {
  SocialController,
  type SocialControllerMessenger,
} from '@metamask-previews/social-controllers';
import type { ControllerInitFunction } from '../types';
import Logger from '../../../util/Logger';

/**
 * Initialize the SocialController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const socialControllerInit: ControllerInitFunction<
  SocialController,
  SocialControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  try {
    const controller = new SocialController({
      messenger: controllerMessenger,
      state: persistedState.SocialController,
    });

    return { controller };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize SocialController');
    throw error;
  }
};
