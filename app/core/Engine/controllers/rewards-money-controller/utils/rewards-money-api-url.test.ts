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
  it('returns true for a local build', () => {
    expect(canChangeRewardsMoneyEnvUrl('local')).toBe(true);
  });

  it.each([
    'dev',
    'e2e',
    'pre-release',
    'exp',
    'beta',
    'rc',
    'test',
    'production',
    'unknown',
    undefined,
  ])('returns false for "%s"', (env) => {
    expect(canChangeRewardsMoneyEnvUrl(env)).toBe(false);
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
      expect(canChange).toBe(false);
    });

    it('preserves canChange based on env when returning custom URL', () => {
      process.env.REWARDS_MONEY_API_URL = 'https://custom.api';

      const [apiUrl, canChange] =
        getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('production');
      expect(apiUrl).toEqual('https://custom.api');
      expect(canChange).toBe(false);
    });
  });

  it('returns DEV url and canChange only for a local build', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('dev');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);

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

  it('returns UAT url and canChange=false for e2e or exp env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('e2e');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(false);

    [apiUrl, canChange] = getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('exp');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(false);
  });

  it('returns DEV url and canChange=false for test env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('test');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);
  });

  it('returns PRD url and canChange=false for production env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('production');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);
  });

  it('returns PRD url and canChange=false for beta, pre-release, or rc env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('beta');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);

    [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('pre-release');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);

    [apiUrl, canChange] = getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('rc');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);
  });
});
