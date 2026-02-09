import AppConstants from '../../../../core/AppConstants';

export const getDefaultCardApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
) => {
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
      return AppConstants.CARD_API_URL.PRD;
    default:
      return AppConstants.CARD_API_URL.PRD;
  }
};
