import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  enableNotifications,
  disableNotifications,
  fetchAccountNotificationSettings,
  disableAccounts,
  enableAccounts,
  resetNotifications,
  toggleFeatureAnnouncements,
  togglePerpsNotifications,
  fetchNotifications,
  markNotificationsAsRead,
  enablePushNotifications,
  disablePushNotifications,
} from '.';
import Engine from '../../../core/Engine';

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
  },
}));

describe('helpers - enableNotificationServices()', () => {
  it('invoke notification services method', async () => {
    await enableNotifications();
    expect(
      Engine.context.NotificationServicesController.enableMetamaskNotifications,
    ).toHaveBeenCalled();
  });
});

describe('helpers - disableNotificationServices()', () => {
  it('invoke notification services method', async () => {
    await disableNotifications();
    expect(
      Engine.context.NotificationServicesController.disableNotificationServices,
    ).toHaveBeenCalled();
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

describe('helpers - createOnChainTriggersByAccount()', () => {
  it('invoke notification services method', async () => {
    await resetNotifications();
    expect(
      Engine.context.NotificationServicesController.createOnChainTriggers,
    ).toHaveBeenCalled();
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
    expect(
      Engine.context.NotificationServicesController.enablePushNotifications,
    ).toHaveBeenCalled();
  });
});

describe('helpers - disablePushNotifications()', () => {
  it('invoke notification services method', async () => {
    await disablePushNotifications();
    expect(
      Engine.context.NotificationServicesController.disablePushNotifications,
    ).toHaveBeenCalled();
  });
});

describe('helpers - togglePerpsNotifications()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enable perps notifications when passed true', async () => {
    const NotificationServicesController =
      Engine.context.NotificationServicesController;
    await togglePerpsNotifications(true);
    expect(
      // @ts-expect-error - setPerpsNotificationsEnabled not yet implemented in @metamask/notification-services-controller
      NotificationServicesController.setPerpsNotificationsEnabled,
    ).toHaveBeenCalledWith(true);
  });

  it('should disable perps notifications when passed false', async () => {
    const NotificationServicesController =
      Engine.context.NotificationServicesController;
    await togglePerpsNotifications(false);
    expect(
      // @ts-expect-error - setPerpsNotificationsEnabled not yet implemented in @metamask/notification-services-controller
      NotificationServicesController.setPerpsNotificationsEnabled,
    ).toHaveBeenCalledWith(false);
  });
});
