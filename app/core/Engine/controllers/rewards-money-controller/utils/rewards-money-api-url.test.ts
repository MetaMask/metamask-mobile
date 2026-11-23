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
  it.each([
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1:3000',
    'http://[::1]:3000',
    'http://10.0.2.2:3000',
  ])('returns true for the local host %s', (url) => {
    expect(canChangeRewardsMoneyEnvUrl(url)).toBe(true);
  });

  it.each([
    'https://rewards-money.dev-api.cx.metamask.io',
    'https://rewards-money.uat-api.cx.metamask.io',
    'https://rewards-money.api.cx.metamask.io',
    'https://localhost.example.com',
    'http://10.0.2.3:3000',
    'not a url',
    '',
    undefined,
  ])('returns false for %s', (url) => {
    expect(canChangeRewardsMoneyEnvUrl(url)).toBe(false);
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
    it('returns the custom URL and cannot change it when the host is not local', () => {
      process.env.REWARDS_MONEY_API_URL = 'https://custom.api';

      const [apiUrl, canChange] =
        getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('dev');
      expect(apiUrl).toEqual('https://custom.api');
      expect(canChange).toBe(false);
    });

    it.each(['http://localhost:3000', 'http://10.0.2.2:3000'])(
      'returns %s and can change it',
      (url) => {
        process.env.REWARDS_MONEY_API_URL = url;

        const [apiUrl, canChange] =
          getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('dev');
        expect(apiUrl).toEqual(url);
        expect(canChange).toBe(true);
      },
    );
  });

  it('returns the DEV URL and cannot change it for dev', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('dev');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);
  });

  it('returns the DEV URL and cannot change it for undefined or unknown env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv(undefined);
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);

    [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('unknown');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);
  });

  it('returns the UAT URL and cannot change it for e2e or exp env', () => {
    let [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('e2e');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(false);

    [apiUrl, canChange] = getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('exp');
    expect(apiUrl).toEqual('https://api.uat');
    expect(canChange).toBe(false);
  });

  it('returns the DEV URL and cannot change it for test env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('test');
    expect(apiUrl).toEqual('https://api.dev');
    expect(canChange).toBe(false);
  });

  it('returns the PRD URL and cannot change it for production env', () => {
    const [apiUrl, canChange] =
      getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv('production');
    expect(apiUrl).toEqual('https://api.prd');
    expect(canChange).toBe(false);
  });

  it('returns the PRD URL and cannot change it for beta, pre-release, or rc env', () => {
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
