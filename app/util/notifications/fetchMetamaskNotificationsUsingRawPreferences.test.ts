import { processNotification } from '@metamask/notification-services-controller/notification-services';
import { createMockNotificationEthSent } from '@metamask/notification-services-controller/notification-services/mocks';
import Engine from '../../core/Engine';
import {
  getEnabledWalletActivityAddresses,
  readValidatedNotificationPreferences,
} from './ensureAgenticCliNotificationPreferencesMigrated';
import { isAgenticCliInAppNotificationsEnabled } from './agenticCliNotificationFilter';
import { supplementNotificationsFromRawPreferences } from './fetchMetamaskNotificationsUsingRawPreferences';
import { updateNotificationServicesControllerState } from './updateNotificationServicesControllerState';

jest.mock('./updateNotificationServicesControllerState', () => ({
  updateNotificationServicesControllerState: jest.fn(),
}));

jest.mock('./ensureAgenticCliNotificationPreferencesMigrated', () => ({
  getEnabledWalletActivityAddresses: jest.fn(),
  readValidatedNotificationPreferences: jest.fn(),
}));

jest.mock('./agenticCliNotificationFilter', () => ({
  isAgenticCliInAppNotificationsEnabled: jest.fn(),
  applyAgenticCliInAppInboxFilterToController: jest
    .fn()
    .mockResolvedValue(undefined),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: jest.fn(),
    },
    NotificationServicesController: {
      state: {
        isNotificationServicesEnabled: true,
        metamaskNotificationsList: [],
        metamaskNotificationsReadList: [],
      },
      update: jest.fn(),
    },
  },
}));

describe('supplementNotificationsFromRawPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.AuthenticationController.getBearerToken)
      .mockResolvedValue('test-token');
    jest.mocked(readValidatedNotificationPreferences).mockResolvedValue(null);
    jest
      .mocked(getEnabledWalletActivityAddresses)
      .mockResolvedValue(['0xce03907cc8ea856a3738407e9968794919fd4374']);
    jest.mocked(isAgenticCliInAppNotificationsEnabled).mockResolvedValue(true);
    global.fetch = jest.fn();
  });

  it('does nothing when notifications are globally disabled', async () => {
    Engine.context.NotificationServicesController.state.isNotificationServicesEnabled = false;

    await supplementNotificationsFromRawPreferences();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('filters inbox and skips fetch when agentic in-app is disabled', async () => {
    Engine.context.NotificationServicesController.state.isNotificationServicesEnabled = true;
    jest.mocked(isAgenticCliInAppNotificationsEnabled).mockResolvedValue(false);

    await supplementNotificationsFromRawPreferences();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      jest.requireMock('./agenticCliNotificationFilter')
        .applyAgenticCliInAppInboxFilterToController,
    ).toHaveBeenCalled();
  });

  it('fetches notifications from the API when validated GET fails', async () => {
    Engine.context.NotificationServicesController.state.isNotificationServicesEnabled = true;

    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'agentic-1',
          notification_type: 'platform',
          created_at: '2026-06-01T00:00:00.000Z',
          data: {
            title: 'Agentic CLI',
            description: 'Test notification',
          },
        },
      ],
    } as Response);

    await supplementNotificationsFromRawPreferences();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(updateNotificationServicesControllerState).toHaveBeenCalled();
  });

  it('skips supplement when validated preferences already produced on-chain items', async () => {
    jest.mocked(readValidatedNotificationPreferences).mockResolvedValueOnce({
      walletActivity: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        accounts: [
          {
            address: '0xce03907cc8ea856a3738407e9968794919fd4374',
            enabled: true,
          },
        ],
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
        mutedTraderProfileIds: [],
      },
      agenticCli: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      },
    });

    Engine.context.NotificationServicesController.state.metamaskNotificationsList =
      [processNotification(createMockNotificationEthSent())];

    await supplementNotificationsFromRawPreferences();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
