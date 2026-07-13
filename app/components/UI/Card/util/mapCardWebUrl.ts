import AppConstants from '../../../../core/AppConstants';

/**
 * Returns the Baanx card web base URL for the given MetaMask environment.
 * The reset/login web flow lives on a different host per environment, so this
 * mirrors the API mapping in `mapBaanxApiUrl` (there is no build-time env var
 * for the web URL, so it always resolves from AppConstants).
 */
export const getCardWebBaseUrlForMetaMaskEnv = (
  metaMaskEnv: string | undefined,
): string => {
  switch (metaMaskEnv) {
    case 'e2e':
    case 'dev':
    case 'local':
      return AppConstants.CARD.WEB_URL.DEV;
    case 'pre-release':
    case 'exp':
    case 'beta':
      return AppConstants.CARD.WEB_URL.UAT;
    case 'production':
    case 'rc':
    default:
      return AppConstants.CARD.WEB_URL.PRD;
  }
};
