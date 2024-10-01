import notifee, {
  AuthorizationStatus,
  AndroidChannel,
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import { Linking } from 'react-native';
import { ChannelId } from '../../../util/notifications/androidChannels';
import NotificationsService from './NotificationService';

jest.mock('@notifee/react-native');
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

  it('should get blocked notifications', async () => {
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

  it('should handle notification press', async () => {
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

  it('should open system settings on iOS', () => {
    NotificationsService.openSystemSettings();

    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('should create notification channels', async () => {
    const channel: AndroidChannel = {
      id: ChannelId.DEFAULT_NOTIFICATION_CHANNEL_ID,
      name: 'Test Channel',
      importance: AndroidImportance.HIGH,
    };

    await NotificationsService.createChannel(channel);

    expect(notifee.createChannel).toHaveBeenCalledWith(channel);
  });

  it.concurrent(
    'should return authorized from getAllPermissions',
    async () => {
      const result = await NotificationsService.getAllPermissions();
      expect(result.permission).toBe('authorized');
    },
    10000,
  );

  it('should return authorized from requestPermission ', async () => {
    const result = await NotificationsService.requestPermission();
    expect(result).toBe('authorized');
  });

  it('should return denied from requestPermission', async () => {
    (notifee.requestPermission as jest.Mock).mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    });
    const result = await NotificationsService.requestPermission();
    expect(result).toBe('denied');
  });

  it('should handle notification event', async () => {
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

    expect(NotificationsService.incrementBadgeCount).toBeInstanceOf(Function);

    await NotificationsService.handleNotificationEvent({
      type: EventType.PRESS,
      detail: {
        notification: {
          id: '123',
        },
      },
      callback,
    });

    expect(NotificationsService.decrementBadgeCount).toBeInstanceOf(Function);
    expect(NotificationsService.cancelTriggerNotification).toBeInstanceOf(
      Function,
    );
  });
});
