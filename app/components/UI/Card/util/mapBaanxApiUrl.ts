import AppConstants from '../../../../core/AppConstants';

export const getDefaultBaanxApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
  switch (metaMaskEnv) {
    case 'e2e':
    case 'exp':
    case 'rc':
    case 'pre-release':
      // Needs to be changed to UAT later. Baanx currently only has DEV env.
      return AppConstants.BAANX_API_URL.DEV;
    case 'production':
    case 'beta':
      // Needs to be changed to PRD later. Baanx currently only has DEV env.
      return AppConstants.BAANX_API_URL.DEV;
    case 'dev':
    case 'local':
    default:
      return AppConstants.BAANX_API_URL.DEV;
  }
};
