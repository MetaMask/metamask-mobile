import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate from './110';
import {
  AGREED,
  DENIED,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
  ANALYTICS_ID,
} from '../../constants/storage';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

const migrationVersion = 110;

const createValidState = () => ({
  engine: {
    backgroundState: {},
  },
});

const createValidUUIDv4 = () => 'f2673eb8-db32-40bb-88a5-97cf5107d31d';

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorageWrapper.getItem.mockResolvedValue(null);
    mockedStorageWrapper.setItem.mockResolvedValue(undefined);
    mockedStorageWrapper.removeItem.mockResolvedValue(undefined);
  });

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
  });

  it('returns state unchanged and captures exception when storage read fails', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    const storageError = new Error('Storage read failed');
    mockedStorageWrapper.getItem.mockRejectedValue(storageError);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 110: Failed to read legacy storage values',
        ),
      }),
    );
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it('migrates analytics ID from METAMETRICS_ID to new MMKV key', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === ANALYTICS_ID) {
        return Promise.resolve(null); // New key doesn't exist yet
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    // State is returned unchanged (migration only affects MMKV)
    expect(migratedState).toStrictEqual(state);
    // Analytics ID was written to new key
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      analyticsId,
      { emitEvent: false },
    );
    // MIXPANEL_METAMETRICS_ID is deleted (already deprecated)
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    // METAMETRICS_ID is kept (MetaMetrics still uses it)
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalledWith(
      METAMETRICS_ID,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates opt-in from METRICS_OPT_IN AGREED to AnalyticsController state', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(AGREED);
      }
      if (key === ANALYTICS_ID) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    const migratedState = (await migrate(state)) as {
      engine: {
        backgroundState: {
          AnalyticsController?: { optedIn: boolean };
        };
      };
    };

    expect(migratedState.engine.backgroundState.AnalyticsController).toEqual({
      optedIn: true,
    });
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      expect.stringContaining('OptedIn'),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('migrates opt-in from METRICS_OPT_IN DENIED to AnalyticsController state', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(DENIED);
      }
      if (key === ANALYTICS_ID) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    const migratedState = (await migrate(state)) as {
      engine: {
        backgroundState: {
          AnalyticsController?: { optedIn: boolean };
        };
      };
    };

    expect(migratedState.engine.backgroundState.AnalyticsController).toEqual({
      optedIn: false,
    });
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      expect.stringContaining('OptedIn'),
      expect.any(String),
      expect.any(Object),
    );
  });

  it('uses MIXPANEL_METAMETRICS_ID as fallback when METAMETRICS_ID is null and deletes it', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(null);
      }
      if (key === MIXPANEL_METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === ANALYTICS_ID) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    await migrate(state);

    // Analytics ID was migrated from MIXPANEL_METAMETRICS_ID
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      analyticsId,
      { emitEvent: false },
    );
    // MIXPANEL_METAMETRICS_ID is deleted after migration
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
  });

  it('does not overwrite existing AnalyticsController state', async () => {
    const state = {
      engine: {
        backgroundState: {
          AnalyticsController: {
            optedIn: true,
          },
        },
      },
    };
    const legacyId = createValidUUIDv4();
    const existingId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(legacyId);
      }
      if (key === ANALYTICS_ID) {
        return Promise.resolve(existingId); // New key already has value
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(DENIED); // Would migrate to false, but should not overwrite
      }
      return Promise.resolve(null);
    });

    const migratedState = (await migrate(state)) as typeof state;

    // optedIn should remain true (not overwritten)
    expect(
      migratedState.engine.backgroundState.AnalyticsController.optedIn,
    ).toBe(true);
    // setItem should not be called for analytics ID that already exists
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      ANALYTICS_ID,
      expect.any(String),
      expect.any(Object),
    );
  });

  it('skips analytics ID migration for invalid UUID', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve('invalid-id');
      }
      return Promise.resolve(null);
    });

    await migrate(state);

    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      ANALYTICS_ID,
      expect.any(String),
      expect.any(Object),
    );
  });

  it('skips opt-in migration for invalid values', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve('invalid-value');
      }
      return Promise.resolve(null);
    });

    const migratedState = (await migrate(state)) as {
      engine: {
        backgroundState: {
          AnalyticsController?: { optedIn: boolean };
        };
      };
    };

    // AnalyticsController should not be created for invalid opt-in values
    expect(
      migratedState.engine.backgroundState.AnalyticsController,
    ).toBeUndefined();
  });

  it('deletes MIXPANEL_METAMETRICS_ID but keeps METAMETRICS_ID after migration', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(AGREED);
      }
      if (key === ANALYTICS_ID) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    const migratedState = (await migrate(state)) as {
      engine: {
        backgroundState: {
          AnalyticsController?: { optedIn: boolean };
        };
      };
    };

    // MIXPANEL_METAMETRICS_ID is deleted (already deprecated)
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    // METAMETRICS_ID is kept (MetaMetrics still uses it)
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalledWith(
      METAMETRICS_ID,
    );
    // METRICS_OPT_IN is kept (backward compatibility)
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalledWith(
      METRICS_OPT_IN,
    );
    // Analytics ID was migrated to new key
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      analyticsId,
      { emitEvent: false },
    );
    // Opt-in was migrated to AnalyticsController state
    expect(migratedState.engine.backgroundState.AnalyticsController).toEqual({
      optedIn: true,
    });
  });
});
