import AppConstants from '../../../../core/AppConstants';

export const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 20 * 60;

export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
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
      return AppConstants.BAANX_API_URL.PRD;
    default:
      return AppConstants.BAANX_API_URL.PRD;
  }
};

export const getBaanxApiBaseUrl = (): string =>
  process.env.BAANX_API_URL ||
  getDefaultBaanxApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);
