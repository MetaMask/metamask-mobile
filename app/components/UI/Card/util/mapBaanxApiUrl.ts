import AppConstants from '../../../../core/AppConstants';

/**
 * Returns the Baanx API base URL for the given MetaMask environment.
 * When process.env.BAANX_API_URL is set (set by builds.yml), uses it directly.
 * Otherwise (e.g. Jest, environments without builds.yml), uses AppConstants.BAANX_API_URL per env.
 */
export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  if (process.env.BAANX_API_URL) {
    return process.env.BAANX_API_URL;
  }
  switch (metaMaskEnv) {
    case 'e2e':
    case 'dev':
    case 'local':
      return AppConstants.BAANX_API_URL.DEV;
    case 'pre-release':
    case 'exp':
    case 'beta':
      return AppConstants.BAANX_API_URL.UAT;
    case 'production':
    case 'rc':
    default:
      return AppConstants.BAANX_API_URL.PRD;
  }
};
