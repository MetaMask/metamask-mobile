import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';
import type { MessengerClientInitFunction } from '../types';
import { MockProfileService } from './mock-profile-service';

/**
 * The profile API is not live yet. While this is true, Engine installs
 * {@link MockProfileService}, which registers the same messenger actions and
 * returns the same response schema as `ProfileService`.
 *
 * Set this to false to call `profile.api.cx.metamask.io`. Call sites stay on
 * `ProfileController` / `ProfileService` either way.
 */
const USE_MOCK_PROFILE_SERVICE = true;

/**
 * Initialize the ProfileService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized ProfileService.
 */
export const profileServiceInit: MessengerClientInitFunction<
  ProfileService,
  ProfileServiceMessenger
> = ({ controllerMessenger }) => {
  try {
    if (USE_MOCK_PROFILE_SERVICE) {
      const controller = new MockProfileService({
        messenger: controllerMessenger,
      });
      return { controller: controller as unknown as ProfileService };
    }

    const controller = new ProfileService({
      messenger: controllerMessenger,
      baseUrl: AppConstants.PROFILE_API_URL,
    });

    return { controller };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize ProfileService');
    throw error;
  }
};
