import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  enableNotifications,
  disableNotifications,
  fetchAccountNotificationSettings,
  disableAccounts,
  enableAccounts,
  toggleFeatureAnnouncements,
  fetchNotifications,
  markNotificationsAsRead,
  enablePushNotifications,
  disablePushNotifications,
  hasNotificationPreferences,
  setMarketingNotificationPreferencesEnabled,
} from '.';
import Engine from '../../../core/Engine';
import { unregisterBrazePush } from '../../../core/Braze/unregisterPush';
import { markBrazePushRegistrationDesired } from '../../../core/Braze/pushRegistrationState';
jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: () => true,
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NotificationServicesController: {
      enableMetamaskNotifications: jest.fn(),
      disableNotificationServices: jest.fn(),
      checkAccountsPresence: jest.fn(),
      disableAccounts: jest.fn(),
      enableAccounts: jest.fn(),
      createOnChainTriggers: jest.fn(),
      setFeatureAnnouncementsEnabled: jest.fn(),
      setPerpsNotificationsEnabled: jest.fn(),
      fetchAndUpdateMetamaskNotifications: jest.fn(),
      markMetamaskNotificationsAsRead: jest.fn(),
      enablePushNotifications: jest.fn(),
      disablePushNotifications: jest.fn(),
    },
    NotificationServicesPushController: {
      state: {
        fcmToken: '',
      },
    },
  },
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../core/Braze/unregisterPush', () => ({
  unregisterBrazePush: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../core/Braze/pushRegistrationState', () => ({
  markBrazePushRegistrationDesired: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.mocked(unregisterBrazePush).mockResolvedValue(true);
  Engine.context.NotificationServicesPushController.state.fcmToken = '';
});

describe('helpers - enableNotificationServices()', () => {
  it('invoke notification services method', async () => {
    await enableNotifications();

    expect(markBrazePushRegistrationDesired).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalled();
  });

  it('passes marketing consent to notification services method', async () => {
    const options = { hasMarketingConsent: true };

    await enableNotifications(options);

    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalledWith(options);
  });

  it('forwards enable notification options', async () => {
    await enableNotifications({ registerPushNotifications: false });

    expect(markBrazePushRegistrationDesired).not.toHaveBeenCalled();
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalledWith({ registerPushNotifications: false });
  });

  it('enables NaaP when Braze registration-state persistence fails', async () => {
    jest
      .mocked(markBrazePushRegistrationDesired)
      .mockRejectedValue(new Error('Storage unavailable'));

    await enableNotifications();

    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalledTimes(1);
  });
});

describe('helpers - hasNotificationPreferences()', () => {
  it('returns true when AUS preferences exist', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue({
      walletActivity: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        accounts: [],
      },
    });

    await expect(hasNotificationPreferences()).resolves.toBe(true);
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:getNotificationPreferences',
    );
  });

  it('returns false when AUS preferences are missing', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(null);

    await expect(hasNotificationPreferences()).resolves.toBe(false);
  });
});

describe('helpers - setMarketingNotificationPreferencesEnabled()', () => {
  it('updates marketing notification preferences when AUS preferences exist', async () => {
    const preferences = {
      walletActivity: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        accounts: [],
      },
      marketing: {
        inAppNotificationsEnabled: false,
        pushNotificationsEnabled: false,
      },
      perps: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      },
      socialAI: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        txAmountLimit: 500,
        mutedTraderProfileIds: [],
      },
    };
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(preferences);

    await setMarketingNotificationPreferencesEnabled(true);

    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:getNotificationPreferences',
    );
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:putNotificationPreferences',
      {
        ...preferences,
        marketing: {
          inAppNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
      },
      'mobile',
    );
  });

  it('does not persist when AUS preferences are missing', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(null);

    await setMarketingNotificationPreferencesEnabled(true);

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:getNotificationPreferences',
    );
  });
});

describe('helpers - disableNotificationServices()', () => {
  it('unregisters Braze directly before global disable without an FCM token', async () => {
    await disableNotifications();

    expect(unregisterBrazePush).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.NotificationServicesController.disableNotificationServices,
    ).toHaveBeenCalledTimes(1);
  });

  it('delegates Braze unregistration to global disable with an FCM token', async () => {
    Engine.context.NotificationServicesPushController.state.fcmToken =
      'fcm-token';

    await disableNotifications();

    expect(unregisterBrazePush).not.toHaveBeenCalled();
    expect(
      Engine.context.NotificationServicesController.disableNotificationServices,
    ).toHaveBeenCalledTimes(1);
  });
});

describe('helpers - checkAccountsPresence()', () => {
  it('invoke notification services method', async () => {
    const accounts = ['0xAddr1', '0xAddr2', '0xAddr3'];
    await fetchAccountNotificationSettings(accounts);
    expect(
      Engine.context.NotificationServicesController.checkAccountsPresence,
    ).toHaveBeenCalledWith(accounts);
  });
});

describe('helpers - disableAccounts()', () => {
  it('invoke notification services method', async () => {
    const accounts = ['0xAddr1', '0xAddr2', '0xAddr3'];
    await disableAccounts(accounts);
    expect(
      Engine.context.NotificationServicesController.disableAccounts,
    ).toHaveBeenCalledWith(accounts);
  });
});

describe('helpers - enableAccounts()', () => {
  it('invoke notification services method', async () => {
    const accounts = ['0xAddr1', '0xAddr2', '0xAddr3'];
    await enableAccounts(accounts);
    expect(
      Engine.context.NotificationServicesController.enableAccounts,
    ).toHaveBeenCalledWith(accounts);
  });
});

describe('helpers - setFeatureAnnouncementsEnabled()', () => {
  it('invoke notification services method', async () => {
    await toggleFeatureAnnouncements(true);
    expect(
      Engine.context.NotificationServicesController
        .setFeatureAnnouncementsEnabled,
    ).toHaveBeenCalled();
  });
});

describe('helpers - fetchAndUpdateMetamaskNotifications()', () => {
  it('invoke notification services method', async () => {
    await fetchNotifications();
    expect(
      Engine.context.NotificationServicesController
        .fetchAndUpdateMetamaskNotifications,
    ).toHaveBeenCalled();
  });
});

describe('helpers - markMetamaskNotificationsAsRead()', () => {
  it('invoke notification services method', async () => {
    const readNotifications = [
      { id: '1', isRead: true, type: TRIGGER_TYPES.ETH_SENT },
    ];
    await markNotificationsAsRead(readNotifications);
    expect(
      Engine.context.NotificationServicesController
        .markMetamaskNotificationsAsRead,
    ).toHaveBeenCalledWith(readNotifications);
  });
});

describe('helpers - enablePushNotifications()', () => {
  it('invoke notification services method', async () => {
    await enablePushNotifications();

    expect(markBrazePushRegistrationDesired).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.NotificationServicesController.enablePushNotifications,
    ).toHaveBeenCalled();
  });

  it('enables NaaP push when Braze registration-state persistence fails', async () => {
    jest
      .mocked(markBrazePushRegistrationDesired)
      .mockRejectedValue(new Error('Storage unavailable'));

    await enablePushNotifications();

    expect(
      Engine.context.NotificationServicesController.enablePushNotifications,
    ).toHaveBeenCalledTimes(1);
  });
});

describe('helpers - disablePushNotifications()', () => {
  it('unregisters Braze directly when NaaP has no FCM token', async () => {
    await disablePushNotifications();

    expect(unregisterBrazePush).toHaveBeenCalled();
    expect(
      Engine.context.NotificationServicesController.disablePushNotifications,
    ).toHaveBeenCalled();
    expect(
      jest.mocked(unregisterBrazePush).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(
        Engine.context.NotificationServicesController.disablePushNotifications,
      ).mock.invocationCallOrder[0],
    );
  });

  it('delegates Braze unregistration to token deletion when FCM has a token', async () => {
    Engine.context.NotificationServicesPushController.state.fcmToken =
      'fcm-token';

    await disablePushNotifications();

    expect(unregisterBrazePush).not.toHaveBeenCalled();
    expect(
      Engine.context.NotificationServicesController.disablePushNotifications,
    ).toHaveBeenCalled();
  });

  it('continues disabling NaaP when Braze unregistration remains pending', async () => {
    jest.mocked(unregisterBrazePush).mockResolvedValueOnce(false);

    await disablePushNotifications();

    expect(
      Engine.context.NotificationServicesController.disablePushNotifications,
    ).toHaveBeenCalledTimes(1);
  });
});
