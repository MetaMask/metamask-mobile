import { getDefaultRewardsApiBaseUrlForMetaMaskEnv } from './rewards-api-url';

jest.mock('../../../../AppConstants', () => ({
  REWARDS_API_URL: {
    DEV: 'https://api.dev',
    UAT: 'https://api.uat',
    PRD: 'https://api.prd',
  },
}));

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  it('returns UAT api url for local or dev env', async () => {
    // Act
    let apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('local');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');
  });

  it('returns UAT api url for rc or exp env', async () => {
    // Act
    let apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('rc');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('exp');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');
  });

  it('returns PRD api url for beta or production env', async () => {
    // Act
    let apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('beta');

    // Assert
    expect(apiUrl).toEqual('https://api.prd');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('production');

    // Assert
    expect(apiUrl).toEqual('https://api.prd');
  });
});
