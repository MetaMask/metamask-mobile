import { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import FCMService from '../../../../util/notifications/services/FCMService';
import NotificationsService from '../../../../util/notifications/services/NotificationService';
import { PressActionId } from '../../../../util/notifications';
import {
  WALLET_ACTIVITY_NOTIFICATION_TYPE,
  createSubscribeToPushNotifications,
  shouldDisplayForegroundPushNotification,
} from './push-utils';

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

describe('shouldDisplayForegroundPushNotification', () => {
  it('returns false for wallet_activity notifications', () => {
    const data = { notification_type: WALLET_ACTIVITY_NOTIFICATION_TYPE };

    const result = shouldDisplayForegroundPushNotification(data);

    expect(result).toBe(false);
  });

  it('returns true for non-wallet_activity notification types', () => {
    const data = { notification_type: 'perps' };

    const result = shouldDisplayForegroundPushNotification(data);

    expect(result).toBe(true);
  });

  it('returns true when notification_type is missing', () => {
    const data = { notification_id: 'abc' };

    const result = shouldDisplayForegroundPushNotification(data);

    expect(result).toBe(true);
  });

  it('returns true when data is undefined', () => {
    const result = shouldDisplayForegroundPushNotification(undefined);

    expect(result).toBe(true);
  });
});

describe('createSubscribeToPushNotifications', () => {
  const mockListen = jest.mocked(FCMService.listenToPushNotificationsReceived);
  const mockDisplay = jest.mocked(NotificationsService.displayNotification);

  beforeEach(() => {
    jest.clearAllMocks();
    mockListen.mockResolvedValue(jest.fn());
    mockDisplay.mockResolvedValue(undefined);
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
