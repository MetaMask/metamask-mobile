import AppConstants from '../../../../AppConstants';

export const REWARDS_ENV_CHANGE_ALLOWED = [
  'dev',
  'e2e',
  'local',
  'pre-release',
  'exp',
  'beta',
  'rc',
  'test',
];

export const canChangeRewardsEnvUrl = (
  metaMaskEnv: string | undefined,
): boolean => REWARDS_ENV_CHANGE_ALLOWED.includes(metaMaskEnv ?? '');

/**
 * Returns the rewards API base URL for the given MetaMask environment.
 * When GITHUB_ACTIONS (and not E2E), uses process.env.REWARDS_API_URL (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses AppConstants.REWARDS_API_URL per env.
 */
export const getDefaultRewardsApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): [string, boolean] => {
  const canChange = canChangeRewardsEnvUrl(metaMaskEnv);

  if (
    process.env.REWARDS_API_URL &&
    process.env.GITHUB_ACTIONS === 'true' &&
    process.env.E2E !== 'true'
  ) {
    return [process.env.REWARDS_API_URL, canChange];
  }

  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
      return [AppConstants.REWARDS_API_URL.UAT, canChange];
    case 'production':
    case 'beta':
    case 'pre-release':
    case 'rc':
      return [AppConstants.REWARDS_API_URL.PRD, canChange];
    case 'dev':
    case 'local':
    case 'test':
    default:
      return [AppConstants.REWARDS_API_URL.UAT, canChange];
  }
};
