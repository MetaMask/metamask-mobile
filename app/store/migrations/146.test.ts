import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate from './146';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  getAllKeys: jest.fn(),
  getItemSync: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

const PREFIX = 'rewards_campaign_reminder_subscribed::';

const arrangeStorage = (entries: Record<string, string>) => {
  mockedStorageWrapper.getAllKeys.mockResolvedValue(Object.keys(entries));
  mockedStorageWrapper.getItemSync.mockImplementation(
    (key: string) => entries[key] ?? null,
  );
  mockedStorageWrapper.removeItem.mockResolvedValue(undefined);
};

describe('Migration 146: carry campaign reminder subscriptions from MMKV to Redux', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged when ensureValidState fails', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getAllKeys).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged and skips storage when the rewards slice is absent', async () => {
    const state = { engine: { backgroundState: {} } };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getAllKeys).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it('carries subscribed reminders into Redux and deletes the legacy keys', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: { subscribedCampaignReminders: {} },
    };
    mockedEnsureValidState.mockReturnValue(true);
    arrangeStorage({
      [`${PREFIX}sub-1:camp-1`]: '1',
      [`${PREFIX}sub-2:camp-2`]: '1',
      unrelated_key: 'noop',
    });

    const migratedState = (await migrate(state)) as typeof state;

    expect(migratedState.rewards.subscribedCampaignReminders).toEqual({
      'sub-1:camp-1': true,
      'sub-2:camp-2': true,
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      `${PREFIX}sub-1:camp-1`,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      `${PREFIX}sub-2:camp-2`,
    );
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalledWith(
      'unrelated_key',
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('ignores legacy keys whose value is not the subscribed marker', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: { subscribedCampaignReminders: {} },
    };
    mockedEnsureValidState.mockReturnValue(true);
    arrangeStorage({
      [`${PREFIX}sub-1:camp-1`]: '1',
      [`${PREFIX}sub-3:camp-3`]: '0',
      [`${PREFIX}sub-4:camp-4`]: '',
    });

    const migratedState = (await migrate(state)) as typeof state;

    expect(migratedState.rewards.subscribedCampaignReminders).toEqual({
      'sub-1:camp-1': true,
    });
    // Every matching legacy key is cleaned up regardless of its value.
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(3);
  });

  it('preserves reminders already present in Redux', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: {
        subscribedCampaignReminders: { 'sub-existing:camp-existing': true },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);
    arrangeStorage({ [`${PREFIX}sub-1:camp-1`]: '1' });

    const migratedState = (await migrate(state)) as typeof state;

    expect(migratedState.rewards.subscribedCampaignReminders).toEqual({
      'sub-existing:camp-existing': true,
      'sub-1:camp-1': true,
    });
  });

  it('initializes the reminders map when it is missing on the rewards slice', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: {},
    };
    mockedEnsureValidState.mockReturnValue(true);
    arrangeStorage({ [`${PREFIX}sub-1:camp-1`]: '1' });

    const migratedState = (await migrate(state)) as {
      rewards: { subscribedCampaignReminders: Record<string, boolean> };
    };

    expect(migratedState.rewards.subscribedCampaignReminders).toEqual({
      'sub-1:camp-1': true,
    });
  });

  it('no-ops without writing or deleting when there are no legacy keys', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: { subscribedCampaignReminders: {} },
    };
    mockedEnsureValidState.mockReturnValue(true);
    arrangeStorage({ some_other_key: '1' });

    const migratedState = (await migrate(state)) as typeof state;

    expect(migratedState.rewards.subscribedCampaignReminders).toEqual({});
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('still carries data over when an individual key deletion fails', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: { subscribedCampaignReminders: {} },
    };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getAllKeys.mockResolvedValue([
      `${PREFIX}sub-1:camp-1`,
    ]);
    mockedStorageWrapper.getItemSync.mockReturnValue('1');
    mockedStorageWrapper.removeItem.mockRejectedValue(new Error('delete boom'));

    const migratedState = (await migrate(state)) as typeof state;

    expect(migratedState.rewards.subscribedCampaignReminders).toEqual({
      'sub-1:camp-1': true,
    });
    // Per-key deletion failures are swallowed, so the migration still succeeds.
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures the exception and returns state unchanged when reading keys throws', async () => {
    const state = {
      engine: { backgroundState: {} },
      rewards: { subscribedCampaignReminders: {} },
    };
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getAllKeys.mockRejectedValue(new Error('read boom'));

    const migratedState = (await migrate(state)) as typeof state;

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 146: Failed to migrate campaign reminder subscriptions',
        ),
      }),
    );
  });
});
