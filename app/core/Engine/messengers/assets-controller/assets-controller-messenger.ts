import { Messenger } from '@metamask/messenger';
import { AuthenticationController } from '@metamask/profile-sync-controller';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';

// Actions that AssetsController needs access to
type AssetsControllerAllowedActions =
  | NetworkControllerGetStateAction
  | AccountsControllerGetSelectedAccountAction;

// Events that AssetsController needs to subscribe to
type AssetsControllerAllowedEvents = never;

export type AssetsControllerMessenger = ReturnType<
  typeof getAssetsControllerMessenger
>;

/**
 * Get the messenger for the AssetsController. This is scoped to the
 * actions and events that the AssetsController is allowed to handle.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AssetsControllerMessenger.
 */
export function getAssetsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
) {
  const messenger = new Messenger<
    'AssetsController',
    AssetsControllerAllowedActions,
    AssetsControllerAllowedEvents,
    RootMessenger
  >({
    namespace: 'AssetsController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'NetworkController:getState',
      'AccountsController:getSelectedAccount',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

export type AssetsControllerInitMessenger = ReturnType<
  typeof getAssetsControllerInitMessenger
>;

/**
 * Get the messenger for the AssetsController initialization. This is scoped to the
 * actions and events that the AssetsController is allowed to handle during
 * initialization.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AssetsControllerInitMessenger.
 */
export function getAssetsControllerInitMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
) {
  const messenger = new Messenger<
    'AssetsControllerInit',
    | AuthenticationController.AuthenticationControllerGetBearerToken
    | PreferencesControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'AssetsControllerInit',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'PreferencesController:getState',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
