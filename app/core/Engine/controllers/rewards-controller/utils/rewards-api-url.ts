import AppConstants from '../../../../AppConstants';

const DEFAULT_REWARDS_API_URL = 'https://rewards.uat-api.cx.metamask.io';

/**
 * Returns the rewards API base URL for the given MetaMask environment.
 * TEMPORARY: When GITHUB_ACTIONS, uses process.env.REWARDS_API_URL (set by builds.yml).
 * When not (Bitrise / .js.env), uses AppConstants.REWARDS_API_URL per env. Remove condition once Bitrise is deprecated.
 */
export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  if (process.env.GITHUB_ACTIONS === 'true') {
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
