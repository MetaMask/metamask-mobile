import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { ApiEnv, getApiEnv } from '../../../apiEnv';

type ClaimsServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['claimsService']
>;

/**
 * ClaimsService base URL for each API cluster. Hosts have no trailing slash.
 */
const CLAIMS_API_URL_BY_API_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://claims.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://claims.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://claims.api.cx.metamask.io',
};

/**
 * Mobile supplies fetch, the base URL (aligned with AuthenticationController
 * via `getApiEnv`), and Sentry error capture for the wallet-owned
 * ClaimsService.
 *
 * @returns The mobile ClaimsService instance options.
 */
export function getClaimsServiceInstanceOptions(): ClaimsServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    baseUrl: CLAIMS_API_URL_BY_API_ENV[getApiEnv()],
    captureException,
  };
}
