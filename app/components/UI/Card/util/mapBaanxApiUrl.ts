import AppConstants from '../../../../core/AppConstants';

export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
    case 'rc':
    case 'pre-release':
    case 'dev':
    case 'local':
      // Needs to be DEV to test the integration with Baanx on nightly build.
      return AppConstants.BAANX_API_URL.DEV;
    case 'production':
    case 'beta':
      return AppConstants.BAANX_API_URL.PRD;
    default:
      return AppConstants.BAANX_API_URL.PRD;
  }
};
