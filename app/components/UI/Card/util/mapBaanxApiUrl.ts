import AppConstants from '../../../../core/AppConstants';

const DEFAULT_BAANX_API_URL = 'https://dev.api.baanx.com';

/**
 * Returns the Baanx API base URL for the given MetaMask environment.
 * TEMPORARY: When GITHUB_ACTIONS, uses process.env.BAANX_API_URL (set by builds.yml).
 * When not (Bitrise / .js.env), uses AppConstants.BAANX_API_URL per env. Remove condition once Bitrise is deprecated.
 */
export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  if (process.env.GITHUB_ACTIONS === 'true') {
    return process.env.BAANX_API_URL || DEFAULT_BAANX_API_URL;
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
