import AppConstants from '../../../../AppConstants';
import type { CardProviderConfig } from '../provider-config';

/**
 * Returns the API base URL for the current MetaMask environment.
 *
 * Resolution order:
 * 1. GH Actions builds: `process.env.BAANX_API_URL` (set by builds.yml)
 * 2. Local / Bitrise: `AppConstants.BAANX_API_URL` keyed by `METAMASK_ENVIRONMENT`
 */
function getBaseUrl(): string {
  if (process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true') {
    return process.env.BAANX_API_URL as string;
  }

  switch (process.env.METAMASK_ENVIRONMENT) {
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
    default:
      return AppConstants.BAANX_API_URL.PRD;
  }
}

/**
 * Resolves the API key and base URL for the Baanx provider
 * from environment variables and build-time constants.
 *
 * Env vars:
 * - `MM_CARD_BAANX_API_CLIENT_KEY` — API key (remapped per build by `scripts/build.sh`)
 * - `BAANX_API_URL` — base URL (set by GH Actions builds)
 * - `METAMASK_ENVIRONMENT` — used for local URL fallback
 */
export function resolveBaanxConfig(): CardProviderConfig {
  return {
    apiKey: process.env.MM_CARD_BAANX_API_CLIENT_KEY ?? '',
    baseUrl: getBaseUrl(),
  };
}
