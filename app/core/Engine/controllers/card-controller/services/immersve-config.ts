import { getDefaultImmersveApiBaseUrlForMetaMaskEnv } from '../../../../../components/UI/Card/util/mapImmersveApiUrl';
import { getDefaultImmersveSecureApiBaseUrlForMetaMaskEnv } from '../../../../../components/UI/Card/util/mapImmersveSecureApiUrl';
import type { CardProviderConfig } from '../provider-config';

export interface ImmersveProviderConfig extends CardProviderConfig {
  clientApplicationId: string;
  appUrl: string;
  secureBaseUrl: string;
}

export function resolveImmersveConfig(): ImmersveProviderConfig {
  return {
    apiKey: process.env.MM_CARD_IMMERSVE_API_CLIENT_KEY ?? '',
    baseUrl:
      process.env.IMMERSVE_API_URL ||
      getDefaultImmersveApiBaseUrlForMetaMaskEnv(
        process.env.METAMASK_ENVIRONMENT,
      ),
    secureBaseUrl:
      process.env.IMMERSVE_SECURE_API_URL ||
      getDefaultImmersveSecureApiBaseUrlForMetaMaskEnv(
        process.env.METAMASK_ENVIRONMENT,
      ),
    clientApplicationId:
      process.env.MM_CARD_IMMERSVE_CLIENT_APPLICATION_ID ?? '',
    appUrl: process.env.MM_CARD_IMMERSVE_APP_URL ?? 'https://metamask.app.link',
  };
}
