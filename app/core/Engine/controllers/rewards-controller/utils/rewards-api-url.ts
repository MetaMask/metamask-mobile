import AppConstants from '../../../../AppConstants';

/**
 * Returns the rewards API base URL for the given MetaMask environment.
 * When GITHUB_ACTIONS (and not E2E), uses process.env.REWARDS_API_URL (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses AppConstants.REWARDS_API_URL per env.
 */
export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
    return process.env.REWARDS_API_URL as string;
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
