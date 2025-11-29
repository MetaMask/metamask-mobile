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

  it('returns state unchanged if AnalyticsController state already exists', async () => {
    const state = {
      engine: {
        backgroundState: {
          AnalyticsController: {
            analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
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

  it('returns state unchanged when legacy storage has invalid METAMETRICS_ID', async () => {
    const state = createValidState();
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('invalid-id');

    const migratedState = await migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
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
          'Migration 108: Failed to read legacy storage values',
        ),
      }),
    );
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it.each([
    {
      metricsOptIn: AGREED,
      metricsOptInSocialLogin: AGREED,
      expectedOptedInForRegularAccount: true,
      expectedOptedInForSocialAccount: true,
      description: 'when all opt-in values are AGREED',
    },
    {
      metricsOptIn: DENIED,
      metricsOptInSocialLogin: DENIED,
      expectedOptedInForRegularAccount: false,
      expectedOptedInForSocialAccount: false,
      description: 'when all opt-in values are DENIED',
    },
    {
      metricsOptIn: AGREED,
      metricsOptInSocialLogin: DENIED,
      expectedOptedInForRegularAccount: true,
      expectedOptedInForSocialAccount: false,
      description: 'with regular account AGREED and social account DENIED',
    },
    {
      metricsOptIn: DENIED,
      metricsOptInSocialLogin: AGREED,
      expectedOptedInForRegularAccount: false,
      expectedOptedInForSocialAccount: true,
      description: 'with regular account DENIED and social account AGREED',
    },
  ])(
    'migrates analytics data from MMKV to state $description',
    async ({
      metricsOptIn,
      metricsOptInSocialLogin,
      expectedOptedInForRegularAccount,
      expectedOptedInForSocialAccount,
    }) => {
      const state = createValidState();
      const analyticsId = createValidUUIDv4();
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem.mockImplementation((key: string) => {
        if (key === METAMETRICS_ID) {
          return Promise.resolve(analyticsId);
        }
        if (key === METRICS_OPT_IN) {
          return Promise.resolve(metricsOptIn);
        }
        if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
          return Promise.resolve(metricsOptInSocialLogin);
        }
        return Promise.resolve(null);
      });

      const migratedState = await migrate(state);

      expect(migratedState).toEqual({
        engine: {
          backgroundState: {
            AnalyticsController: {
              analyticsId,
              optedInForRegularAccount: expectedOptedInForRegularAccount,
              optedInForSocialAccount: expectedOptedInForSocialAccount,
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
    },
  );

  it.each([
    {
      metricsOptIn: null,
      metricsOptInSocialLogin: null,
      description: 'when opt-in values are null',
    },
    {
      metricsOptIn: 'invalid-value',
      metricsOptInSocialLogin: 'invalid-value',
      description: 'when opt-in values are invalid',
    },
    {
      metricsOptIn: '',
      metricsOptInSocialLogin: '',
      description: 'when opt-in values are empty string',
    },
  ])(
    'migrates analytics data from MMKV to state with default false opt-ins $description',
    async ({ metricsOptIn, metricsOptInSocialLogin }) => {
      const state = createValidState();
      const analyticsId = createValidUUIDv4();
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem.mockImplementation((key: string) => {
        if (key === METAMETRICS_ID) {
          return Promise.resolve(analyticsId);
        }
        if (key === METRICS_OPT_IN) {
          return Promise.resolve(metricsOptIn);
        }
        if (key === METRICS_OPT_IN_SOCIAL_LOGIN) {
          return Promise.resolve(metricsOptInSocialLogin);
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
    },
  );

  it('migrates from MMKV using METAMETRICS_ID when present', async () => {
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

  it.each([
    {
      metametricsId: null,
      description: 'when METAMETRICS_ID is null',
    },
    {
      metametricsId: '',
      description: 'when METAMETRICS_ID is empty string',
    },
  ])(
    'migrates from MMKV using MIXPANEL_METAMETRICS_ID as fallback $description',
    async ({ metametricsId }) => {
      const state = createValidState();
      const analyticsId = createValidUUIDv4();
      mockedEnsureValidState.mockReturnValue(true);
      mockedStorageWrapper.getItem.mockImplementation((key: string) => {
        if (key === METAMETRICS_ID) {
          return Promise.resolve(metametricsId);
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
    },
  );

  it('returns migrated state when cleanup fails', async () => {
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
});
