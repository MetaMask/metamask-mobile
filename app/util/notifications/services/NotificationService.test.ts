import notifee, {
  AuthorizationStatus,
  EventType,
  NotificationSettings,
  NativeAndroidChannel,
  EventDetail,
} from '@notifee/react-native';
import { Linking, Platform } from 'react-native';
import {
  ChannelId,
  notificationChannels,
} from '../../../util/notifications/androidChannels';
import NotificationService from './NotificationService';
import { store } from '../../../store';

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

describe('NotificationsService - getBlockedNotifications', () => {
  const arrangeMocks = () => {
    const mockGetNotificationSettings = jest
      .mocked(notifee.getNotificationSettings)
      .mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      } as NotificationSettings);

    const mockGetChannels = jest.mocked(notifee.getChannels);
    const mockChannels: NativeAndroidChannel[] = [
      { id: '1', blocked: true } as NativeAndroidChannel,
      { id: '2', blocked: true } as NativeAndroidChannel,
      { id: '3', blocked: true } as NativeAndroidChannel,
    ];
    mockGetChannels.mockResolvedValue(mockChannels);

    return { mockGetNotificationSettings, mockGetChannels, mockChannels };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets default blocked channels', async () => {
    const mocks = arrangeMocks();
    mocks.mockGetNotificationSettings.mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    } as NotificationSettings);

    const result = await NotificationService.getBlockedNotifications();
    const expectedChannels = notificationChannels;
    expectedChannels.forEach((c) => {
      expect(result.has(c.id)).toBe(true);
    });
  });

  it('gets notifee blocked channels', async () => {
    const mocks = arrangeMocks();

    const result = await NotificationService.getBlockedNotifications();
    const expectedChannels = mocks.mockChannels;
    expectedChannels.forEach((c) => {
      expect(result.has(c.id as ChannelId)).toBe(true);
    });
  });

  it('returns an empty map if error is thrown', async () => {
    const mocks = arrangeMocks();
    mocks.mockGetNotificationSettings.mockRejectedValue(
      new Error('TEST ERROR'),
    );

    const result = await NotificationService.getBlockedNotifications();
    expect(result.size).toBe(0);
  });
});

describe('NotificationService - getAllPermissions', () => {
  const arrangeMocks = () => {
    const mockCreateChannel = jest
      .mocked(notifee.createChannel)
      .mockImplementation(async (c) => c.id);
    const mockRequestPermisssion = jest
      .mocked(notifee.requestPermission)
      .mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      } as NotificationSettings);

    // Mock Block Permission Requests
    const mockGetNotificationSettings = jest
      .mocked(notifee.getNotificationSettings)
      .mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      } as NotificationSettings);

    // Mock Request Permission
    const mockRequestPushNotificationPermission = jest
      .spyOn(NotificationService, 'requestPushNotificationsPermission')
      .mockImplementation(async () => {
        // Do nothing
      });

    return {
      mockCreateChannel,
      mockRequestPermisssion,
      mockGetNotificationSettings,
      mockRequestPushNotificationPermission,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns authorised permission', async () => {
    arrangeMocks();
    const result = await NotificationService.getAllPermissions();
    expect(result.permission).toBe('authorized');
  });

  it('returns denied permission', async () => {
    const mocks = arrangeMocks();
    mocks.mockRequestPermisssion.mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    } as NotificationSettings);
    mocks.mockGetNotificationSettings.mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    } as NotificationSettings);

    const result = await NotificationService.getAllPermissions();
    expect(result.permission).toBe('denied');
  });
});

describe('NotificationService - isDeviceNotificationEnabled', () => {
  const arrangeMocks = () => {
    const mockGetNotificationSettings = jest
      .mocked(notifee.getNotificationSettings)
      .mockResolvedValue({
        authorizationStatus: AuthorizationStatus.AUTHORIZED,
      } as NotificationSettings);

    const mockDispatch = jest.spyOn(store, 'dispatch');

    return { mockGetNotificationSettings, mockDispatch };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches state update on authorisation check', async () => {
    const mocks = arrangeMocks();

    const act = async () => {
      const result = await NotificationService.isDeviceNotificationEnabled();
      return result;
    };

    // Act/Assert - notifee authorised
    expect(await act()).toBe(true);
    expect(mocks.mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ deviceNotificationEnabled: true }),
    );

    mocks.mockGetNotificationSettings.mockReset();
    mocks.mockDispatch.mockReset();
    mocks.mockGetNotificationSettings.mockResolvedValue({
      authorizationStatus: AuthorizationStatus.DENIED,
    } as NotificationSettings);

    // Act/Assert - notifee unauthorised
    expect(await act()).toBe(false);
    expect(mocks.mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ deviceNotificationEnabled: false }),
    );
  });
});

describe('NotificationService - alertPrompt buttons', () => {
  it('resolves when pressing the buttons', () => {
    const mockResolve = jest.fn();
    const result = NotificationService.defaultButtons(mockResolve);

    result[0].onPress();
    expect(mockResolve).toHaveBeenCalledWith(false);

    mockResolve.mockReset();

    result[1].onPress();
    expect(mockResolve).toHaveBeenCalledWith(true);
  });
});

describe('NotificationService - openSystemSettings', () => {
  const arrangeMocks = () => {
    const mockLinkingSettings = jest.spyOn(Linking, 'openSettings');
    const mockNotifeeSettings = jest.spyOn(notifee, 'openNotificationSettings');
    return {
      mockLinkingSettings,
      mockNotifeeSettings,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs IOS settings naviation', async () => {
    const mocks = arrangeMocks();
    await NotificationService.openSystemSettings();
    expect(mocks.mockLinkingSettings).toHaveBeenCalled();
    expect(mocks.mockNotifeeSettings).not.toHaveBeenCalled();
  });

  it('performs Android settings naviation', async () => {
    const mocks = arrangeMocks();
    Platform.OS = 'android';
    await NotificationService.openSystemSettings();
    expect(mocks.mockLinkingSettings).not.toHaveBeenCalled();
    expect(mocks.mockNotifeeSettings).toHaveBeenCalled();
  });
});

describe('NotificationService - handleNotificationPress', () => {
  const arrangeMocks = () => {
    const mockDecrementBadge = jest.spyOn(
      NotificationService,
      'decrementBadgeCount',
    );
    const mockCancelTriggerNotification = jest.spyOn(
      NotificationService,
      'cancelTriggerNotification',
    );
    const mockEvent: EventDetail = {
      notification: {
        id: '1',
      },
    };
    const mockHandler = jest.fn();
    return {
      mockDecrementBadge,
      mockCancelTriggerNotification,
      mockEvent,
      mockHandler,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles pressing a notification', async () => {
    const mocks = arrangeMocks();
    await NotificationService.handleNotificationPress({
      detail: mocks.mockEvent,
      callback: mocks.mockHandler,
    });

    expect(mocks.mockDecrementBadge).toHaveBeenCalled();
    expect(mocks.mockCancelTriggerNotification).toHaveBeenCalled();
    expect(mocks.mockHandler).toHaveBeenCalled();
  });
});

describe('NotificationService - handleNotificationEvent', () => {
  const arrangeMocks = () => {
    const mockIncrementBadge = jest.spyOn(
      NotificationService,
      'incrementBadgeCount',
    );
    const mockDecrementBadge = jest.spyOn(
      NotificationService,
      'decrementBadgeCount',
    );
    const mockCancelTriggerNotification = jest.spyOn(
      NotificationService,
      'cancelTriggerNotification',
    );
    const mockEvent: EventDetail = {
      notification: {
        id: '1',
      },
    };
    const mockHandler = jest.fn();

    return {
      mockIncrementBadge,
      mockDecrementBadge,
      mockCancelTriggerNotification,
      mockEvent,
      mockHandler,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles a notification delivered event', async () => {
    const mocks = arrangeMocks();
    await NotificationService.handleNotificationEvent({
      type: EventType.DELIVERED,
      detail: mocks.mockEvent,
      callback: mocks.mockHandler,
    });

    expect(mocks.mockIncrementBadge).toHaveBeenCalled();
    expect(mocks.mockDecrementBadge).not.toHaveBeenCalled();
  });

  it('handles a notification click event', async () => {
    const mocks = arrangeMocks();
    await NotificationService.handleNotificationEvent({
      type: EventType.PRESS,
      detail: mocks.mockEvent,
      callback: mocks.mockHandler,
    });

    expect(mocks.mockIncrementBadge).not.toHaveBeenCalled();
    expect(mocks.mockDecrementBadge).toHaveBeenCalled();
    expect(mocks.mockCancelTriggerNotification).toHaveBeenCalled();
  });
});

describe('NotificationService - displayNotification', () => {
  const arrangeMocks = () => {
    const mockNotifeeDisplayNotification = jest.spyOn(
      notifee,
      'displayNotification',
    );
    return {
      mockNotifeeDisplayNotification,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls notifee display notification method', async () => {
    const mocks = arrangeMocks();
    const notification = {
      id: 'Test Id',
      title: 'Test Title',
      body: 'Test Body',
      data: { myTestData: 'HelloWorld' },
    };

    await NotificationService.displayNotification(notification);

    expect(mocks.mockNotifeeDisplayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        data: { dataStr: JSON.stringify(notification.data) },
      }),
    );
  });
});
