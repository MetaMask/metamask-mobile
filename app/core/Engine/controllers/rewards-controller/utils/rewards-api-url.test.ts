import {
  canChangeRewardsEnvUrl,
  getDefaultRewardsApiBaseUrlForMetaMaskEnv,
} from './rewards-api-url';

jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: {
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
  it('returns UAT api url for local or dev env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev')).toEqual(
      'https://api.uat',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('local')).toEqual(
      'https://api.uat',
    );
  });

  it('returns UAT api url for undefined or unknown env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv(undefined)).toEqual(
      'https://api.uat',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('unknown')).toEqual(
      'https://api.uat',
    );
  });

  it('returns UAT api url for e2e or exp env', () => {
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('e2e')).toEqual(
      'https://api.uat',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('exp')).toEqual(
      'https://api.uat',
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
