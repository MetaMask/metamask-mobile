import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { ApiEnv, getApiEnv } from '../../../apiEnv';

type ShieldApiServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['shieldApiService']
>;

/**
 * ShieldApiService base URL for each API cluster. Hosts have no trailing slash.
 */
const SHIELD_API_URL_BY_API_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://ruleset-engine.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://ruleset-engine.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://ruleset-engine.api.cx.metamask.io',
};

/**
 * Mobile supplies fetch, the base URL (aligned with AuthenticationController
 * via `getApiEnv`), and Sentry error capture for the wallet-owned
 * ShieldApiService.
 *
 * @returns The mobile ShieldApiService instance options.
 */
export function getShieldApiServiceInstanceOptions(): ShieldApiServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    baseUrl: SHIELD_API_URL_BY_API_ENV[getApiEnv()],
    captureException,
  };
}
