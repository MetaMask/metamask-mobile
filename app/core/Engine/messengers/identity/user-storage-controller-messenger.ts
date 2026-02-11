import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { UserStorageControllerMessenger } from '@metamask/profile-sync-controller/user-storage';
import { RootMessenger } from '../../types';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';

/**
 * Get a messenger for the user storage controller. This is scoped to the
 * user storage controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The UserStorageControllerMessenger.
 */
export function getUserStorageControllerMessenger(
  rootMessenger: RootMessenger,
): UserStorageControllerMessenger {
  const messenger = new Messenger<
    'UserStorageController',
    MessengerActions<UserStorageControllerMessenger>,
    MessengerEvents<UserStorageControllerMessenger>,
    RootMessenger
  >({
    namespace: 'UserStorageController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'KeyringController:getState',
      'SnapController:handleRequest',
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getSessionProfile',
      'AuthenticationController:isSignedIn',
      'AuthenticationController:performSignIn',
      'AddressBookController:list',
      'AddressBookController:set',
      'AddressBookController:delete',
    ],
    events: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'AddressBookController:contactUpdated',
      'AddressBookController:contactDeleted',
    ],
    messenger,
  });
  return messenger;
}

type UserStorageControllerInitMessengerActions = AnalyticsControllerActions;

/**
 * Get the UserStorageControllerInitMessenger for the UserStorageController.
 * This messenger is used during controller initialization to call other controllers.
 *
 * @param rootMessenger - The root messenger.
 * @returns The UserStorageControllerInitMessenger.
 */
export type UserStorageControllerInitMessenger = ReturnType<
  typeof getUserStorageControllerInitMessenger
>;

export function getUserStorageControllerInitMessenger(
  rootMessenger: RootMessenger,
): Messenger<
  'UserStorageControllerInit',
  UserStorageControllerInitMessengerActions,
  never,
  RootMessenger
> {
  const messenger = new Messenger<
    'UserStorageControllerInit',
    UserStorageControllerInitMessengerActions,
    never,
    RootMessenger
  >({
    namespace: 'UserStorageControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['AnalyticsController:trackEvent'],
    events: [],
    messenger,
  });

  return messenger;
}
