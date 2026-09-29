import {
  SocialRealtimeService as SocialRealtimeServiceController,
  type SocialRealtimeService,
} from '@metamask/social-controllers';

import type { MessengerClientInitFunction } from '../types';
import type {
  SocialRealtimeServiceInitMessenger,
  SocialRealtimeServiceMessenger,
} from '../messengers/social-realtime-service-messenger';
import Logger from '../../../util/Logger';

const isSocialFeedRealtimeEnabled = (
  initMessenger: SocialRealtimeServiceInitMessenger,
): boolean => {
  if (process.env.MM_BACKEND_WEBSOCKET_URL?.startsWith('ws://127.0.0.1')) {
    return true;
  }

  try {
    const remoteFeatureFlagState = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const value =
      remoteFeatureFlagState?.remoteFeatureFlags?.socialFeedRealtime;

    if (typeof value === 'object' && value !== null && 'value' in value) {
      return Boolean(value.value);
    }

    return Boolean(value);
  } catch (error) {
    Logger.log(
      'SocialRealtimeService: Could not check feature flag, defaulting to disabled',
      error,
    );
    return false;
  }
};

export const socialRealtimeServiceInit: MessengerClientInitFunction<
  SocialRealtimeService,
  SocialRealtimeServiceMessenger,
  SocialRealtimeServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => ({
  controller: new SocialRealtimeServiceController({
    messenger: controllerMessenger,
    isEnabled: () => isSocialFeedRealtimeEnabled(initMessenger),
  }),
});
