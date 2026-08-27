import { Env } from '@metamask/shield-controller';
import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { devApiEnv, type DevApiEnv } from '../../../devApiEnv';

type ShieldApiServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['shieldApiService']
>;

const SHIELD_ENV_BY_DEV_API_ENV: Record<DevApiEnv, Env> = {
  dev: Env.DEV,
  prod: Env.PRD,
};

/**
 * Mobile supplies fetch, env (aligned with AuthenticationController via
 * `devApiEnv`), and Sentry error capture for the wallet-owned
 * ShieldApiService.
 *
 * @returns The mobile ShieldApiService instance options.
 */
export function getShieldApiServiceInstanceOptions(): ShieldApiServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    env: SHIELD_ENV_BY_DEV_API_ENV[devApiEnv()],
    captureException,
  };
}
