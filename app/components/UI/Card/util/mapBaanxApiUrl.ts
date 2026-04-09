import AppConstants from '../../../../core/AppConstants';

/**
 * Returns the Baanx API base URL for the given MetaMask environment.
 * When BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY (and not E2E), uses process.env.BAANX_API_URL (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses AppConstants.BAANX_API_URL per env.
 */
export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  if (process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true') {
    return process.env.BAANX_API_URL as string;
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
