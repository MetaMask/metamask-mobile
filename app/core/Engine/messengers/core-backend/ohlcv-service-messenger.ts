import { OHLCVServiceMessenger } from '@metamask/core-backend';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get a messenger for the OHLCV service. This is scoped to the
 * actions and events that the OHLCV service is allowed to handle.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The OHLCVServiceMessenger.
 */
export function getOHLCVServiceMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): OHLCVServiceMessenger {
  const messenger = new Messenger<
    'OHLCVService',
    MessengerActions<OHLCVServiceMessenger>,
    MessengerEvents<OHLCVServiceMessenger>,
    RootMessenger
  >({
    namespace: 'OHLCVService',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
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
