import type { WebSocketServiceMessenger as BackendWebSocketServiceMessenger } from '@metamask/backend-platform';
import type { BaseControllerMessenger } from '../../types';

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
    allowedActions: [],
    allowedEvents: [],
  });
}
