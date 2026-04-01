import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './130';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

interface TestState {
  engine: {
    backgroundState: {
      SeedlessOnboardingController?: {
        authConnection?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
  security?: {
    dataCollectionForMarketing?: boolean | null;
    [key: string]: unknown;
  };
  onboarding?: {
    seedless?: {
      pendingSocialLoginMarketingConsentBackfill?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe(`Migration ${migrationVersion}: Mark pending social login marketing consent backfill`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged if SeedlessOnboardingController does not exist', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          OtherController: { someData: true },
        },
      },
      security: { dataCollectionForMarketing: true },
      onboarding: {},
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(
      state.onboarding?.seedless?.pendingSocialLoginMarketingConsentBackfill,
    ).toBeUndefined();
  });

  it('returns state unchanged if authConnection is not set', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            socialBackupsMetadata: [],
          },
        },
      },
      security: { dataCollectionForMarketing: true },
      onboarding: {},
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(
      state.onboarding?.seedless?.pendingSocialLoginMarketingConsentBackfill,
    ).toBeUndefined();
  });

  it('returns state unchanged if onboarding slice is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      security: { dataCollectionForMarketing: true },
    };

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged if dataCollectionForMarketing is false', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      security: { dataCollectionForMarketing: false },
      onboarding: {},
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(
      state.onboarding?.seedless?.pendingSocialLoginMarketingConsentBackfill,
    ).toBeUndefined();
  });

  it('stores the authConnection in onboarding.seedless for eligible social login users', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      security: { dataCollectionForMarketing: true },
      onboarding: {
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: null,
        },
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(
      state.onboarding?.seedless?.pendingSocialLoginMarketingConsentBackfill,
    ).toBe('google');
  });

  it('overwrites any stale pending marker with the current authConnection', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'apple' },
        },
      },
      security: {
        dataCollectionForMarketing: true,
      },
      onboarding: {
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: 'google',
        },
      },
    };

    migrate(state);

    expect(
      state.onboarding?.seedless?.pendingSocialLoginMarketingConsentBackfill,
    ).toBe('apple');
  });

  it('creates onboarding.seedless when it is missing', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      security: { dataCollectionForMarketing: true },
      onboarding: {},
    };

    migrate(state);

    expect(state.onboarding?.seedless).toEqual({
      pendingSocialLoginMarketingConsentBackfill: 'google',
    });
  });

  it('captures exceptions and returns state unchanged on unexpected errors', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      security: { dataCollectionForMarketing: true },
      onboarding: {
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: null,
        },
      },
    };

    Object.defineProperty(state, 'security', {
      get() {
        throw new Error('Unexpected migration failure');
      },
    });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 129: Failed to mark pending social login marketing consent backfill',
        ),
      }),
    );
  });
});
