import {
  canChangeRewardsMoneyEnvUrl,
  getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv,
} from './rewards-money-api-url';

jest.mock('../../../../AppConstants', () => ({
  REWARDS_MONEY_API_URL: {
    DEV: 'https://api.dev',
    UAT: 'https://api.uat',
    PRD: 'https://api.prd',
  },
}));

describe('canChangeRewardsMoneyEnvUrl', () => {
  it.each(['e2e', 'dev', 'local', 'pre-release', 'exp', 'beta', 'rc', 'test'])(
    'returns true for "%s" env',
    (env) => {
      expect(canChangeRewardsMoneyEnvUrl(env)).toBe(true);
    },
  );

  it('returns false for production env', () => {
    expect(canChangeRewardsMoneyEnvUrl('production')).toBe(false);
  });

  it('returns false for unknown env', () => {
    expect(canChangeRewardsMoneyEnvUrl('unknown')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(canChangeRewardsMoneyEnvUrl(undefined)).toBe(false);
  });
});

describe('getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REWARDS_MONEY_API_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('REWARDS_MONEY_API_URL override', () => {
    it('returns custom URL when REWARDS_MONEY_API_URL is set', () => {
      process.env.REWARDS_MONEY_API_URL = 'https://custom.api';

      const [apiUrl, canChange] =
        getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('dev');
      expect(apiUrl).toEqual('https://custom.api');
      expect(canChange).toBe(true);
    });

    it('preserves canChange based on env when returning custom URL', () => {
      process.env.REWARDS_MONEY_API_URL = 'https://custom.api';

      const [apiUrl, canChange] =
        getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('production');
      expect(apiUrl).toEqual('https://custom.api');
      expect(canChange).toBe(false);
    });
  });

  it('returns DEV url and canChange=true for local or dev env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('dev');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(true);

    [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('local');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(true);
  });

  it('returns DEV url and canChange=false for undefined or unknown env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv(undefined);
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);

    [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('unknown');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);
  });

  it('returns UAT url and canChange=true for e2e or exp env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('e2e');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);

    [apiUrl, canChange] = getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('exp');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);
  });

  it('returns DEV url and canChange=true for test env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('test');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(true);
  });

  it('returns PRD url and canChange=false for production env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('production');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);
  });

  it('returns PRD url and canChange=true for beta, pre-release, or rc env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('beta');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(true);

    [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('pre-release');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(true);

    [apiUrl, canChange] = getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('rc');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(true);
  });
});
