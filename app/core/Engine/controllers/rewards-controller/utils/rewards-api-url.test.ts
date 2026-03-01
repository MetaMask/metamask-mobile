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

  it('returns UAT api url for undefined or unknown env', async () => {
    // Act
    let apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv(undefined);

    // Assert
    expect(apiUrl).toEqual('https://api.uat');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('unknown');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');
  });

  it('returns UAT api url for e2e or exp env', async () => {
    // Act
    let apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('e2e');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('exp');

    // Assert
    expect(apiUrl).toEqual('https://api.uat');
  });

  it('returns PRD api url for production, beta, pre-release, or rc env', async () => {
    // Act
    let apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('production');

    // Assert
    expect(apiUrl).toEqual('https://api.prd');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('beta');

    // Assert
    expect(apiUrl).toEqual('https://api.prd');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('pre-release');

    // Assert
    expect(apiUrl).toEqual('https://api.prd');

    // Act
    apiUrl = getDefaultRewardsApiBaseUrlForMetaMaskEnv('rc');

    // Assert
    expect(apiUrl).toEqual('https://api.prd');
  });
});
