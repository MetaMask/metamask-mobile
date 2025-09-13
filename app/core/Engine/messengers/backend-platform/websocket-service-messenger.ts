import { Messenger } from '@metamask/base-controller';
import type {
  WebSocketServiceActions,
} from '@metamask/backend-platform';

export type WebSocketServiceMessenger = ReturnType<
  typeof getWebSocketServiceMessenger
>;

// WebSocketServiceEvents is defined as 'never' in backend-platform
type WebSocketServiceEvents = never;

/**
 * Get a restricted messenger for the WebSocket service. This is scoped to the
 * actions and events that the WebSocket service is allowed to handle.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getWebSocketServiceMessenger(
  messenger: Messenger<WebSocketServiceActions, WebSocketServiceEvents>,
) {
  return messenger.getRestricted({
    name: 'BackendWebSocketService',
    allowedActions: [
      'BackendWebSocketService:init',
      'BackendWebSocketService:connect',
      'BackendWebSocketService:disconnect', 
      'BackendWebSocketService:sendMessage',
      'BackendWebSocketService:sendRequest',
      'BackendWebSocketService:getConnectionInfo',
      'BackendWebSocketService:clearSession',
      'BackendWebSocketService:getSessionId',
      'BackendWebSocketService:getRequestQueueStatus',
      'BackendWebSocketService:clearRequestQueue',
      'BackendWebSocketService:reconnectWithFreshSession',
      'BackendWebSocketService:getSessionRetentionInfo',
      'BackendWebSocketService:cleanup',
      'BackendWebSocketService:getSubscriptionsByNamespace',
      'BackendWebSocketService:getSubscriptionByChannel',
      'BackendWebSocketService:isChannelSubscribed',
      'BackendWebSocketService:getChannelSubscriptionMapping',
    ] as any,
    allowedEvents: [],
  });
} 