import AppConstants from '../../../../core/AppConstants';

export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
    case 'pre-release':
    case 'dev':
    case 'local':
      return AppConstants.BAANX_API_URL.DEV;
    case 'rc':
    case 'production':
    case 'beta':
      return AppConstants.BAANX_API_URL.PRD;
    default:
      return AppConstants.BAANX_API_URL.PRD;
  }
};
