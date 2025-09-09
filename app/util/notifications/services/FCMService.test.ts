import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
// eslint-disable-next-line import/no-namespace
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthSent } from '@metamask/notification-services-controller/notification-services/mocks';

import FCMService from './FCMService';
import { EVENT_NAME, MetaMetrics } from '../../../core/Analytics';
import { NativeModules, Platform } from 'react-native';

// Firebase Mock
jest.mock('@react-native-firebase/messaging', () => {
  const originalModule = jest.requireActual('@react-native-firebase/messaging');

  const hasPermission = jest.fn();
  const registerDeviceForRemoteMessages = jest.fn();
  const getToken = jest.fn();
  const deleteToken = jest.fn();
  const setBackgroundMessageHandler = jest.fn();
  const onMessage = jest.fn();
  const getInitialNotification = jest.fn();

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
  }));

  // Retain the messaging properties
  Object.assign(mockMessaging, originalModule.default);

  return {
    __esModule: true,
    ...originalModule,
    default: mockMessaging,
  };
});

// Notification Services Mock
jest.mock('@metamask/notification-services-controller/notification-services');

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

  return {
    mockHasPermission,
    mockRegisterDeviceForRemoteMessages,
    mockGetToken,
    mockDeleteToken,
    mockOnMessage,
    mockGetInitialNotification,
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
    jest.clearAllMocks();
    FCMService.clearRegistration();
  });

  const arrangeNotificationServicesMocks = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identity = (x: any) => x;
    const mockProcessNotification = jest
      .mocked(processNotification)
      .mockImplementation(identity);

    return {
      mockProcessNotification,
    };
  };

  const arrangeMocks = () => {
    const firebaseMocks = arrangeFirebaseMocks();
    const mockHandler = jest.fn();
    const mockOnMessageUnsubscribe = jest.fn();
    firebaseMocks.mockOnMessage.mockReturnValue(mockOnMessageUnsubscribe);

    return { firebaseMocks, mockOnMessageUnsubscribe, mockHandler };
  };

  it('sets up listeners for push notifications and returns an unsubscribe handler', async () => {
    const { mockHandler, firebaseMocks } = arrangeMocks();

    const result = await FCMService.listenToPushNotificationsReceived(
      mockHandler,
    );
    expect(result).toBeDefined();
    expect(firebaseMocks.mockOnMessage).toHaveBeenCalled();
  });

  it('returns null if an error occurs while setting up listeners', async () => {
    const { mockHandler, firebaseMocks } = arrangeMocks();
    firebaseMocks.mockOnMessage.mockImplementationOnce(() => {
      throw new Error('TEST ERROR');
    });

    const result = await FCMService.listenToPushNotificationsReceived(
      mockHandler,
    );
    expect(result).toBe(null);
  });

  describe('FCMService - Process Foreground Messages', () => {
    const act = async (
      mocks: ReturnType<typeof arrangeMocks>,
      overridePayload = {},
    ) => {
      const defaultPayload = {
        data: { data: JSON.stringify(createMockNotificationEthSent()) },
      } as unknown as FirebaseMessagingTypes.RemoteMessage;
      const mockPayload = { ...defaultPayload, ...overridePayload };

      // Act - Start Listening
      await FCMService.listenToPushNotificationsReceived(mocks.mockHandler);
      expect(mocks.firebaseMocks.mockOnMessage).toHaveBeenCalled();

      // Fake a new remote message has been received
      const messageHandler =
        mocks.firebaseMocks.mockOnMessage.mock.lastCall?.[0];
      await messageHandler?.(mockPayload);
    };

    it('invokes "processAndHandleNotification" & calls handler param', async () => {
      const mocks = arrangeMocks();
      const notificationMocks = arrangeNotificationServicesMocks();

      await act(mocks);

      // Assert - notification was processed
      expect(notificationMocks.mockProcessNotification).toHaveBeenCalled();

      // Assert - handler callback was invoked
      expect(mocks.mockHandler).toHaveBeenCalled();
    });

    it('handles invalid or non-parseable payload', async () => {
      const mocks = arrangeMocks();
      arrangeNotificationServicesMocks();

      const invalidPayload = {
        data: { data: 'invalid json' },
      } as unknown as FirebaseMessagingTypes.RemoteMessage;

      await act(mocks, invalidPayload);

      expect(mocks.mockHandler).not.toHaveBeenCalled();
    });

    it('handles errors from notification services', async () => {
      const mocks = arrangeMocks();
      const notificationMocks = arrangeNotificationServicesMocks();
      notificationMocks.mockProcessNotification.mockImplementationOnce(() => {
        throw new Error('TEST ERROR');
      });

      await act(mocks);

      expect(mocks.mockHandler).not.toHaveBeenCalled();
    });
  });
});

describe('FCMService - onClickPushNotificationWhenAppClosed', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const mockTrackEvent = jest.spyOn(MetaMetrics.getInstance(), 'trackEvent');
    const firebaseMocks = arrangeFirebaseMocks();
    const nativeModuleMocks = arrangeNativeModuleMocks();
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
    } as unknown as FirebaseMessagingTypes.RemoteMessage);

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

      const arrangeAct = async (data?: null | Record<string, unknown>) => {
        const mocks = arrangeMocks();
        const mockNotification =
          data === null ? null : createMockRemoteMessage(data);
        mockSetup(mocks, mockNotification);
        const result = await FCMService.onClickPushNotificationWhenAppClosed();
        return { result, mocks };
      };

      it('returns deeplink when notification has deeplink data', async () => {
        const testData = {
          kind: 'take_profit_executed',
          deeplink: 'https://test.metamask.io/perps-asset?symbol=ETH',
        };

        const { result, mocks } = await arrangeAct(testData);

        expect(result).toBe('https://test.metamask.io/perps-asset?symbol=ETH');
        assertMockInitialNotificationCalled(mocks);
        expect(mocks.mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: EVENT_NAME.PUSH_NOTIFICATION_CLICKED,
            properties: expect.objectContaining(testData),
          }),
        );
      });

      it('tracks click event but does not return deeplink when no deeplink present', async () => {
        const testData = { kind: 'take_profit_executed' };

        const { result, mocks } = await arrangeAct(testData);

        expect(result).toBeFalsy();
        assertMockInitialNotificationCalled(mocks);
        expect(mocks.mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: EVENT_NAME.PUSH_NOTIFICATION_CLICKED,
            properties: expect.objectContaining(testData),
          }),
        );
      });

      it('does not track event or return deeplink when notification is null', async () => {
        const { result, mocks } = await arrangeAct(null);

        expect(result).toBeFalsy();
        assertMockInitialNotificationCalled(mocks);
        expect(mocks.mockTrackEvent).not.toHaveBeenCalled();
      });
    },
  );
});
