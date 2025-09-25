import AppConstants from '../../../../AppConstants';

export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
    case 'rc':
    case 'pre-release':
      return AppConstants.REWARDS_API_URL.UAT;
    case 'production':
    case 'beta':
      return AppConstants.REWARDS_API_URL.PRD;
    case 'dev':
    case 'local':
    default:
      return AppConstants.REWARDS_API_URL.UAT; // temporary for v7.57, should be moved to DEV later
  }
};
