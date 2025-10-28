import AppConstants from '../../../../core/AppConstants';

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
