import {
  ProfileController,
  type ProfileControllerMessenger,
} from '@metamask/profile-controller';
import type { MessengerClientInitFunction } from '../types';

/**
 * Initialize the ProfileController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
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
