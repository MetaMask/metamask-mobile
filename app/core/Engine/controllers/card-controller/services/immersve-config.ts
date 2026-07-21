import { getDefaultImmersveApiBaseUrlForMetaMaskEnv } from '../../../../../components/UI/Card/util/mapImmersveApiUrl';
import type { CardProviderConfig } from '../provider-config';

export interface ImmersveProviderConfig extends CardProviderConfig {
  clientApplicationId: string;
  appUrl: string;
}

export function resolveImmersveConfig(): ImmersveProviderConfig {
  return {
    apiKey: process.env.MM_CARD_IMMERSVE_API_CLIENT_KEY ?? '',
    baseUrl:
      process.env.IMMERSVE_API_URL ||
      getDefaultImmersveApiBaseUrlForMetaMaskEnv(
        process.env.METAMASK_ENVIRONMENT,
      ),
    clientApplicationId:
      process.env.MM_CARD_IMMERSVE_CLIENT_APPLICATION_ID ?? '',
    appUrl: process.env.MM_CARD_IMMERSVE_APP_URL ?? 'https://metamask.app.link',
  };
}
