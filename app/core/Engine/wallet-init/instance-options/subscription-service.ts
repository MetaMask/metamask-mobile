import { Env } from '@metamask/subscription-controller';
import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { devApiEnv, type DevApiEnv } from '../../../devApiEnv';

type SubscriptionServiceInstanceOptions =
  WalletOptions['instanceOptions']['subscriptionService'];

const SUBSCRIPTION_ENV_BY_DEV_API_ENV: Record<DevApiEnv, Env> = {
  dev: Env.DEV,
  prod: Env.PRD,
};

/**
 * Mobile supplies fetch, env (aligned with AuthenticationController via
 * `devApiEnv`), and Sentry error capture for the wallet-owned
 * SubscriptionService.
 *
 * @returns The mobile SubscriptionService instance options.
 */
export function getSubscriptionServiceInstanceOptions(): SubscriptionServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    env: SUBSCRIPTION_ENV_BY_DEV_API_ENV[devApiEnv()],
    captureException,
  };
}
