import notifee, {
  AuthorizationStatus,
  AndroidChannel,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import { Linking } from 'react-native';
import { ChannelId } from '../../../util/notifications/androidChannels';
import NotificationsService from './NotificationService';
import { LAUNCH_ACTIVITY, PressActionId } from '../types';

jest.mock('@notifee/react-native', () => ({
  getNotificationSettings: jest.fn(),
  getChannels: jest.fn(),
  requestPermission: jest.fn(),
  cancelTriggerNotification: jest.fn(),
  createChannel: jest.fn(),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  incrementBadgeCount: jest.fn(),
  decrementBadgeCount: jest.fn(),
  setBadgeCount: jest.fn(),
  getBadgeCount: jest.fn(),
  getInitialNotification: jest.fn(),
  openNotificationSettings: jest.fn(),
  displayNotification: jest.fn(),
  AndroidImportance: {
    DEFAULT: 'default',
    HIGH: 'high',
    LOW: 'low',
    MIN: 'min',
    NONE: 'none',
  },
  AuthorizationStatus: {
    AUTHORIZED: 'authorized',
    DENIED: 'denied',
    NOT_DETERMINED: 'not_determined',
    PROVISIONAL: 'provisional',
  },
  EventType: {
    DELIVERED: 'delivered',
    PRESS: 'press',
    DISMISSED: 'dismissed',
  },
}));
jest.mock('react-native', () => ({
  Linking: { openSettings: jest.fn() },
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));
jest.mock('../settings', () => ({
  mmStorage: {
    getLocal: jest.fn(),
    saveLocal: jest.fn(),
  },
}));
jest.mock('../../../store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));
jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('NotificationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets blocked notifications', async () => {
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
    (notifee.getChannels as jest.Mock).mockResolvedValue([
      { id: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID, blocked: true },
    ]);

    const blockedNotifications =
      await NotificationsService.getBlockedNotifications();

    expect(
      blockedNotifications.get(ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID),
    ).toBe(true);
  });

  it('handles notification press', async () => {
    const detail = {
      notification: {
        id: 'test-id',
        data: { url: 'https://example.com' },
      },
    };
    const callback = jest.fn();

    await NotificationsService.handleNotificationPress({ detail, callback });

    expect(notifee.cancelTriggerNotification).toHaveBeenCalledWith('test-id');
    expect(callback).toHaveBeenCalledWith(detail.notification);
  });

  it('opens system settings on iOS', () => {
    NotificationsService.openSystemSettings();

    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('creates notification channels', async () => {
    const channel: AndroidChannel = {
      id: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
      name: 'Test Channel',
      importance: AndroidImportance.HIGH,
    };

    await NotificationsService.createChannel(channel);

    expect(notifee.createChannel).toHaveBeenCalledWith(channel);
  });

  it('returns authorized from getAllPermissions', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
    (notifee.getChannels as jest.Mock).mockResolvedValue([]);

    const result = await NotificationsService.getAllPermissions();
    expect(result.permission).toBe('authorized');
  });

  it('returns authorized from requestPermission', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    });
    const result = await NotificationsService.requestPermission();
    expect(result).toBe('authorized');
  });

  it('returns denied from requestPermission', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    });
    const result = await NotificationsService.requestPermission();
    expect(result).toBe('denied');
  });

  it('handles notification event', async () => {
    const callback = jest.fn();

    await NotificationsService.handleNotificationEvent({
      type: EventType.DELIVERED,
      detail: {
        notification: {
          id: '123',
        },
      },
      callback,
    });

    expect(notifee.incrementBadgeCount).toHaveBeenCalledWith(1);

    await NotificationsService.handleNotificationEvent({
      type: EventType.PRESS,
      detail: {
        notification: {
          id: '123',
        },
      },
      callback,
    });

    expect(notifee.decrementBadgeCount).toHaveBeenCalledWith(1);
    expect(notifee.cancelTriggerNotification).toHaveBeenCalledWith('123');
  });

  it('displays notification', async () => {
    const notification = {
      title: 'Test Title',
      body: 'Test Body',
      data: undefined,
      android: {
        smallIcon: 'ic_notification_small',
        largeIcon: 'ic_notification',
        channelId: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
        pressAction: {
          id: PressActionId.OPEN_NOTIFICATIONS_VIEW,
          launchActivity: LAUNCH_ACTIVITY,
        },
      },
      ios: {
        foregroundPresentationOptions: {
          alert: true,
          sound: true,
          badge: true,
          banner: true,
          list: true,
        },
        interruptionLevel: 'critical',
        launchImageName: 'Default',
        sound: 'default',
      },
    };

    await NotificationsService.displayNotification({
      title: 'Test Title',
      body: 'Test Body',
      channelId: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
    });

    expect(notifee.displayNotification).toHaveBeenCalledWith(notification);
  });
});
