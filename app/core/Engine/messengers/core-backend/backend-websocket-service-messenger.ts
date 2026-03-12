import { BackendWebSocketServiceMessenger as BackendPlatformWebSocketServiceMessenger } from '@metamask/core-backend';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { AuthenticationController } from '@metamask/profile-sync-controller';

export type BackendWebSocketServiceMessenger =
  BackendPlatformWebSocketServiceMessenger;

/**
 * Get a restricted messenger for the Backend Platform WebSocket service.
 * This is scoped to backend platform operations and services.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The BackendWebSocketServiceMessenger.
 */
export function getBackendWebSocketServiceMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): BackendPlatformWebSocketServiceMessenger {
  const messenger = new Messenger<
    'BackendWebSocketService',
    MessengerActions<BackendPlatformWebSocketServiceMessenger>,
    MessengerEvents<BackendPlatformWebSocketServiceMessenger>,
    RootMessenger
  >({
    namespace: 'BackendWebSocketService',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken', // Get auth token (includes wallet unlock check)
    ],
    events: [
      'AuthenticationController:stateChange', // Listen for authentication state (sign in/out)
      'KeyringController:lock', // Listen for wallet lock
      'KeyringController:unlock', // Listen for wallet unlock
    ],
    messenger,
  });
  return messenger;
}

export type BackendWebSocketServiceInitMessenger = ReturnType<
  typeof getBackendWebSocketServiceInitMessenger
>;

export function getBackendWebSocketServiceInitMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
) {
  const messenger = new Messenger<
    'BackendWebSocketServiceInit',
    | RemoteFeatureFlagControllerGetStateAction
    | AuthenticationController.AuthenticationControllerGetBearerToken,
    never,
    RootMessenger
  >({
    namespace: 'BackendWebSocketServiceInit',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'AuthenticationController:getBearerToken',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
