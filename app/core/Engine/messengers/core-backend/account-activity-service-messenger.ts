import { AccountActivityServiceMessenger } from '@metamask/core-backend';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get a messenger for the Account Activity service. This is scoped to the
 * actions and events that the Account Activity service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AccountActivityServiceMessenger.
 */
export function getAccountActivityServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AccountActivityServiceMessenger>,
    MessengerEvents<AccountActivityServiceMessenger>
  >,
): AccountActivityServiceMessenger {
  const messenger: AccountActivityServiceMessenger = new Messenger({
    namespace: 'AccountActivityService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
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
      'AccountTreeController:selectedAccountGroupChange',
      'BackendWebSocketService:connectionStateChanged',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
