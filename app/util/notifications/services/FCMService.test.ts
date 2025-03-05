import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
// eslint-disable-next-line import/no-namespace
import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthSent } from '@metamask/notification-services-controller/notification-services/mocks';

import FCMService from './FCMService';

// Firebase Mock
jest.mock('@react-native-firebase/messaging', () => {
  const originalModule = jest.requireActual('@react-native-firebase/messaging');

  const hasPermission = jest.fn();
  const registerDeviceForRemoteMessages = jest.fn();
  const getToken = jest.fn();
  const deleteToken = jest.fn();
  const setBackgroundMessageHandler = jest.fn();
  const onMessage = jest.fn();

  // Messaging() function mock
  const mockMessaging = jest.fn(() => ({
    isDeviceRegisteredForRemoteMessages: false,
    hasPermission,
    registerDeviceForRemoteMessages,
    getToken,
    deleteToken,
    setBackgroundMessageHandler,
    onMessage,
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

  return {
    mockHasPermission,
    mockRegisterDeviceForRemoteMessages,
    mockGetToken,
    mockDeleteToken,
    mockOnMessage,
  };
};

describe('FCMService - createRegToken()', () => {
  afterEach(() => {
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
  afterEach(() => {
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
  afterEach(() => {
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
