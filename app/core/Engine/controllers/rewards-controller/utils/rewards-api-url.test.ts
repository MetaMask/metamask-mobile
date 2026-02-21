import { getDefaultRewardsApiBaseUrlForMetaMaskEnv } from './rewards-api-url';

jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: {
    DEV: 'https://api.dev',
    PRD: 'https://api.prd',
  },
}));

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  it('returns DEV api url for local or dev env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev')).toEqual(
      'https://api.dev',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('local')).toEqual(
      'https://api.dev',
    );
  });

  it('returns DEV api url for undefined or unknown env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv(undefined)).toEqual(
      'https://api.dev',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('unknown')).toEqual(
      'https://api.dev',
    );
  });

  it('returns DEV api url for e2e or exp env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('e2e')).toEqual(
      'https://api.dev',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('exp')).toEqual(
      'https://api.dev',
    );
  });

  it('returns PRD api url for production, beta, pre-release, or rc env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('production')).toEqual(
      'https://api.prd',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('beta')).toEqual(
      'https://api.prd',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('pre-release')).toEqual(
      'https://api.prd',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('rc')).toEqual(
      'https://api.prd',
    );
  });
});
