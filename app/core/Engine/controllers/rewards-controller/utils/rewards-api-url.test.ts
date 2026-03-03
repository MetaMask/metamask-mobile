import {
  canChangeRewardsEnvUrl,
  getDefaultRewardsApiBaseUrlForMetaMaskEnv,
} from './rewards-api-url';

jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: {
    DEV: 'https://api.dev',
    UAT: 'https://api.uat',
    PRD: 'https://api.prd',
  },
}));

describe('canChangeRewardsEnvUrl', () => {
  it.each(['e2e', 'dev', 'local', 'pre-release', 'exp', 'beta', 'rc', 'test'])(
    'returns true for "%s" env',
    (env) => {
      expect(canChangeRewardsEnvUrl(env)).toBe(true);
    },
  );

  it('returns false for production env', () => {
    expect(canChangeRewardsEnvUrl('production')).toBe(false);
  });

  it('returns false for unknown env', () => {
    expect(canChangeRewardsEnvUrl('unknown')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(canChangeRewardsEnvUrl(undefined)).toBe(false);
  });
});

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REWARDS_API_URL;
    delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY override', () => {
    it('returns custom URL when REWARDS_API_URL is set and BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY is true', () => {
      process.env.REWARDS_API_URL = 'https://custom.api';
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'true';

      const [apiUrl, canChange] =
        getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev');
      expect(apiUrl).toEqual('https://custom.api');
      expect(canChange).toBe(true);
    });

    it('preserves canChange based on env when returning custom URL', () => {
      process.env.REWARDS_API_URL = 'https://custom.api';
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'true';

      const [apiUrl, canChange] =
        getDefaultRewardsApiBaseUrlForMetaMaskEnv('production');
      expect(apiUrl).toEqual('https://custom.api');
      expect(canChange).toBe(false);
    });

    it('falls through to switch when BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY is not true', () => {
      process.env.REWARDS_API_URL = 'https://custom.api';
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'false';

      const [apiUrl] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev');
      expect(apiUrl).toEqual('https://api.uat');
    });

    it('falls through to switch when REWARDS_API_URL is not set', () => {
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'true';

      const [apiUrl] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev');
      expect(apiUrl).toEqual('https://api.uat');
    });
  });

  it('returns UAT url and canChange=true for local or dev env', () => {
    let [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);

    [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('local');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);
  });

  it('returns UAT url and canChange=false for undefined or unknown env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsApiBaseUrlForMetaMaskEnv(undefined);
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(false);

    [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('unknown');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(false);
  });

  it('returns UAT url and canChange=true for e2e, exp, or test env', () => {
    let [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('e2e');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);

    [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('exp');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);

    [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('test');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(true);
  });

  it('returns PRD url and canChange=false for production env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsApiBaseUrlForMetaMaskEnv('production');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);
  });

  it('returns PRD url and canChange=true for beta, pre-release, or rc env', () => {
    let [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('beta');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(true);

    [apiUrl, canChange] =
      getDefaultRewardsApiBaseUrlForMetaMaskEnv('pre-release');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(true);

    [apiUrl, canChange] = getDefaultRewardsApiBaseUrlForMetaMaskEnv('rc');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(true);
  });
});
