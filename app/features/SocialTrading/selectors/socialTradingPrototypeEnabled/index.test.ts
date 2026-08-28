import {
  selectSocialTradingPrototypeEnabled,
  FEATURE_FLAG_NAME,
  DEFAULT_SOCIAL_TRADING_PROTOTYPE_ENABLED,
} from './index';

interface TestState {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: Record<string, unknown>;
        cacheTimestamp: number;
      };
    };
  };
}

const buildState = (remoteFeatureFlags: Record<string, unknown>): TestState => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags,
        cacheTimestamp: 0,
      },
    },
  },
});

describe('selectSocialTradingPrototypeEnabled', () => {
  const originalEnv = process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED;
    } else {
      process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED = originalEnv;
    }
  });

  it('defaults to disabled when the remote flag is absent', () => {
    delete process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED;
    expect(DEFAULT_SOCIAL_TRADING_PROTOTYPE_ENABLED).toBe(false);
    expect(
      selectSocialTradingPrototypeEnabled(
        buildState({}) as unknown as Parameters<
          typeof selectSocialTradingPrototypeEnabled
        >[0],
      ),
    ).toBe(false);
  });

  it('returns the remote flag value when present', () => {
    delete process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED;
    expect(
      selectSocialTradingPrototypeEnabled(
        buildState({ [FEATURE_FLAG_NAME]: true }) as unknown as Parameters<
          typeof selectSocialTradingPrototypeEnabled
        >[0],
      ),
    ).toBe(true);
  });

  it('lets the env var override the remote flag in development', () => {
    process.env.MM_SOCIAL_TRADING_PROTOTYPE_ENABLED = 'true';
    expect(
      selectSocialTradingPrototypeEnabled(
        buildState({ [FEATURE_FLAG_NAME]: false }) as unknown as Parameters<
          typeof selectSocialTradingPrototypeEnabled
        >[0],
      ),
    ).toBe(true);
  });
});
