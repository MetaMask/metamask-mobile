import { AccountActivityServiceMessenger } from '@metamask/core-backend';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get a messenger for the Account Activity service. This is scoped to the
 * actions and events that the Account Activity service is allowed to handle.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AccountActivityServiceMessenger.
 */
export function getAccountActivityServiceMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): AccountActivityServiceMessenger {
  const messenger = new Messenger<
    'AccountActivityService',
    MessengerActions<AccountActivityServiceMessenger>,
    MessengerEvents<AccountActivityServiceMessenger>,
    RootMessenger
  >({
    namespace: 'AccountActivityService',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'BackendWebSocketService:connect',
      'BackendWebSocketService:forceReconnection',
      'BackendWebSocketService:subscribe',
      'BackendWebSocketService:getConnectionInfo',
      'BackendWebSocketService:channelHasSubscription',
      'BackendWebSocketService:getSubscriptionsByChannel',
      'BackendWebSocketService:findSubscriptionsByChannelPrefix',
      'BackendWebSocketService:addChannelCallback',
      'BackendWebSocketService:removeChannelCallback',
    ],
    events: [
      'AccountsController:selectedAccountChange',
      'BackendWebSocketService:connectionStateChanged',
    ],
    messenger,
  });
  return messenger;
}
