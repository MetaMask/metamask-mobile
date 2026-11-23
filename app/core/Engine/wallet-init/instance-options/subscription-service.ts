import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { ApiEnv, getApiEnv } from '../../../apiEnv';

type SubscriptionServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['subscriptionService']
>;

/**
 * SubscriptionService base URL for each API cluster. Hosts have no trailing
 * slash and omit `/v1`; the service appends the API version itself.
 */
const SUBSCRIPTION_API_URL_BY_API_ENV: Record<ApiEnv, string> = {
  [ApiEnv.Dev]: 'https://subscription.dev-api.cx.metamask.io',
  [ApiEnv.Uat]: 'https://subscription.uat-api.cx.metamask.io',
  [ApiEnv.Prod]: 'https://subscription.api.cx.metamask.io',
};

/**
 * Mobile supplies fetch, the base URL (aligned with AuthenticationController
 * via `getApiEnv`), and Sentry error capture for the wallet-owned
 * SubscriptionService.
 *
 * @returns The mobile SubscriptionService instance options.
 */
export function getSubscriptionServiceInstanceOptions(): SubscriptionServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    baseUrl: SUBSCRIPTION_API_URL_BY_API_ENV[getApiEnv()],
    captureException,
  };
}
