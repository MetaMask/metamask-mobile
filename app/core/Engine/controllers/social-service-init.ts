import {
  SocialService,
  type SocialServiceMessenger,
} from '@metamask/social-controllers';
import type { MessengerClientInitFunction } from '../types';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';
import { registerCommentReactionHandlersIfNeeded } from './registerCommentReactionHandlers';
import { registerCreateSwapCommentHandlerIfNeeded } from './registerCreateSwapCommentHandler';

/**
 * Initialize the SocialService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized SocialService.
 */
export const socialServiceInit: MessengerClientInitFunction<
  SocialService,
  SocialServiceMessenger
> = ({ controllerMessenger }) => {
  try {
    const controller = new SocialService({
      messenger: controllerMessenger,
      baseUrl: AppConstants.SOCIAL_API_URL,
    });
    registerCommentReactionHandlersIfNeeded(controller, controllerMessenger);
    registerCreateSwapCommentHandlerIfNeeded(controller, controllerMessenger);

    return { controller };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize SocialService');
    throw error;
  }
};
