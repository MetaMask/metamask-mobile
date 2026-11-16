import AppConstants from '../../../../AppConstants';

/**
 * A local build may point Money at any host. Every other build shows its
 * own Money URL and the selector stays disabled.
 *
 * @param metaMaskEnv - `METAMASK_ENVIRONMENT`.
 * @returns Whether the Money host can be switched.
 */
export const canChangeRewardsMoneyEnvUrl = (
  metaMaskEnv: string | undefined,
): boolean => metaMaskEnv === 'local';

/**
 * Returns the Rewards Money API base URL for the given MetaMask environment.
 *
 * When `process.env.REWARDS_MONEY_API_URL` is set (builds.yml / local override),
 * uses it directly. Otherwise maps METAMASK_ENVIRONMENT to DEV/UAT/PRD.
 * Local/dev/test default to DEV (money's working cluster), unlike Rewards
 * which defaults those to UAT.
 */
export const getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): [string, boolean] => {
  const canChange = canChangeRewardsMoneyEnvUrl(metaMaskEnv);

  if (process.env.REWARDS_MONEY_API_URL) {
    return [process.env.REWARDS_MONEY_API_URL, canChange];
  }

  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
      return [AppConstants.REWARDS_MONEY_API_URL.UAT, canChange];
    case 'production':
    case 'beta':
    case 'pre-release':
    case 'rc':
      return [AppConstants.REWARDS_MONEY_API_URL.PRD, canChange];
    case 'dev':
    case 'local':
    case 'test':
    default:
      return [AppConstants.REWARDS_MONEY_API_URL.DEV, canChange];
  }
};
