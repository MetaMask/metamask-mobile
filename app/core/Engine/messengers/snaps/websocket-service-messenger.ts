import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { WebSocketServiceMessenger } from '@metamask/snaps-controllers';
import { RootMessenger } from '../../types';

export { type WebSocketServiceMessenger };

/**
 * Get a messenger for the WebSocket service. This is scoped to the
 * actions and events that the WebSocket service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The WebSocketServiceMessenger.
 */
export function getWebSocketServiceMessenger(
  rootMessenger: RootMessenger,
): WebSocketServiceMessenger {
  const messenger = new Messenger<
    'WebSocketService',
    MessengerActions<WebSocketServiceMessenger>,
    MessengerEvents<WebSocketServiceMessenger>,
    RootMessenger
  >({
    namespace: 'WebSocketService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['SnapController:handleRequest'],
    events: [
      'SnapController:snapUpdated',
      'SnapController:snapUninstalled',
      'SnapController:snapInstalled',
    ],
    messenger,
  });
  return messenger;
}
