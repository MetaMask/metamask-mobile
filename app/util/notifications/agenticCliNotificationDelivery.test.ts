import {
  TRIGGER_TYPES,
  type INotification,
} from '@metamask/notification-services-controller/notification-services';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Engine from '../../core/Engine';
import {
  clearLocalAgenticCliPreference,
  persistLocalAgenticCliPreference,
} from './agenticCliNotificationPreferences';
import {
  notificationIndicatesAgenticCli,
  remoteMessageIndicatesAgenticCli,
  shouldHideNewAgenticCliInAppNotification,
  shouldSuppressAgenticCliPushDelivery,
  textIndicatesAgenticCli,
} from './agenticCliNotificationDelivery';

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

const GET_ACTION = 'AuthenticatedUserStorageService:getNotificationPreferences';

const basePreferences = {
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [],
  },
  marketing: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  perps: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  },
  socialAI: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    txAmountLimit: 100,
    mutedTraderProfileIds: [],
  },
};

describe('agenticCliNotificationDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(Engine.controllerMessenger.call).mockReset();
    clearLocalAgenticCliPreference();
  });

  it('detects Agentic CLI text with spaces and underscores', () => {
    expect(textIndicatesAgenticCli('Agentic CLI')).toBe(true);
    expect(textIndicatesAgenticCli('agentic_cli_update')).toBe(true);
    expect(textIndicatesAgenticCli('Agentic test notification')).toBe(true);
    expect(textIndicatesAgenticCli('Wallet Activity')).toBe(false);
  });

  it('detects agentic CLI platform notifications by title', () => {
    const notification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: {
        title: 'Agentic CLI',
        body: 'Your session completed',
      },
    } as INotification;

    expect(notificationIndicatesAgenticCli(notification)).toBe(true);
  });

  it('detects agentic test notifications by title and CTA', () => {
    const byTitle = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: {
        title: 'Agentic test notification',
        body: 'Hello, dashboard',
      },
    } as INotification;

    const byCta = {
      id: '2',
      type: TRIGGER_TYPES.PLATFORM,
      template: {
        title: 'Transaction ready',
        body: 'Review required',
        cta: { label: 'Review Agentic Transaction' },
      },
    } as INotification;

    expect(notificationIndicatesAgenticCli(byTitle)).toBe(true);
    expect(notificationIndicatesAgenticCli(byCta)).toBe(true);
  });

  it('detects agentic CLI remote messages from metadata kind', () => {
    const payload = {
      data: {
        metadata: JSON.stringify({ kind: 'agentic_cli_update' }),
      },
    } as FirebaseMessagingTypes.RemoteMessage;

    expect(remoteMessageIndicatesAgenticCli(payload)).toBe(true);
  });

  it('suppresses push delivery when push notifications are disabled', async () => {
    persistLocalAgenticCliPreference({
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: true,
    });

    const notification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: { title: 'Agentic CLI', body: 'Update' },
    } as INotification;

    await expect(
      shouldSuppressAgenticCliPushDelivery(notification),
    ).resolves.toBe(true);
  });

  it('allows push delivery when push notifications are enabled', async () => {
    persistLocalAgenticCliPreference({
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    });

    const notification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: { title: 'Agentic CLI', body: 'Update' },
    } as INotification;

    await expect(
      shouldSuppressAgenticCliPushDelivery(notification),
    ).resolves.toBe(false);
  });

  it('uses API preferences when agenticCli is returned from storage', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue({
      ...basePreferences,
      agenticCli: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
    });

    const notification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: { title: 'Agentic CLI', body: 'Update' },
    } as INotification;

    await expect(
      shouldSuppressAgenticCliPushDelivery(notification),
    ).resolves.toBe(true);
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(GET_ACTION);
  });

  it('does not suppress non-agentic notifications', async () => {
    persistLocalAgenticCliPreference({
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
    });

    const notification = {
      id: '1',
      type: TRIGGER_TYPES.ETH_RECEIVED,
    } as INotification;

    await expect(
      shouldSuppressAgenticCliPushDelivery(notification),
    ).resolves.toBe(false);
  });

  it('keeps historical agentic notifications visible after in-app is turned off', () => {
    const disabledAt = Date.now();
    const historicalNotification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      createdAt: String(disabledAt - 60_000),
      template: { title: 'Agentic test notification', body: 'Hello' },
    } as INotification;

    expect(
      shouldHideNewAgenticCliInAppNotification(
        historicalNotification,
        {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: false,
        },
        disabledAt,
      ),
    ).toBe(false);
  });

  it('hides only new agentic notifications after in-app is turned off', () => {
    const disabledAt = Date.now();
    const newNotification = {
      id: '2',
      type: TRIGGER_TYPES.PLATFORM,
      createdAt: String(disabledAt + 1_000),
      template: { title: 'Agentic test notification', body: 'Hello' },
    } as INotification;

    expect(
      shouldHideNewAgenticCliInAppNotification(
        newNotification,
        {
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: false,
        },
        disabledAt,
      ),
    ).toBe(true);
  });

  it('allows push delivery when only in-app notifications are disabled', async () => {
    jest
      .mocked(Engine.controllerMessenger.call)
      .mockResolvedValue(basePreferences);

    persistLocalAgenticCliPreference({
      pushNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
    });

    const notification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: { title: 'Agentic test notification', body: 'Hello' },
    } as INotification;

    await expect(
      shouldSuppressAgenticCliPushDelivery(notification),
    ).resolves.toBe(false);
  });
});
