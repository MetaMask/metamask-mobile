import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

import FCMService from './FCMService';
import { EVENT_NAME } from '../../../core/Analytics';
import { analytics } from '../../analytics/analytics';
import { NativeModules, Platform } from 'react-native';
import { getSessionProfileId } from '../utils/get-session-profile-id';

// Firebase Mock
// NOTE: do not jest.requireActual here — since RNFB v25, importing the real
// module instantiates RNFBNativeEventEmitter which throws without native modules.
jest.mock('@react-native-firebase/messaging', () => {
  const hasPermission = jest.fn();
  const registerDeviceForRemoteMessages = jest.fn();
  const getToken = jest.fn();
  const deleteToken = jest.fn();
  const setBackgroundMessageHandler = jest.fn();
  const onMessage = jest.fn();
  const getInitialNotification = jest.fn();
  const onNotificationOpenedApp = jest.fn();

  // Messaging() function mock
  const mockMessaging = jest.fn(() => ({
    isDeviceRegisteredForRemoteMessages: false,
    hasPermission,
    registerDeviceForRemoteMessages,
    getToken,
    deleteToken,
    setBackgroundMessageHandler,
    onMessage,
    getInitialNotification,
    onNotificationOpenedApp,
  }));

  // Statics mirrored from @react-native-firebase/messaging/lib/statics.ts
  Object.assign(mockMessaging, {
    AuthorizationStatus: {
      NOT_DETERMINED: -1,
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
      EPHEMERAL: 3,
    },
  });

  return {
    __esModule: true,
    default: mockMessaging,
  };
});

// Notification Services Mock
jest.mock('@metamask/notification-services-controller/notification-services');

// Session profile ID mock (AuthenticationController identity source)
jest.mock('../utils/get-session-profile-id', () => ({
  getSessionProfileId: jest.fn(),
}));
const mockGetSessionProfileId = jest.mocked(getSessionProfileId);

const arrangeFirebaseMocks = () => {
  const mockHasPermission = jest.mocked(messaging().hasPermission);
  mockHasPermission.mockResolvedValue(messaging.AuthorizationStatus.AUTHORIZED);

  const mockRegisterDeviceForRemoteMessages = jest.mocked(
    messaging().registerDeviceForRemoteMessages,
  );

  const mockGetToken = jest
    .mocked(messaging().getToken)
    .mockResolvedValue('MOCK_FCM_TOKEN');
  const mockDeleteToken = jest.mocked(messaging().deleteToken);
  const mockOnMessage = jest.mocked(messaging().onMessage);
  const mockGetInitialNotification = jest.mocked(
    messaging().getInitialNotification,
  );
  const mockOnNotificationOpenedApp = jest.mocked(
    messaging().onNotificationOpenedApp,
  );

  return {
    mockHasPermission,
    mockRegisterDeviceForRemoteMessages,
    mockGetToken,
    mockDeleteToken,
    mockOnMessage,
    mockGetInitialNotification,
    mockOnNotificationOpenedApp,
  };
};

const arrangeNativeModuleMocks = () => {
  const mockNativeModuleGetInitialNotification = jest.fn();
  NativeModules.NotificationModule = {
    getInitialNotification: mockNativeModuleGetInitialNotification,
  };
  return {
    mockNativeModuleGetInitialNotification,
  };
};

describe('FCMService - createRegToken()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates registration token', async () => {
    const firebaseMocks = arrangeFirebaseMocks();

    const result = await FCMService.createRegToken();
    expect(result).toBeDefined();

    expect(firebaseMocks.mockHasPermission).toHaveBeenCalled();
    expect(
      firebaseMocks.mockRegisterDeviceForRemoteMessages,
    ).toHaveBeenCalled();
    expect(firebaseMocks.mockGetToken).toHaveBeenCalled();
  });

  it('returns null if push notifications are not enabled', async () => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockHasPermission.mockResolvedValue(
      messaging.AuthorizationStatus.DENIED,
    );

    const result = await FCMService.createRegToken();
    expect(result).toBe(null);
    expect(firebaseMocks.mockGetToken).not.toHaveBeenCalled();
  });

  it('returns null if fails to get FCM token', async () => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockGetToken.mockRejectedValueOnce(new Error('TEST ERROR'));

    const result = await FCMService.createRegToken();
    expect(result).toBe(null);
    expect(firebaseMocks.mockGetToken).toHaveBeenCalled();
  });
});

describe('FCMService - deleteRegToken()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully deletes an FCM token', async () => {
    const firebaseMocks = arrangeFirebaseMocks();

    const result = await FCMService.deleteRegToken();
    expect(result).toBe(true);

    expect(firebaseMocks.mockHasPermission).toHaveBeenCalled();
    expect(firebaseMocks.mockDeleteToken).toHaveBeenCalled();
  });

  it('returns true (silently passes) if push notifications are not enabled', async () => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockHasPermission.mockResolvedValue(
      messaging.AuthorizationStatus.DENIED,
    );

    const result = await FCMService.deleteRegToken();
    expect(result).toBe(true);
    expect(firebaseMocks.mockDeleteToken).not.toHaveBeenCalled();
  });

  it('returns fails to delete FCM token', async () => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockDeleteToken.mockRejectedValueOnce(
      new Error('TEST ERROR'),
    );

    const result = await FCMService.deleteRegToken();
    expect(result).toBe(false);
    expect(firebaseMocks.mockDeleteToken).toHaveBeenCalled();
  });
});

describe('FCMService - isPushNotificationsEnabled()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { status: 'AUTHORIZED', code: messaging.AuthorizationStatus.AUTHORIZED },
    { status: 'PROVISIONAL', code: messaging.AuthorizationStatus.PROVISIONAL },
  ])('returns true if push notifications are $status', async ({ code }) => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockHasPermission.mockResolvedValue(code);

    const result = await FCMService.isPushNotificationsEnabled();
    expect(result).toBe(true);
    expect(firebaseMocks.mockHasPermission).toHaveBeenCalled();
  });

  it('returns false if push notifications are denied', async () => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockHasPermission.mockResolvedValue(
      messaging.AuthorizationStatus.DENIED,
    );

    const result = await FCMService.isPushNotificationsEnabled();
    expect(result).toBe(false);
    expect(firebaseMocks.mockHasPermission).toHaveBeenCalled();
  });

  it('returns false if an error occurs while checking permission', async () => {
    const firebaseMocks = arrangeFirebaseMocks();
    firebaseMocks.mockHasPermission.mockRejectedValueOnce(
      new Error('TEST ERROR'),
    );

    const result = await FCMService.isPushNotificationsEnabled();
    expect(result).toBe(false);
    expect(firebaseMocks.mockHasPermission).toHaveBeenCalled();
  });
});

describe('FCMService - listenToPushNotificationsReceived()', () => {
  beforeEach(() => {
    FCMService.clearRegistration();
    jest.clearAllMocks();
  });

  afterEach(() => {
    FCMService.clearRegistration();
  });

  const arrangeMocks = () => {
    const firebaseMocks = arrangeFirebaseMocks();
    const mockHandler = jest.fn();
    const mockOnMessageUnsubscribe = jest.fn();
    firebaseMocks.mockOnMessage.mockReturnValue(mockOnMessageUnsubscribe);

    return { firebaseMocks, mockHandler, mockOnMessageUnsubscribe };
  };

  it('sets up listeners for push notifications and returns an unsubscribe handler', async () => {
    const { mockHandler, firebaseMocks } = arrangeMocks();

    const result =
      await FCMService.listenToPushNotificationsReceived(mockHandler);
    expect(result).toBeDefined();
    expect(firebaseMocks.mockOnMessage).toHaveBeenCalled();
  });

  it('registers a new foreground listener after unsubscribe', async () => {
    const { mockHandler, firebaseMocks } = arrangeMocks();
    const firstUnsubscribe =
      await FCMService.listenToPushNotificationsReceived(mockHandler);

    firstUnsubscribe?.();
    await FCMService.listenToPushNotificationsReceived(mockHandler);

    expect(firebaseMocks.mockOnMessage).toHaveBeenCalledTimes(2);
  });

  it('returns null if an error occurs while setting up listeners', async () => {
    const { mockHandler, firebaseMocks } = arrangeMocks();
    firebaseMocks.mockOnMessage.mockImplementationOnce(() => {
      throw new Error('TEST ERROR');
    });

    const result =
      await FCMService.listenToPushNotificationsReceived(mockHandler);
    expect(result).toBe(null);
  });

  it('passes the raw FCM payload directly to the handler', async () => {
    const mocks = arrangeMocks();
    const mockPayload = {
      notification: { title: 'You received ETH', body: '0.05 ETH' },
      data: { notification_id: 'abc', notification_type: 'wallet_activity' },
    } as unknown as FirebaseMessagingTypes.RemoteMessage;

    await FCMService.listenToPushNotificationsReceived(mocks.mockHandler);

    const messageHandler = mocks.firebaseMocks.mockOnMessage.mock.lastCall?.[0];
    await messageHandler?.(mockPayload);

    expect(mocks.mockHandler).toHaveBeenCalledWith(mockPayload);
  });
});

// Remote message data only contains string entries
const createMockPushAnalyticsFcmData = (
  overrides?: Record<string, string>,
) => ({
  notification_id: 'test-notification-id',
  notification_type: 'platform',
  notification_subtype: 'take_profit_executed',
  ...overrides,
});

describe('FCMService - onClickPushNotificationWhenAppClosed', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const assertTrackEventCalledWith = (
    mockTrackEvent: jest.SpyInstance,
    expectedProps: unknown,
  ) => {
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENT_NAME.PUSH_NOTIFICATION_CLICKED,
        properties: expect.objectContaining(expectedProps),
      }),
    );
  };

  const arrangeMocks = () => {
    const mockTrackEvent = jest.spyOn(analytics, 'trackEvent');
    const firebaseMocks = arrangeFirebaseMocks();
    const nativeModuleMocks = arrangeNativeModuleMocks();
    mockGetSessionProfileId.mockResolvedValue('test-profile-id');
    return {
      ...firebaseMocks,
      ...nativeModuleMocks,
      mockTrackEvent,
    };
  };

  const createMockRemoteMessage = (
    data?: unknown,
  ): FirebaseMessagingTypes.RemoteMessage =>
    ({
      data,
    }) as unknown as FirebaseMessagingTypes.RemoteMessage;

  const platformTestConfigs = [
    {
      platform: 'android' as const,
      mockSetup: (
        mocks: ReturnType<typeof arrangeMocks>,
        notification: FirebaseMessagingTypes.RemoteMessage | null,
      ) => {
        mocks.mockNativeModuleGetInitialNotification.mockResolvedValue(
          notification,
        );
      },
      assertMockInitialNotificationCalled: (
        mocks: ReturnType<typeof arrangeMocks>,
      ) => {
        expect(mocks.mockNativeModuleGetInitialNotification).toHaveBeenCalled();
        expect(mocks.mockGetInitialNotification).not.toHaveBeenCalled();
      },
    },
    {
      platform: 'ios' as const,
      mockSetup: (
        mocks: ReturnType<typeof arrangeMocks>,
        notification: FirebaseMessagingTypes.RemoteMessage | null,
      ) => {
        mocks.mockGetInitialNotification.mockResolvedValue(notification);
      },
      assertMockInitialNotificationCalled: (
        mocks: ReturnType<typeof arrangeMocks>,
      ) => {
        expect(mocks.mockGetInitialNotification).toHaveBeenCalled();
        expect(
          mocks.mockNativeModuleGetInitialNotification,
        ).not.toHaveBeenCalled();
      },
    },
  ];

  describe.each(platformTestConfigs)(
    '$platform Platform',
    ({ platform, mockSetup, assertMockInitialNotificationCalled }) => {
      beforeEach(() => {
        Platform.OS = platform;
      });

      const arrangeAct = async (data?: null | Record<string, string>) => {
        const mocks = arrangeMocks();
        const mockNotification =
          data === null ? null : createMockRemoteMessage(data);
        mockSetup(mocks, mockNotification);
        const result = await FCMService.onClickPushNotificationWhenAppClosed();
        return { result, mocks };
      };

      it('returns deeplink when notification has deeplink data', async () => {
        const testData = createMockPushAnalyticsFcmData({
          deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
        });
        const { result, mocks } = await arrangeAct(testData);

        expect(result).toBe('https://test.metamask.io/perps-asset?symbol=ETH');
        assertMockInitialNotificationCalled(mocks);
        assertTrackEventCalledWith(mocks.mockTrackEvent, {
          notification_id: 'test-notification-id',
          notification_type: 'platform',
          notification_subtype: 'take_profit_executed',
          deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
        });
      });

      it('tracks click event but does not return deeplink when no deeplink present', async () => {
        const testData = createMockPushAnalyticsFcmData();
        const { result, mocks } = await arrangeAct(testData);

        expect(result).toBeFalsy();
        assertMockInitialNotificationCalled(mocks);
        assertTrackEventCalledWith(mocks.mockTrackEvent, {
          notification_id: 'test-notification-id',
          notification_type: 'platform',
          notification_subtype: 'take_profit_executed',
        });
      });

      it('tracks click event with no properties provided', async () => {
        const { result, mocks } = await arrangeAct(null);

        expect(result).toBeFalsy();
        assertMockInitialNotificationCalled(mocks);
        expect(mocks.mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({}), //Called with no additional properties
        );
      });
    },
  );
});

describe('FCMService - onClickPushNotificationWhenAppSuspended', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const assertTrackEventCalledWith = (
    mockTrackEvent: jest.SpyInstance,
    expectedProps: unknown,
  ) => {
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENT_NAME.PUSH_NOTIFICATION_CLICKED,
        properties: expect.objectContaining(expectedProps),
      }),
    );
  };

  const arrangeMocks = () => {
    const mockTrackEvent = jest.spyOn(analytics, 'trackEvent');
    const firebaseMocks = arrangeFirebaseMocks();
    const deeplinkCallback = jest.fn();
    mockGetSessionProfileId.mockResolvedValue('test-profile-id');
    return {
      ...firebaseMocks,
      mockTrackEvent,
      deeplinkCallback,
    };
  };

  // Remote message data only contains string entries
  const createMockRemoteMessage = (
    data?: unknown,
  ): FirebaseMessagingTypes.RemoteMessage =>
    ({
      data,
    }) as unknown as FirebaseMessagingTypes.RemoteMessage;

  const arrangeAct = async (
    // Remote Message Data prop only contains string entries
    testData: Record<string, string> | null,
    overrideMocks?: (mocks: ReturnType<typeof arrangeMocks>) => void,
  ) => {
    const mocks = arrangeMocks();
    overrideMocks?.(mocks);
    const mockNotification =
      testData === null ? null : createMockRemoteMessage(testData);

    // Act - Setup listener & Call handler (simulate notification opened)
    FCMService.onClickPushNotificationWhenAppSuspended(mocks.deeplinkCallback);

    const notificationHandler =
      mocks.mockOnNotificationOpenedApp.mock.calls[0][0];
    await notificationHandler(
      mockNotification as FirebaseMessagingTypes.RemoteMessage,
    );

    return { mocks, deeplinkCallback: mocks.deeplinkCallback };
  };

  it('calls deeplink callback with deeplink when notification has deeplink data', async () => {
    const testData = createMockPushAnalyticsFcmData({
      deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
    });
    const { mocks, deeplinkCallback } = await arrangeAct(testData);

    expect(deeplinkCallback).toHaveBeenCalledWith(
      'https://test.metamask.io/perps-asset?symbol=ETH',
    );
    assertTrackEventCalledWith(mocks.mockTrackEvent, {
      notification_id: 'test-notification-id',
      notification_type: 'platform',
      notification_subtype: 'take_profit_executed',
      deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
    });
  });

  it('calls deeplink callback with undefined when notification has no deeplink', async () => {
    const testData = createMockPushAnalyticsFcmData();
    const { mocks, deeplinkCallback } = await arrangeAct(testData);

    expect(deeplinkCallback).toHaveBeenCalledWith(undefined);
    assertTrackEventCalledWith(mocks.mockTrackEvent, {
      notification_id: 'test-notification-id',
      notification_type: 'platform',
      notification_subtype: 'take_profit_executed',
    });
  });

  it('calls deeplink callback with undefined when notification has null data', async () => {
    const { mocks, deeplinkCallback } = await arrangeAct(null);

    expect(deeplinkCallback).toHaveBeenCalledWith(undefined);
    expect(mocks.mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({}), //Called with no additional properties
    );
  });

  it('handles deeplink callback that throws an error gracefully', async () => {
    const testData = createMockPushAnalyticsFcmData({
      deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
    });

    const { mocks } = await arrangeAct(testData, (m) => {
      m.deeplinkCallback.mockImplementation(() => {
        throw new Error('Callback error');
      });
    });

    // Assert - Analytics should still be tracked even if callback fails
    assertTrackEventCalledWith(mocks.mockTrackEvent, {
      notification_id: 'test-notification-id',
      notification_type: 'platform',
      notification_subtype: 'take_profit_executed',
      deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
    });
  });
});
