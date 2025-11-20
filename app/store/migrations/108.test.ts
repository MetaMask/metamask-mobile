import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';
import migrate from './108';
import {
  AGREED,
  DENIED,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  METRICS_OPT_IN_SOCIAL_LOGIN,
  MIXPANEL_METAMETRICS_ID,
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
    removeItem: jest.fn(),
  },
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

const migrationVersion = 108;

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

  it('returns state unchanged if AnalyticsController already exists', async () => {
    const state = {
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId: 'existing-id',
            optedInForRegularAccount: true,
            optedInForSocialAccount: false,
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when analytics ID is null', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue(null);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when analytics ID is not valid UUIDv4', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('invalid-id');

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when both METAMETRICS_ID and MIXPANEL_METAMETRICS_ID are invalid', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve('invalid-uuid');
      }
      if (key === MIXPANEL_METAMETRICS_ID) {
        return Promise.resolve('also-invalid');
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles storage read error and returns state unchanged', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    const storageError = new Error('Storage read failed');
    mockedStorageWrapper.getItem.mockRejectedValue(storageError);

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 108: Failed to read legacy storage values',
        ),
      }),
    );
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it('migrates analytics data when all opt-in values are AGREED', async () => {
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
      if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
        return Promise.resolve(AGREED);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: true,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METRICS_OPT_IN,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates analytics data when all opt-in values are DENIED', async () => {
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
      if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
        return Promise.resolve(DENIED);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: false,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates analytics data with default false when opt-in values are null', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: false,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates analytics data with default false when opt-in values are invalid', async () => {
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
      if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
        return Promise.resolve('invalid-value');
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: false,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('falls back to MIXPANEL_METAMETRICS_ID when METAMETRICS_ID is not found', async () => {
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
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(AGREED);
      }
      if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
        return Promise.resolve(AGREED);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: true,
          },
        },
      },
    });
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(METAMETRICS_ID);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('prefers METAMETRICS_ID over MIXPANEL_METAMETRICS_ID when both exist', async () => {
    const state = createValidState();
    const metametricsId = createValidUUIDv4();
    const mixpanelId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(metametricsId);
      }
      if (key === MIXPANEL_METAMETRICS_ID) {
        return Promise.resolve(mixpanelId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(AGREED);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId: metametricsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('migrates analytics data with mixed opt-in preferences', async () => {
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
      if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
        return Promise.resolve(DENIED);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles cleanup errors and returns migrated state', async () => {
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

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('preserves existing backgroundState properties during migration', async () => {
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
          },
          PreferencesController: {
            theme: 'dark',
          },
        },
      },
    };
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

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
          },
          PreferencesController: {
            theme: 'dark',
          },
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles empty string for opt-in values as false', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve('');
      }
      if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
        return Promise.resolve('');
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: false,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('falls back to MIXPANEL_METAMETRICS_ID when METAMETRICS_ID is empty string', async () => {
    const state = createValidState();
    const analyticsId = createValidUUIDv4();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve('');
      }
      if (key === MIXPANEL_METAMETRICS_ID) {
        return Promise.resolve(analyticsId);
      }
      if (key === METRICS_OPT_IN) {
        return Promise.resolve(AGREED);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId,
            optedInForRegularAccount: true,
            optedInForSocialAccount: false,
          },
        },
      },
    });
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(METAMETRICS_ID);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledTimes(4);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when no METAMETRICS_ID and MIXPANEL_METAMETRICS_ID', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockImplementation((key: string) => {
      if (key === METAMETRICS_ID) {
        return Promise.resolve('');
      }
      if (key === MIXPANEL_METAMETRICS_ID) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(METAMETRICS_ID);
    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
      MIXPANEL_METAMETRICS_ID,
    );
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
