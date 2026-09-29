import { BackendWebSocketServiceMessenger as BackendPlatformWebSocketServiceMessenger } from '@metamask/core-backend';
import { RootMessenger } from '../../types';
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
 * @param rootMessenger - The root messenger.
 * @returns The BackendWebSocketServiceMessenger.
 */
export function getBackendWebSocketServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<BackendPlatformWebSocketServiceMessenger>,
    MessengerEvents<BackendPlatformWebSocketServiceMessenger>
  >,
): BackendPlatformWebSocketServiceMessenger {
  const messenger: BackendPlatformWebSocketServiceMessenger = new Messenger({
    namespace: 'BackendWebSocketService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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

type BackendWebSocketServiceInitMessengerActions =
  | RemoteFeatureFlagControllerGetStateAction
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction;

export type BackendWebSocketServiceInitMessenger = Messenger<
  'BackendWebSocketServiceInit',
  BackendWebSocketServiceInitMessengerActions,
  never
>;

export function getBackendWebSocketServiceInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<BackendWebSocketServiceInitMessenger>,
    MessengerEvents<BackendWebSocketServiceInitMessenger>
  >,
): BackendWebSocketServiceInitMessenger {
  const messenger: BackendWebSocketServiceInitMessenger = new Messenger({
    namespace: 'BackendWebSocketServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'AuthenticationController:getBearerToken',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
