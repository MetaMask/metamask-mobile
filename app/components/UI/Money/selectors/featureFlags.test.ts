// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../util/remoteFeatureFlag';
import {
  selectMoneyActivityMockDataEnabledFlag,
  selectMoneyEnableActivityDetailsFlag,
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  selectMoneyEnableMoneyAccountFlag,
  selectMoneyHubEnabledFlag,
  selectMoneyNoFeeTokens,
  selectMoneyDepositMinBalance,
  selectMoneyAccountGeoBlockedCountries,
  DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES,
  selectMoneyNoFeeDepositTokens,
  selectMoneyFirstTimeDepositAnimationEnabledFlag,
  selectMoneyVaultApyRemoteConfig,
} from './featureFlags';

jest.mock('../../../../core/Engine', () => ({
  context: {},
}));

jest.mock('../../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../../util/remoteFeatureFlag'),
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

jest.mock('../../../../lib/Money/feature-flags', () => ({
  isMoneyAccountEnabled: jest.fn(),
}));

const mockedValidate =
  remoteFeatureFlagModule.validatedVersionGatedFeatureFlag as jest.MockedFunction<
    typeof remoteFeatureFlagModule.validatedVersionGatedFeatureFlag
  >;

const mockedIsMoneyAccountEnabled = jest.requireMock(
  '../../../../lib/Money/feature-flags',
).isMoneyAccountEnabled as jest.Mock;

const createState = (remoteFeatureFlags: Record<string, unknown> = {}) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags,
      },
    },
  },
});

describe('selectMoneyEnableActivityDetailsFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const state = createState({
      moneyEnableActivityDetails: { enabled: true, minimumVersion: '0.0.0' },
    });

    const result = selectMoneyEnableActivityDetailsFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const state = createState({
      moneyEnableActivityDetails: { enabled: false, minimumVersion: '0.0.0' },
    });

    const result = selectMoneyEnableActivityDetailsFlag(state as never);

    expect(result).toBe(false);
  });

  it('returns false when remote flag is absent', () => {
    mockedValidate.mockReturnValue(undefined);

    const state = createState({});

    const result = selectMoneyEnableActivityDetailsFlag(state as never);

    expect(result).toBe(false);
  });
});

describe('selectMoneyEnableActivityDetailsBlockexplorerLinkFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const state = createState({
      moneyEnableActivityDetailsBlockexplorerLink: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
    });

    const result = selectMoneyEnableActivityDetailsBlockexplorerLinkFlag(
      state as never,
    );

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const state = createState({
      moneyEnableActivityDetailsBlockexplorerLink: {
        enabled: false,
        minimumVersion: '0.0.0',
      },
    });

    const result = selectMoneyEnableActivityDetailsBlockexplorerLinkFlag(
      state as never,
    );

    expect(result).toBe(false);
  });

  it('returns false when remote flag is absent', () => {
    mockedValidate.mockReturnValue(undefined);

    const state = createState({});

    const result = selectMoneyEnableActivityDetailsBlockexplorerLinkFlag(
      state as never,
    );

    expect(result).toBe(false);
  });
});

describe('selectMoneyActivityMockDataEnabledFlag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when remote flag is true', () => {
    const state = createState({
      moneyActivityMockDataEnabled: true,
    });

    const result = selectMoneyActivityMockDataEnabledFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when remote flag is false', () => {
    const state = createState({
      moneyActivityMockDataEnabled: false,
    });

    const result = selectMoneyActivityMockDataEnabledFlag(state as never);

    expect(result).toBe(false);
  });

  it('falls back to local env var when remote flag is not a boolean', () => {
    process.env.MM_MONEY_ACTIVITY_MOCK_DATA_ENABLED = 'true';

    const state = createState({ _unique: 'mock-fallback-true' });

    const result = selectMoneyActivityMockDataEnabledFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when remote is unset and local env is unset', () => {
    delete process.env.MM_MONEY_ACTIVITY_MOCK_DATA_ENABLED;

    const state = createState({ _unique: 'mock-fallback-false' });

    const result = selectMoneyActivityMockDataEnabledFlag(state as never);

    expect(result).toBe(false);
  });
});

describe('selectMoneyEnableMoneyAccountFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to isMoneyAccountEnabled', () => {
    mockedIsMoneyAccountEnabled.mockReturnValue(true);
    const state = createState();

    const result = selectMoneyEnableMoneyAccountFlag(state as never);

    expect(mockedIsMoneyAccountEnabled).toHaveBeenCalledWith({});
    expect(result).toBe(true);
  });
});

describe('selectMoneyHubEnabledFlag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const state = createState({
      earnMoneyHubEnabled: { enabled: true, minimumVersion: '1.0.0' },
    });

    const result = selectMoneyHubEnabledFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const state = createState({
      earnMoneyHubEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });

    const result = selectMoneyHubEnabledFlag(state as never);

    expect(result).toBe(false);
  });

  it('falls back to local env var when remote flag returns undefined', () => {
    mockedValidate.mockReturnValue(undefined);
    process.env.MM_MONEY_HUB_ENABLED = 'true';

    const state = createState({ _unique: 'hub-fallback-true' });

    const result = selectMoneyHubEnabledFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when both remote and local flags are unavailable', () => {
    mockedValidate.mockReturnValue(undefined);
    delete process.env.MM_MONEY_HUB_ENABLED;

    const state = createState({ _unique: 'hub-fallback-false' });

    const result = selectMoneyHubEnabledFlag(state as never);

    expect(result).toBe(false);
  });
});

describe('selectMoneyNoFeeTokens', () => {
  const originalEnv = process.env;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  it('returns remote wildcard map object when valid', () => {
    const state = createState({
      earnMoneyDepositNoFeeTokens: { '*': ['USDC', 'USDT'] },
    });

    const result = selectMoneyNoFeeTokens(state as never);

    expect(result).toEqual({ '*': ['USDC', 'USDT'] });
  });

  it('parses remote value from JSON string', () => {
    const state = createState({
      earnMoneyDepositNoFeeTokens: '{"0x1":["USDC"]}',
    });

    const result = selectMoneyNoFeeTokens(state as never);

    expect(result).toEqual({ '0x1': ['USDC'] });
  });

  it('logs console.warn and falls back to env when remote value is structurally invalid', () => {
    process.env.MM_MONEY_DEPOSIT_NO_FEE_TOKENS = JSON.stringify({
      '0x1': ['USDC'],
    });
    const state = createState({
      earnMoneyDepositNoFeeTokens: { '0x1': 'not-an-array' },
    });

    const result = selectMoneyNoFeeTokens(state as never);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
    expect(result).toEqual({ '0x1': ['USDC'] });
  });

  it('parses env var JSON as fallback when remote is absent', () => {
    process.env.MM_MONEY_DEPOSIT_NO_FEE_TOKENS = JSON.stringify({
      '*': ['USDC'],
    });
    const state = createState({});

    const result = selectMoneyNoFeeTokens(state as never);

    expect(result).toEqual({ '*': ['USDC'] });
  });

  it('returns empty object when both remote and env are absent', () => {
    delete process.env.MM_MONEY_DEPOSIT_NO_FEE_TOKENS;
    const state = createState({});

    const result = selectMoneyNoFeeTokens(state as never);

    expect(result).toEqual({});
  });
});

describe('selectMoneyDepositMinBalance', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns remote number value directly', () => {
    const state = createState({ earnMoneyDepositMinAssetBalance: 0.5 });

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.5);
  });

  it('parses remote numeric string to number', () => {
    const state = createState({ earnMoneyDepositMinAssetBalance: '1.25' });

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(1.25);
  });

  it('falls back to env var when remote is non-finite', () => {
    process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE = '0.05';
    const state = createState({
      earnMoneyDepositMinAssetBalance: 'not-a-number',
    });

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.05);
  });

  it('falls back to env var when remote value is negative', () => {
    process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE = '0.05';
    const state = createState({
      earnMoneyDepositMinAssetBalance: -0.2,
    });

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.05);
  });

  it('parses env var string as fallback when remote is absent', () => {
    process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE = '0.1';
    const state = createState({});

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.1);
  });

  it('falls back to 0.01 when env var is negative and remote is absent', () => {
    process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE = '-0.1';
    const state = createState({});

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.01);
  });

  it('falls back to 0.01 when both remote and env are absent', () => {
    delete process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE;
    const state = createState({});

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.01);
  });
});

describe('selectMoneyAccountGeoBlockedCountries', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns blockedRegions array from remote flag when valid', () => {
    const state = createState({
      moneyAccountGeoBlockedCountries: { blockedRegions: ['GB', 'US'] },
    });

    const result = selectMoneyAccountGeoBlockedCountries(state as never);

    expect(result).toEqual(['GB', 'US']);
  });

  it('returns empty array when remote flag has empty blockedRegions', () => {
    const state = createState({
      moneyAccountGeoBlockedCountries: { blockedRegions: [] },
    });

    const result = selectMoneyAccountGeoBlockedCountries(state as never);

    expect(result).toEqual([]);
  });

  it('falls back to env var when remote flag is absent', () => {
    process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES = 'US,FR';

    const state = createState({});

    const result = selectMoneyAccountGeoBlockedCountries(state as never);

    expect(result).toEqual(['US', 'FR']);
  });

  it('falls back to default blocked countries when both remote and env are absent', () => {
    delete process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES;

    const state = createState({});

    const result = selectMoneyAccountGeoBlockedCountries(state as never);

    expect(result).toEqual(DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES);
  });

  it('ignores remote flag when blockedRegions is not an array', () => {
    process.env.MM_MONEY_ACCOUNT_GEO_BLOCKED_COUNTRIES = 'IE';

    const state = createState({
      moneyAccountGeoBlockedCountries: { blockedRegions: 'not-an-array' },
    });

    const result = selectMoneyAccountGeoBlockedCountries(state as never);

    expect(result).toEqual(['IE']);
  });

  it('DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES includes GB', () => {
    expect(DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES).toContain('GB');
  });
});

describe('selectMoneyFirstTimeDepositAnimationEnabledFlag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const state = createState({
      earnMoneyFirstTimeDepositAnimationEnabled: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    const result = selectMoneyFirstTimeDepositAnimationEnabledFlag(
      state as never,
    );

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const state = createState({
      earnMoneyFirstTimeDepositAnimationEnabled: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    const result = selectMoneyFirstTimeDepositAnimationEnabledFlag(
      state as never,
    );

    expect(result).toBe(false);
  });

  it('defaults to true when remote flag returns undefined and env is unset', () => {
    mockedValidate.mockReturnValue(undefined);
    delete process.env.MM_MONEY_FIRST_TIME_DEPOSIT_ANIMATION_ENABLED;

    const state = createState({
      _unique: 'first-deposit-default-on',
    });

    const result = selectMoneyFirstTimeDepositAnimationEnabledFlag(
      state as never,
    );

    expect(result).toBe(true);
  });

  it('returns false when env var is set to false and remote is undefined', () => {
    mockedValidate.mockReturnValue(undefined);
    process.env.MM_MONEY_FIRST_TIME_DEPOSIT_ANIMATION_ENABLED = 'false';

    const state = createState({
      _unique: 'first-deposit-env-false',
    });

    const result = selectMoneyFirstTimeDepositAnimationEnabledFlag(
      state as never,
    );

    expect(result).toBe(false);
  });

  it('remote flag takes precedence over env var', () => {
    mockedValidate.mockReturnValue(false);
    process.env.MM_MONEY_FIRST_TIME_DEPOSIT_ANIMATION_ENABLED = 'true';

    const state = createState({
      earnMoneyFirstTimeDepositAnimationEnabled: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    const result = selectMoneyFirstTimeDepositAnimationEnabledFlag(
      state as never,
    );

    expect(result).toBe(false);
  });
});

describe('selectMoneyVaultApyRemoteConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('vaultApyFallback', () => {
    it('parses numeric fallback from object', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0.04,
          vaultApyOverride: undefined,
        },
      });

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBe(0.04);
    });

    it('parses numeric-string fallback from object', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: '0.05',
          vaultApyOverride: undefined,
        },
      });

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBe(0.05);
    });

    it('returns undefined vaultApyFallback when flag is absent', () => {
      const state = createState({});

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBeUndefined();
    });

    it('returns undefined vaultApyFallback when fallback value is non-numeric string', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 'bad',
          vaultApyOverride: undefined,
        },
      });

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBeUndefined();
    });

    it('returns undefined vaultApyFallback when fallback value is NaN', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: NaN,
          vaultApyOverride: undefined,
        },
      });

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBeUndefined();
    });

    it('returns undefined vaultApyFallback when fallback value is negative', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: -0.04,
          vaultApyOverride: undefined,
        },
      });

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBeUndefined();
    });

    it('accepts 0 as a valid fallback value', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0,
          vaultApyOverride: undefined,
        },
      });

      const { vaultApyFallback } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyFallback).toBe(0);
    });
  });

  describe('vaultApyOverride', () => {
    it('parses numeric override from object', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0,
          vaultApyOverride: 0.06,
        },
      });

      const { vaultApyOverride } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyOverride).toBe(0.06);
    });

    it('parses numeric-string override from object', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0,
          vaultApyOverride: '0.07',
        },
      });

      const { vaultApyOverride } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyOverride).toBe(0.07);
    });

    it('returns undefined override when vaultApyOverride is absent', () => {
      const state = createState({
        earnMoneyVaultApyControl: { vaultApyFallback: 0.04 },
      });

      const { vaultApyOverride } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyOverride).toBeUndefined();
    });

    it('accepts 0 as a valid override (zero APY override is intentional)', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0.04,
          vaultApyOverride: 0,
        },
      });

      const { vaultApyOverride } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyOverride).toBe(0);
    });

    it('returns undefined override when override value is negative', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0.04,
          vaultApyOverride: -0.01,
        },
      });

      const { vaultApyOverride } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyOverride).toBeUndefined();
    });

    it('returns undefined override when override value is non-numeric string', () => {
      const state = createState({
        earnMoneyVaultApyControl: {
          vaultApyFallback: 0.04,
          vaultApyOverride: 'bad',
        },
      });

      const { vaultApyOverride } = selectMoneyVaultApyRemoteConfig(
        state as never,
      );

      expect(vaultApyOverride).toBeUndefined();
    });
  });
});

/**
 * Minimal relay config matching the real `confirmations_relay_fixed_spread` flag shape.
 * Only deposit routes (output = Monad mUSD) should appear in the catalog.
 */
const MOCK_RELAY_FLAG = {
  chains: {
    eth: '0x1',
    arbitrum: '0xa4b1',
    base: '0x2105',
    bsc: '0x38',
    linea: '0xe708',
    monad: '0x8f',
  },
  tokens: {
    eth_usdc: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    eth_ausdc: '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c',
    eth_usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    eth_ausdt: '0x23878914efe38d27c4d67ab83ed1b93a74d4086a',
    eth_dai: '0x6b175474e89094c44da98b954eedeac495271d0f',
    eth_adai: '0x018008bfb33d285247a21d44e50697654f754e63',
    arbitrum_usdc: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    arbitrum_ausdcn: '0x724dc807b04555b71ed48a6896b6f41593b8c637',
    base_usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    base_ausdc: '0x4e65fe4dba92790696d040ac24aa414708f5c0ab',
    bsc_usdc: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    bsc_ausdc: '0x00901a076785e0906d1028c7d6372d247bec7d61',
    bsc_ausdt: '0xa9251ca9de909cb71783723713b21e4233fbf1b1',
    bsc_usdt: '0x55d398326f99059ff775485246999027b3197955',
    monad_usdc: '0x754704bc059f8c67012fed69bc8a327a5aafb603',
    musd: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  },
  routes: [
    // No Fee Deposit routes: -> Monad mUSD
    ['monad', 'monad_usdc', 'monad', 'musd'],
    ['arbitrum', 'arbitrum_usdc', 'monad', 'musd'],
    ['arbitrum', 'arbitrum_ausdcn', 'monad', 'musd'],
    ['base', 'base_usdc', 'monad', 'musd'],
    ['base', 'base_ausdc', 'monad', 'musd'],
    ['bsc', 'bsc_usdc', 'monad', 'musd'],
    ['bsc', 'bsc_ausdc', 'monad', 'musd'],
    ['bsc', 'bsc_ausdt', 'monad', 'musd'],
    ['bsc', 'bsc_usdt', 'monad', 'musd'],
    ['eth', 'eth_usdc', 'monad', 'musd'],
    ['eth', 'eth_ausdc', 'monad', 'musd'],
    ['eth', 'eth_usdt', 'monad', 'musd'],
    ['eth', 'eth_ausdt', 'monad', 'musd'],
    ['eth', 'eth_dai', 'monad', 'musd'],
    ['eth', 'eth_adai', 'monad', 'musd'],
    ['eth', 'musd', 'monad', 'musd'],
    ['linea', 'musd', 'monad', 'musd'],
  ],
};

describe('selectMoneyNoFeeDepositTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deposit-route tokens grouped by hex chain ID', () => {
    const state = createState({
      confirmations_relay_fixed_spread: MOCK_RELAY_FLAG,
    });

    const result = selectMoneyNoFeeDepositTokens(state as never);

    expect(result['0x1']).toEqual(
      expect.arrayContaining(['USDC', 'aUSDC', 'USDT', 'aUSDT', 'DAI', 'aDAI']),
    );
    expect(result['0xa4b1']).toEqual(
      expect.arrayContaining(['USDC', 'aUSDCN']),
    );
    expect(result['0x2105']).toEqual(expect.arrayContaining(['USDC', 'aUSDC']));
    expect(result['0x38']).toEqual(
      expect.arrayContaining(['USDC', 'aUSDC', 'aUSDT', 'USDT']),
    );
    expect(result['0xe708']).toEqual(['MUSD']);
    expect(result['0x8f']).toEqual(['USDC']);
  });

  it('deduplicates symbols within a chain', () => {
    const state = createState({
      confirmations_relay_fixed_spread: {
        ...MOCK_RELAY_FLAG,
        routes: [
          ['eth', 'eth_usdc', 'monad', 'musd'],
          ['eth', 'eth_usdc', 'monad', 'musd'], // duplicate
        ],
      },
    });

    const result = selectMoneyNoFeeDepositTokens(state as never);

    expect(result['0x1']?.filter((s) => s === 'USDC')).toHaveLength(1);
  });

  it('normalises aave-style aliases: ausdc -> aUSDC, ausdt -> aUSDT, adai -> aDAI, ausdcn -> aUSDCN', () => {
    const state = createState({
      confirmations_relay_fixed_spread: MOCK_RELAY_FLAG,
    });

    const result = selectMoneyNoFeeDepositTokens(state as never);

    expect(result['0x1']).toContain('aUSDC');
    expect(result['0x1']).toContain('aUSDT');
    expect(result['0x1']).toContain('aDAI');
    expect(result['0xa4b1']).toContain('aUSDCN');
  });

  it('parses flag value from JSON string', () => {
    const state = createState({
      confirmations_relay_fixed_spread: JSON.stringify(MOCK_RELAY_FLAG),
    });

    const result = selectMoneyNoFeeDepositTokens(state as never);

    expect(result['0x1']).toContain('USDC');
  });

  it('falls back to MONEY_NO_FEE_TOKENS_FALLBACK when flag is absent', () => {
    const state = createState({});

    const result = selectMoneyNoFeeDepositTokens(state as never);

    // Fallback has at least Ethereum mainnet USDC
    expect(result['0x1']).toContain('USDC');
  });

  it('falls back when flag value is structurally invalid', () => {
    const state = createState({
      confirmations_relay_fixed_spread: { notAValidShape: true },
    });

    const result = selectMoneyNoFeeDepositTokens(state as never);

    expect(result['0x1']).toContain('USDC');
  });

  it('falls back when routes produce no deposit matches', () => {
    const state = createState({
      confirmations_relay_fixed_spread: {
        chains: { eth: '0x1', base: '0x2105' },
        tokens: {
          musd: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          base_usdc: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        },
        // Non-deposit routes only — nothing targets Monad mUSD
        routes: [['eth', 'musd', 'base', 'base_usdc']],
      },
    });

    const result = selectMoneyNoFeeDepositTokens(state as never);

    // Falls back to MONEY_NO_FEE_TOKENS_FALLBACK
    expect(result['0x1']).toContain('USDC');
  });
});
