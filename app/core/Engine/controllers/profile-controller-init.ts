import {
  ProfileController,
  type ProfileControllerMessenger,
} from '@metamask/profile-controller';
import type { MessengerClientInitFunction } from '../types';
export const profileControllerInit: MessengerClientInitFunction<
  ProfileController,
  ProfileControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new ProfileController({
    messenger: controllerMessenger,
    state: persistedState.ProfileController,
  });
  return { controller };
};
