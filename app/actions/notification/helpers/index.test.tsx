import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  enableNotifications,
  disableNotifications,
  fetchAccountNotificationSettings,
  disableAccounts,
  enableAccounts,
  resetNotifications,
  toggleFeatureAnnouncements,
  fetchNotifications,
  markNotificationsAsRead,
  enablePushNotifications,
  disablePushNotifications,
  type setContentPreviewToken as setContentPreviewTokenFn,
  type getContentPreviewToken as getContentPreviewTokenFn,
  type subscribeToContentPreviewToken as subscribeToContentPreviewTokenFn,
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

describe('Content Preview Token', () => {
  let setContentPreviewToken: typeof setContentPreviewTokenFn;
  let getContentPreviewToken: typeof getContentPreviewTokenFn;
  let subscribeToContentPreviewToken: typeof subscribeToContentPreviewTokenFn;

  beforeEach(() => {
    // Reset module per test as we are modifying a local variable in this module
    jest.isolateModules(() => {
      const HelpersModule = jest.requireActual('./index');
      setContentPreviewToken = HelpersModule.setContentPreviewToken;
      getContentPreviewToken = HelpersModule.getContentPreviewToken;
      subscribeToContentPreviewToken =
        HelpersModule.subscribeToContentPreviewToken;
    });
  });

  it('sets the preview token when given a valid string', () => {
    const token = 'preview-token-123';
    setContentPreviewToken(token);
    expect(getContentPreviewToken()).toBe(token);
  });

  it('does not set the preview token when given null', () => {
    setContentPreviewToken('initial-token');
    setContentPreviewToken(null);
    expect(getContentPreviewToken()).toBe('initial-token');
  });

  it('does not set the preview token when given undefined', () => {
    setContentPreviewToken('initial-token');
    setContentPreviewToken(undefined);
    expect(getContentPreviewToken()).toBe('initial-token');
  });

  it('initial get token will return undefined', () => {
    expect(getContentPreviewToken()).toBeUndefined();
  });

  it('emits event when token is updated, and event is not received when unsubscribing', () => {
    const mockCallback = jest.fn();
    const unsubscribe = subscribeToContentPreviewToken(mockCallback);

    // Call 1 - assert token update
    setContentPreviewToken('token1');
    expect(mockCallback).toHaveBeenCalledWith('token1');

    // Call 2 - assert no token update
    mockCallback.mockClear();
    setContentPreviewToken(null);
    expect(getContentPreviewToken()).toBe('token1'); // previous token not removed
    expect(mockCallback).not.toHaveBeenCalled();

    // Call 2 - assert listener removed
    mockCallback.mockClear();
    unsubscribe();
    setContentPreviewToken('token2');
    expect(getContentPreviewToken()).toBe('token2'); // new token added
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
