import {
  ProfileService,
  type ProfileServiceMessenger,
} from '@metamask/profile-controller';
import AppConstants from '../../AppConstants';
import type { MessengerClientInitFunction } from '../types';
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
