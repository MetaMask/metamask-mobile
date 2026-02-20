import AppConstants from '../../../../core/AppConstants';

const DEFAULT_BAANX_API_URL = 'https://dev.api.baanx.com';

/**
 * Returns the Baanx API base URL for the given MetaMask environment.
 * When GITHUB_ACTIONS (and not E2E), uses process.env.BAANX_API_URL (set by builds.yml).
 * When not (Bitrise / .js.env / E2E), uses AppConstants.BAANX_API_URL per env.
 */
export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true') {
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
