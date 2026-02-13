import AppConstants from '../../../../AppConstants';

const DEFAULT_REWARDS_API_URL = 'https://rewards.uat-api.cx.metamask.io';

/**
 * Returns the rewards API base URL for the given MetaMask environment.
 * TEMPORARY: When GITHUB_ACTIONS (and not E2E), uses process.env.REWARDS_API_URL (set by builds.yml).
 * E2E builds run in GitHub but use workflow env (e.g. METAMASK_ENVIRONMENT); use AppConstants path there.
 * When not (Bitrise / .js.env / E2E), uses AppConstants.REWARDS_API_URL per env. Remove once Bitrise is deprecated.
 */
export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
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
