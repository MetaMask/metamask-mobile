import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './131';
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
  onboarding?: {
    pendingSocialLoginMarketingConsentBackfill?: string | null;
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
      onboarding: {},
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(
      state.onboarding?.pendingSocialLoginMarketingConsentBackfill,
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
      onboarding: {},
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(
      state.onboarding?.pendingSocialLoginMarketingConsentBackfill,
    ).toBeUndefined();
  });

  it('returns state unchanged if onboarding slice is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('stores the authConnection on onboarding for eligible social login users', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      onboarding: {
        pendingSocialLoginMarketingConsentBackfill: null,
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(state.onboarding?.pendingSocialLoginMarketingConsentBackfill).toBe(
      'google',
    );
  });

  it('overwrites any stale pending marker with the current authConnection', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'apple' },
        },
      },
      onboarding: {
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    };

    migrate(state);

    expect(state.onboarding?.pendingSocialLoginMarketingConsentBackfill).toBe(
      'apple',
    );
  });

  it('sets pendingSocialLoginMarketingConsentBackfill on onboarding when it was missing (migration does not gate on marketing consent)', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      onboarding: {},
    };

    migrate(state);

    expect(state.onboarding?.pendingSocialLoginMarketingConsentBackfill).toBe(
      'google',
    );
  });

  it('captures exceptions and returns state unchanged on unexpected errors', () => {
    const onboarding: Record<string, unknown> = {};
    Object.defineProperty(
      onboarding,
      'pendingSocialLoginMarketingConsentBackfill',
      {
        configurable: true,
        enumerable: true,
        get() {
          return undefined;
        },
        set() {
          throw new Error('Unexpected migration failure');
        },
      },
    );

    const state: TestState = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: { authConnection: 'google' },
        },
      },
      onboarding,
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Migration 131: Failed to mark pending social login marketing consent backfill',
        ),
      }),
    );
  });
});
