import { Env } from '@metamask/subscription-controller';
import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { ApiEnv, getApiEnv } from '../../../apiEnv';

type SubscriptionServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['subscriptionService']
>;

const SUBSCRIPTION_ENV_BY_API_ENV: Record<ApiEnv, Env> = {
  [ApiEnv.Dev]: Env.DEV,
  [ApiEnv.Uat]: Env.UAT,
  [ApiEnv.Prod]: Env.PRD,
};

/**
 * Mobile supplies fetch, env (aligned with AuthenticationController via
 * `getApiEnv`), and Sentry error capture for the wallet-owned
 * SubscriptionService.
 *
 * @returns The mobile SubscriptionService instance options.
 */
export function getSubscriptionServiceInstanceOptions(): SubscriptionServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    env: SUBSCRIPTION_ENV_BY_API_ENV[getApiEnv()],
    captureException,
  };
}
