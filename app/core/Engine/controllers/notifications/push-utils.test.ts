import { AppState, type AppStateStatus } from 'react-native';
import { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import { unregisterBrazePush } from '../../../Braze/unregisterPush';
import {
  WALLET_ACTIVITY_NOTIFICATION_TYPE,
  createSubscribeToPushNotifications,
  deleteRegToken,
  shouldDisplayForegroundPushNotification,
} from './push-utils';

jest.mock('../../../Braze/unregisterPush', () => ({
  unregisterBrazePush: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../util/notifications/services/FCMService', () => ({
  __esModule: true,
  default: {
    createRegToken: jest.fn(),
    deleteRegToken: jest.fn(),
    listenToPushNotificationsReceived: jest.fn(),
    isPushNotificationsEnabled: jest.fn(),
  },
}));

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: {
      displayNotification: jest.fn(),
    },
  }),
);

const createRemoteMessage = (
  overrides: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  } = {},
): FirebaseMessagingTypes.RemoteMessage =>
  ({
    notification: {
      title: overrides.title ?? 'You received ETH',
      body: overrides.body ?? '0.05 ETH',
    },
    data: overrides.data,
  }) as FirebaseMessagingTypes.RemoteMessage;

const setAppState = (state: AppStateStatus) => {
  Object.defineProperty(AppState, 'currentState', {
    value: state,
    writable: true,
    configurable: true,
  });
};

describe('deleteRegToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(unregisterBrazePush).mockResolvedValue(undefined);
    jest.mocked(FCMService.deleteRegToken).mockResolvedValue(true);
  });

  it('unregisters Braze push before deleting the FCM token', async () => {
    const result = await deleteRegToken();

    expect(result).toBe(true);
    expect(unregisterBrazePush).toHaveBeenCalled();
    expect(FCMService.deleteRegToken).toHaveBeenCalled();
    expect(
      jest.mocked(unregisterBrazePush).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(FCMService.deleteRegToken).mock.invocationCallOrder[0],
    );
  });

  it('does not delete the FCM token when Braze unregister fails', async () => {
    jest
      .mocked(unregisterBrazePush)
      .mockRejectedValue(new Error('Failed to unregister Braze push'));

    await expect(deleteRegToken()).rejects.toThrow(
      'Failed to unregister Braze push',
    );

    expect(FCMService.deleteRegToken).not.toHaveBeenCalled();
  });
});

describe('shouldDisplayForegroundPushNotification', () => {
  afterEach(() => {
    setAppState('active');
  });

  it('returns false for wallet_activity when the app is in the foreground', () => {
    setAppState('active');
    const data = { notification_type: WALLET_ACTIVITY_NOTIFICATION_TYPE };

    expect(shouldDisplayForegroundPushNotification(data)).toBe(false);
  });

  it.each(['background', 'inactive'] as const)(
    'returns true for wallet_activity when the app is %s',
    (state) => {
      setAppState(state);
      const data = { notification_type: WALLET_ACTIVITY_NOTIFICATION_TYPE };

      expect(shouldDisplayForegroundPushNotification(data)).toBe(true);
    },
  );

  it('returns true for non-wallet_activity types in the foreground', () => {
    setAppState('active');
    const data = { notification_type: 'perps' };

    expect(shouldDisplayForegroundPushNotification(data)).toBe(true);
  });

  it('returns true when notification_type is missing', () => {
    setAppState('active');
    expect(
      shouldDisplayForegroundPushNotification({ notification_id: 'a' }),
    ).toBe(true);
  });

  it('returns true when data is undefined', () => {
    setAppState('active');
    expect(shouldDisplayForegroundPushNotification(undefined)).toBe(true);
  });
});

describe('createSubscribeToPushNotifications', () => {
  const mockListen = jest.mocked(FCMService.listenToPushNotificationsReceived);
  const mockDisplay = jest.mocked(NotificationsService.displayNotification);

  beforeEach(() => {
    jest.clearAllMocks();
    mockListen.mockResolvedValue(jest.fn());
    mockDisplay.mockResolvedValue(undefined);
    setAppState('active');
  });

  const getForegroundHandler = async () => {
    const subscribe = createSubscribeToPushNotifications();
    await subscribe();
    return mockListen.mock.calls[0][0];
  };

  it('does not display wallet_activity notifications in the foreground', async () => {
    const handler = await getForegroundHandler();
    const payload = createRemoteMessage({
      data: {
        notification_id: 'abc',
        notification_type: WALLET_ACTIVITY_NOTIFICATION_TYPE,
      },
    });

    await handler(payload);

    expect(mockDisplay).not.toHaveBeenCalled();
  });

  it('displays non-wallet_activity notifications in the foreground', async () => {
    const handler = await getForegroundHandler();
    const payload = createRemoteMessage({
      data: {
        notification_id: 'platform-1',
        notification_type: 'platform',
      },
    });

    await handler(payload);

    expect(mockDisplay).toHaveBeenCalledWith({
      pressActionId: PressActionId.OPEN_NOTIFICATIONS_VIEW,
      id: 'platform-1',
      title: 'You received ETH',
      body: '0.05 ETH',
      data: {
        notification_id: 'platform-1',
        notification_type: 'platform',
      },
    });
  });

  it('does not display notifications without a title', async () => {
    const handler = await getForegroundHandler();
    const payload = {
      notification: { body: '0.05 ETH' },
      data: { notification_type: 'platform' },
    } as unknown as FirebaseMessagingTypes.RemoteMessage;

    await handler(payload);

    expect(mockDisplay).not.toHaveBeenCalled();
  });
});
