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
  shouldSuppressAgenticCliInAppDelivery,
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
    clearLocalAgenticCliPreference();
  });

  it('detects Agentic CLI text with spaces and underscores', () => {
    expect(textIndicatesAgenticCli('Agentic CLI')).toBe(true);
    expect(textIndicatesAgenticCli('agentic_cli_update')).toBe(true);
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

  it('suppresses in-app delivery when in-app notifications are disabled', () => {
    const notification = {
      id: '1',
      type: TRIGGER_TYPES.PLATFORM,
      template: { title: 'Agentic CLI', body: 'Update' },
    } as INotification;

    expect(
      shouldSuppressAgenticCliInAppDelivery(notification, {
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: false,
      }),
    ).toBe(true);
  });
});
