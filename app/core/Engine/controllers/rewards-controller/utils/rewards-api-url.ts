import AppConstants from '../../../../AppConstants';

export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
      return AppConstants.REWARDS_API_URL.UAT;
    case 'production':
    case 'beta':
    case 'pre-release':
    case 'rc':
      return AppConstants.REWARDS_API_URL.PRD;
    case 'dev':
    case 'local':
    default:
      return AppConstants.REWARDS_API_URL.UAT;
  }
};
