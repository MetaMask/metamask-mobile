import { SocialRealtimeService } from '@metamask/social-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

import Logger from '../../../util/Logger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import type { SocialRealtimeServiceInitMessenger } from '../messengers/social-realtime-service-messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import {
  isLocalBackendWebSocketUrl,
  socialRealtimeServiceInit,
} from './social-realtime-service-init';

jest.mock('@metamask/social-controllers', () => ({
  SocialRealtimeService: jest.fn(),
}));
jest.mock('../../../util/Logger');

describe('socialRealtimeServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createInitRequest = (featureFlagState: unknown) => {
    const controllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const initMessenger = {
      call: jest.fn().mockReturnValue(featureFlagState),
    } as unknown as SocialRealtimeServiceInitMessenger;

    return {
      ...buildMessengerClientInitRequestMock(controllerMessenger),
      initMessenger,
    };
  };

  const getIsEnabled = (): (() => boolean) => {
    const options = (SocialRealtimeService as jest.Mock).mock.calls[0][0] as {
      isEnabled: () => boolean;
    };
    return options.isEnabled;
  };

  it('enables the service from a remote flag in a release build', () => {
    const globalWithDev = global as unknown as { __DEV__: boolean };
    const previousDev = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = false;

    try {
      socialRealtimeServiceInit(
        createInitRequest({
          remoteFeatureFlags: { socialFeedRealtime: true },
        }),
      );

      expect(getIsEnabled()()).toBe(true);
    } finally {
      globalWithDev.__DEV__ = previousDev;
    }
  });

  it.each([
    'ws://localhost:3001/v1',
    'ws://127.0.0.1:3001/v1',
    'ws://[::1]:3001/v1',
  ])('recognizes a local WebSocket URL: %s', (url) => {
    expect(isLocalBackendWebSocketUrl(url)).toBe(true);
  });

  it('supports the legacy remote flag wrapper', () => {
    socialRealtimeServiceInit(
      createInitRequest({
        remoteFeatureFlags: { socialFeedRealtime: { value: false } },
      }),
    );

    expect(getIsEnabled()()).toBe(false);
  });

  it('fails closed when the remote flag lookup throws', () => {
    const request = createInitRequest({});
    const error = new Error('Remote feature flags unavailable');
    (request.initMessenger.call as jest.Mock).mockImplementation(() => {
      throw error;
    });

    socialRealtimeServiceInit(request);

    expect(getIsEnabled()()).toBe(false);
    expect(Logger.log).toHaveBeenCalledWith(
      'SocialRealtimeService: Could not check feature flag, defaulting to disabled',
      error,
    );
  });
});
