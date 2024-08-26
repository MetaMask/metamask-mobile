import notifee, {
  NotificationSettings,
  AuthorizationStatus,
  IOSNotificationSetting,
  IOSNotificationSettings,
  AndroidNotificationSettings,
  AndroidNotificationSetting,
} from '@notifee/react-native';

import { strings } from '../../../locales/i18n';
import { requestPushNotificationsPermission } from './pushPermissions';

jest.mock('@notifee/react-native', () => ({
  getNotificationSettings: jest.fn(),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 2,
  },
  IOSNotificationSetting: {
    ENABLED: 1,
    DISABLED: 2,
  },
  AndroidNotificationSetting: {
    ENABLED: 1,
    DISABLED: 2,
  },
}));

jest.mock('../Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

jest.mock('./pushPermissions', () => ({
  ...jest.requireActual('./pushPermissions'),
  AsyncAlert: jest.fn(),
}));

describe('requestPushNotificationsPermission', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockIOSSettings: IOSNotificationSettings = {
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
    alert: IOSNotificationSetting.ENABLED,
    badge: IOSNotificationSetting.ENABLED,
    sound: IOSNotificationSetting.ENABLED,
    carPlay: IOSNotificationSetting.DISABLED,
    criticalAlert: IOSNotificationSetting.DISABLED,
    inAppNotificationSettings: IOSNotificationSetting.DISABLED,
    lockScreen: IOSNotificationSetting.ENABLED,
    notificationCenter: IOSNotificationSetting.ENABLED,
    showPreviews: 1,
    announcement: 1,
  };

  const mockAndroidSettings: AndroidNotificationSettings = {
    alarm: AndroidNotificationSetting.ENABLED,
  };

  it('should return notification settings if already authorized', async () => {
    const mockSettings: NotificationSettings = {
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
      ios: mockIOSSettings,
      android: mockAndroidSettings,
      web: {},
    };

    (notifee.getNotificationSettings as jest.Mock).mockResolvedValue(
      mockSettings,
    );

    const result = await requestPushNotificationsPermission();

    expect(notifee.getNotificationSettings).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockSettings);
  });

  it('should prompt the user with AsyncAlert and simulate a click', async () => {
    const mockSettings: NotificationSettings = {
      authorizationStatus: AuthorizationStatus.DENIED,
      ios: mockIOSSettings,
      android: mockAndroidSettings,
      web: {},
    };

    const updatedSettings: NotificationSettings = {
      ...mockSettings,
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    };

    (notifee.getNotificationSettings as jest.Mock)
      .mockResolvedValueOnce(mockSettings)
      .mockResolvedValueOnce(updatedSettings);
    (strings as jest.Mock).mockImplementation((key: string) => key);

    const mockAsyncAlert = jest.fn().mockResolvedValue(true);

    const result = await requestPushNotificationsPermission(mockAsyncAlert);

    expect(mockAsyncAlert).toHaveBeenCalledWith(
      'notifications.prompt_title',
      'notifications.prompt_desc',
    );
    expect(notifee.getNotificationSettings).toHaveBeenCalledTimes(2);
    expect(strings).toHaveBeenCalledWith('notifications.prompt_title');
    expect(strings).toHaveBeenCalledWith('notifications.prompt_desc');
    expect(result).toBe(updatedSettings);
  });
});
