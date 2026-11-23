import {
  SocialRealtimeService as SocialRealtimeServiceController,
  type SocialRealtimeService,
} from '@metamask/social-controllers';

import type { MessengerClientInitFunction } from '../types';
import type { SocialRealtimeServiceMessenger } from '../messengers/social-realtime-service-messenger';

export const socialRealtimeServiceInit: MessengerClientInitFunction<
  SocialRealtimeService,
  SocialRealtimeServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new SocialRealtimeServiceController({
    messenger: controllerMessenger,
    scopes: ['all'],
  }),
});
