import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import AppConstants from '../../AppConstants';
import type { MessengerClientInitFunction } from '../types';

/**
 * Initialize the ProfileService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const profileServiceInit: MessengerClientInitFunction<
  ProfileService,
  ProfileServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ProfileService({
    messenger: controllerMessenger,
    baseUrl: AppConstants.PROFILE_API_URL,
  });

  return { controller };
};
