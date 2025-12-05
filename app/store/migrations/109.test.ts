import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate from './109';
import {
  AGREED,
  DENIED,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
  ANALYTICS_ID,
  ANALYTICS_OPTED_IN,
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

const migrationVersion = 109;

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
          'Migration 109: Failed to read legacy storage values',
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
    // Legacy keys were cleaned up
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates opt-in from METRICS_OPT_IN AGREED to new MMKV key as true', async () => {
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
      if (key === ANALYTICS_ID || key === ANALYTICS_OPTED_IN) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    await migrate(state);

    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_OPTED_IN,
      'true',
      { emitEvent: false },
    );
  });

  it('migrates opt-in from METRICS_OPT_IN DENIED to new MMKV key as false', async () => {
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
      if (key === ANALYTICS_ID || key === ANALYTICS_OPTED_IN) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    await migrate(state);

    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_OPTED_IN,
      'false',
      { emitEvent: false },
    );
  });

  it('uses MIXPANEL_METAMETRICS_ID as fallback when METAMETRICS_ID is null', async () => {
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

    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      ANALYTICS_ID,
      analyticsId,
      { emitEvent: false },
    );
  });

  it('does not overwrite existing new MMKV keys', async () => {
    const state = createValidState();
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
      if (key === ANALYTICS_OPTED_IN) {
        return Promise.resolve('true'); // New key already has value
      }
      return Promise.resolve(null);
    });

    await migrate(state);

    // setItem should not be called for keys that already exist
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      ANALYTICS_ID,
      expect.any(String),
      expect.any(Object),
    );
    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      ANALYTICS_OPTED_IN,
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

    await migrate(state);

    expect(mockedStorageWrapper.setItem).not.toHaveBeenCalledWith(
      ANALYTICS_OPTED_IN,
      expect.any(String),
      expect.any(Object),
    );
  });

  it('cleans up legacy storage keys after migration', async () => {
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
      return Promise.resolve(null);
    });

    await migrate(state);

    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METRICS_OPT_IN,
    );
  });

  it('continues migration even when cleanup fails', async () => {
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
      return Promise.resolve(null);
    });
    mockedStorageWrapper.removeItem.mockRejectedValue(
      new Error('Cleanup failed'),
    );

    const migratedState = await migrate(state);

    // Migration completed successfully despite cleanup failure
    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.setItem).toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
