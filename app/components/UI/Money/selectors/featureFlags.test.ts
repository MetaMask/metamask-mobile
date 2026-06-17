// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../util/remoteFeatureFlag';
import {
  selectMoneyActivityMockDataEnabledFlag,
  selectMoneyEnableMoneyAccountFlag,
  selectMoneyHubEnabledFlag,
  selectMoneyDepositTokensBlocklist,
  selectMoneyNoFeeTokens,
  selectMoneyDepositMinBalance,
  selectMoneyTokensSortMode,
  selectMoneyAccountGeoBlockedCountries,
  DEFAULT_MONEY_ACCOUNT_BLOCKED_COUNTRIES,
  selectMoneyFirstTimeDepositAnimationEnabledFlag,
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

describe('selectMoneyDepositTokensBlocklist', () => {
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
      earnMoneyPaymentTokensBlocklist: { '*': ['SCAM'], '0x1': ['USDT'] },
    });

    const result = selectMoneyDepositTokensBlocklist(state as never);

    expect(result).toEqual({ '*': ['SCAM'], '0x1': ['USDT'] });
  });

  it('parses remote value from JSON string', () => {
    const state = createState({
      earnMoneyPaymentTokensBlocklist: '{"*":["SCAM"],"0x1":["*"]}',
    });

    const result = selectMoneyDepositTokensBlocklist(state as never);

    expect(result).toEqual({ '*': ['SCAM'], '0x1': ['*'] });
  });

  it('logs console.warn and falls back to env when remote value is structurally invalid', () => {
    process.env.MM_MONEY_PAYMENT_TOKENS_BLOCKLIST = JSON.stringify({
      '0x1': ['DAI'],
    });
    const state = createState({
      earnMoneyPaymentTokensBlocklist: { '0x1': 'not-an-array' },
    });

    const result = selectMoneyDepositTokensBlocklist(state as never);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('produced invalid structure'),
    );
    expect(result).toEqual({ '0x1': ['DAI'] });
  });

  it('parses env var JSON as fallback when remote is absent', () => {
    process.env.MM_MONEY_PAYMENT_TOKENS_BLOCKLIST = JSON.stringify({
      '0xa4b1': ['USDT', 'DAI'],
    });
    const state = createState({});

    const result = selectMoneyDepositTokensBlocklist(state as never);

    expect(result).toEqual({ '0xa4b1': ['USDT', 'DAI'] });
  });

  it('returns empty object when both remote and env are absent', () => {
    delete process.env.MM_MONEY_PAYMENT_TOKENS_BLOCKLIST;
    const state = createState({});

    const result = selectMoneyDepositTokensBlocklist(state as never);

    expect(result).toEqual({});
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

  it('parses env var string as fallback when remote is absent', () => {
    process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE = '0.1';
    const state = createState({});

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.1);
  });

  it('falls back to 0.01 when both remote and env are absent', () => {
    delete process.env.MM_MONEY_DEPOSIT_MIN_ASSET_BALANCE;
    const state = createState({});

    const result = selectMoneyDepositMinBalance(state as never);

    expect(result).toBe(0.01);
  });
});

describe('selectMoneyTokensSortMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns noFeePriority for valid remote string', () => {
    const state = createState({ earnMoneyTokensSortMode: 'noFeePriority' });

    const result = selectMoneyTokensSortMode(state as never);

    expect(result).toBe('noFeePriority');
  });

  it('returns fiatBalanceDesc for valid remote string', () => {
    const state = createState({ earnMoneyTokensSortMode: 'fiatBalanceDesc' });

    const result = selectMoneyTokensSortMode(state as never);

    expect(result).toBe('fiatBalanceDesc');
  });

  it('falls back to fiatBalanceDesc for unknown remote string', () => {
    const state = createState({ earnMoneyTokensSortMode: 'unknownMode' });

    const result = selectMoneyTokensSortMode(state as never);

    expect(result).toBe('fiatBalanceDesc');
  });

  it('falls back to fiatBalanceDesc when remote flag is absent', () => {
    const state = createState({});

    const result = selectMoneyTokensSortMode(state as never);

    expect(result).toBe('fiatBalanceDesc');
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
