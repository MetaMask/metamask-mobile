import type { BackendWebSocketServiceMessenger } from '@metamask/core-backend';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
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

export type SocialRealtimeServiceInitMessenger = Messenger<
  'SocialRealtimeServiceInit',
  RemoteFeatureFlagControllerGetStateAction,
  never
>;

export function getSocialRealtimeServiceInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SocialRealtimeServiceInitMessenger>,
    MessengerEvents<SocialRealtimeServiceInitMessenger>
  >,
): SocialRealtimeServiceInitMessenger {
  const messenger: SocialRealtimeServiceInitMessenger = new Messenger({
    namespace: 'SocialRealtimeServiceInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: [],
    messenger,
  });

  return messenger;
}
