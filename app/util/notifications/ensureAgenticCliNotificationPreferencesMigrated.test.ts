import { DEFAULT_AGENTIC_CLI_PREFERENCES } from '@metamask/notification-services-controller';
import Engine from '../../core/Engine';
import ReactQueryService from '../../core/ReactQueryService';
import {
  enableAgenticCliNotificationsIfDisabled,
  ensureAgenticCliNotificationPreferencesMigrated,
} from './ensureAgenticCliNotificationPreferencesMigrated';

jest.mock(
  '../../core/Engine/controllers/authenticated-user-storage-service-init',
  () => ({
    getAuthenticatedUserStorageEnvironment: () => 'dev',
  }),
);

jest.mock('../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    },
  },
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: jest.fn(),
    },
  },
  controllerMessenger: {
    call: jest.fn(),
  },
}));

const legacyPreferences = {
  walletActivity: {
    inAppNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    accounts: [{ address: '0xabc', enabled: false }],
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
};

describe('ensureAgenticCliNotificationPreferencesMigrated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.AuthenticationController.getBearerToken)
      .mockResolvedValue('test-token');
    jest
      .mocked(ReactQueryService.queryClient.getQueryData)
      .mockReturnValue(undefined);
    global.fetch = jest.fn();
  });

  it('does nothing when validated preferences already include agenticCli', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValueOnce({
      ...legacyPreferences,
      agenticCli: DEFAULT_AGENTIC_CLI_PREFERENCES,
    });

    await ensureAgenticCliNotificationPreferencesMigrated();

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('backfills agenticCli when validated GET fails but raw blob exists', async () => {
    jest
      .mocked(Engine.controllerMessenger.call)
      .mockRejectedValueOnce(new Error('validation failed'));

    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => legacyPreferences,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    await ensureAgenticCliNotificationPreferencesMigrated();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/preferences/notifications'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          ...legacyPreferences,
          agenticCli: DEFAULT_AGENTIC_CLI_PREFERENCES,
        }),
      }),
    );
    expect(ReactQueryService.queryClient.setQueryData).toHaveBeenCalledWith(
      ['AuthenticatedUserStorageService:getNotificationPreferences'],
      {
        ...legacyPreferences,
        agenticCli: DEFAULT_AGENTIC_CLI_PREFERENCES,
      },
    );
  });

  it('does nothing when no preferences exist yet', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValueOnce(null);

    jest.mocked(global.fetch).mockResolvedValueOnce({
      status: 404,
    } as Response);

    await ensureAgenticCliNotificationPreferencesMigrated();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
  });
});

describe('enableAgenticCliNotificationsIfDisabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Engine.context.AuthenticationController.getBearerToken)
      .mockResolvedValue('test-token');
    jest
      .mocked(ReactQueryService.queryClient.getQueryData)
      .mockReturnValue(undefined);
    global.fetch = jest.fn();
  });

  it('does nothing when agentic CLI notifications are already enabled', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue({
      ...legacyPreferences,
      agenticCli: {
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      },
    });

    const enabled = await enableAgenticCliNotificationsIfDisabled();

    expect(enabled).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('enables push and in-app agentic CLI notifications when either is disabled', async () => {
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue({
      ...legacyPreferences,
      agenticCli: {
        inAppNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      },
    });

    jest.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const enabled = await enableAgenticCliNotificationsIfDisabled();

    expect(enabled).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/preferences/notifications'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          ...legacyPreferences,
          agenticCli: {
            inAppNotificationsEnabled: true,
            pushNotificationsEnabled: true,
          },
        }),
      }),
    );
  });
});
