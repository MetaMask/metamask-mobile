import AppConstants from '../../../../core/AppConstants';

/**
 * Returns the MetaMask Card API (CX) base URL for the given MetaMask environment.
 * When process.env.CARD_API_URL is set (set by builds.yml), uses it directly.
 * Otherwise (e.g. Jest, environments without builds.yml), uses AppConstants.CARD_API_URL per env.
 */
export const getDefaultCardApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  if (process.env.CARD_API_URL) {
    return process.env.CARD_API_URL;
  }
  switch (metaMaskEnv) {
    case 'e2e':
    case 'dev':
    case 'local':
      return AppConstants.CARD_API_URL.DEV;
    case 'pre-release':
    case 'exp':
    case 'beta':
      return AppConstants.CARD_API_URL.UAT;
    case 'production':
    case 'rc':
    default:
      return AppConstants.CARD_API_URL.PRD;
  }
};
