import AppConstants from '../../../../AppConstants';

const DEFAULT_REWARDS_API_URL = 'https://rewards.uat-api.cx.metamask.io';

/**
 * Returns the rewards API base URL for the given MetaMask environment.
 * When not Bitrise and not E2E (GitHub Actions / local), uses process.env.REWARDS_API_URL (set by builds.yml).
 * When Bitrise or E2E, uses AppConstants.REWARDS_API_URL per METAMASK_ENVIRONMENT.
 */
export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  if (process.env.BITRISE !== 'true' && process.env.E2E !== 'true') {
    return process.env.REWARDS_API_URL || DEFAULT_REWARDS_API_URL;
  }
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
