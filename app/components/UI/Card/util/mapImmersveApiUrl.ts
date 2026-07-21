import AppConstants from '../../../../core/AppConstants';

export const getDefaultImmersveApiBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  if (process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true') {
    return process.env.IMMERSVE_API_URL as string;
  }
  switch (metaMaskEnv) {
    case 'e2e':
    case 'dev':
    case 'local':
    case 'pre-release':
    case 'exp':
    case 'beta':
      return AppConstants.IMMERSVE_API_URL.DEV;
    case 'production':
    case 'rc':
    default:
      return AppConstants.IMMERSVE_API_URL.PRD;
  }
};
