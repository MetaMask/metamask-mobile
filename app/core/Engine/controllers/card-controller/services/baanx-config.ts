import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../../../../../components/UI/Card/util/mapBaanxApiUrl';
import type { CardProviderConfig } from '../provider-config';

/**
 * Resolves the API key and base URL for the Baanx provider
 * from environment variables and build-time constants.
 *
 * Env vars:
 * - `MM_CARD_BAANX_API_CLIENT_KEY` — API key (remapped per build by `scripts/build.sh`)
 * - `BAANX_API_URL` — base URL (set by GH Actions builds via `mapBaanxApiUrl`)
 * - `METAMASK_ENVIRONMENT` — used for local URL fallback
 */
export function resolveBaanxConfig(): CardProviderConfig {
  return {
    apiKey: process.env.MM_CARD_BAANX_API_CLIENT_KEY ?? '',
    baseUrl: getDefaultBaanxApiBaseUrlForMetaMaskEnv(
      process.env.METAMASK_ENVIRONMENT,
    ),
  };
}
