import { OHLCVServiceMessenger } from '@metamask/core-backend';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get a messenger for the OHLCV service. This is scoped to the
 * actions and events that the OHLCV service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The OHLCVServiceMessenger.
 */
export function getOHLCVServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<OHLCVServiceMessenger>,
    MessengerEvents<OHLCVServiceMessenger>
  >,
): OHLCVServiceMessenger {
  const messenger: OHLCVServiceMessenger = new Messenger({
    namespace: 'OHLCVService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
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
    events: ['BackendWebSocketService:connectionStateChanged'],
    messenger,
  });
  return messenger;
}
