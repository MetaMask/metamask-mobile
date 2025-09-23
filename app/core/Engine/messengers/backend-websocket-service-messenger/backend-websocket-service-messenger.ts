import type { WebSocketServiceMessenger as BackendWebSocketServiceMessenger } from '@metamask/backend-platform';
import type { BaseControllerMessenger } from '../../types';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { AuthenticationControllerGetBearerToken } from '@metamask/profile-sync-controller/auth';
import { Messenger } from '@metamask/base-controller';

/**
 * Get the messenger for the BackendWebSocketService.
 *
 * @param baseMessenger - The base controller messenger.
 * @returns The restricted messenger for the BackendWebSocketService.
 */
export function getBackendWebSocketServiceMessenger(
  baseMessenger: BaseControllerMessenger,
): BackendWebSocketServiceMessenger {
  return baseMessenger.getRestricted({
    name: 'BackendWebSocketService',
    allowedActions: [
      'AuthenticationController:getBearerToken', // Get auth token (includes wallet unlock check)
    ],
    allowedEvents: [
      'AuthenticationController:stateChange', // Listen for authentication state (includes wallet lock/unlock)
    ],
  });
}

type InitActions = RemoteFeatureFlagControllerGetStateAction | AuthenticationControllerGetBearerToken;

export type BackendWebSocketServiceInitMessenger = ReturnType<
  typeof getBackendWebSocketServiceInitMessenger
>;

export function getBackendWebSocketServiceInitMessenger(
  messenger: Messenger<InitActions, never>,
) {
  return messenger.getRestricted({
    name: 'BackendWebSocketServiceInit',
    allowedEvents: [],
    allowedActions: [
      'RemoteFeatureFlagController:getState',
      'AuthenticationController:getBearerToken',
    ],
  });
}
