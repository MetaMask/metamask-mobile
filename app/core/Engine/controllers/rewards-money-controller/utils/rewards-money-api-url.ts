import AppConstants from '../../../../AppConstants';

// `10.0.2.2` is the Android emulator's alias for the host machine's loopback.
// Inside the emulator, `localhost` is the emulator itself.
const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'];

/**
 * A Money host on this machine (a locally started API, including one reached
 * through the Android emulator) may be switched to any other host. Every other
 * host is shown as the build's Money URL and the selector stays disabled.
 *
 * @param url - The build's resolved Money base URL.
 * @returns Whether the Money host can be switched.
 */
export const canChangeRewardsMoneyEnvUrl = (
  url: string | undefined,
): boolean => {
  if (!url) {
    return false;
  }
  try {
    return LOCALHOST_HOSTNAMES.includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

const defaultRewardsMoneyBaseUrl = (
  metaMaskEnv: string | undefined,
): string => {
  if (process.env.REWARDS_MONEY_API_URL) {
    return process.env.REWARDS_MONEY_API_URL;
  }

  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
      return AppConstants.REWARDS_MONEY_API_URL.UAT;
    case 'production':
    case 'beta':
    case 'pre-release':
    case 'rc':
      return AppConstants.REWARDS_MONEY_API_URL.PRD;
    case 'dev':
    case 'local':
    case 'test':
    default:
      return AppConstants.REWARDS_MONEY_API_URL.DEV;
  }
};

/**
 * Returns the Rewards Money API base URL for the given MetaMask environment.
 *
 * When `process.env.REWARDS_MONEY_API_URL` is set (builds.yml / local override),
 * uses it directly. Otherwise maps METAMASK_ENVIRONMENT to DEV/UAT/PRD.
 * Local/dev/test default to DEV (money's working cluster), unlike Rewards
 * which defaults those to UAT. The second value is `canChangeRewardsMoneyEnvUrl`
 * for that URL.
 */
export const getDefaultRewardsMoneyApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): [string, boolean] => {
  const url = defaultRewardsMoneyBaseUrl(metaMaskEnv);
  return [url, canChangeRewardsMoneyEnvUrl(url)];
};
