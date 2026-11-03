import type { BackendWebSocketServiceMessenger } from '@metamask/core-backend';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';

export type SocialRealtimeServiceMessenger = BackendWebSocketServiceMessenger;

export function getSocialRealtimeServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SocialRealtimeServiceMessenger>,
    MessengerEvents<SocialRealtimeServiceMessenger>
  >,
): SocialRealtimeServiceMessenger {
  const messenger: SocialRealtimeServiceMessenger = new Messenger({
    namespace: 'SocialRealtimeService',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'BackendWebSocketService:connect',
      'BackendWebSocketService:channelHasSubscription',
      'BackendWebSocketService:getSubscriptionsByChannel',
      'BackendWebSocketService:subscribe',
    ],
    events: ['BackendWebSocketService:connectionStateChanged'],
    messenger,
  });

  return messenger;
}
