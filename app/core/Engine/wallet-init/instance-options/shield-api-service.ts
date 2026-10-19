import { Env } from '@metamask/shield-controller';
import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { ApiEnv, getApiEnv } from '../../../apiEnv';

type ShieldApiServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['shieldApiService']
>;

const SHIELD_ENV_BY_API_ENV: Record<ApiEnv, Env> = {
  [ApiEnv.Dev]: Env.DEV,
  [ApiEnv.Uat]: Env.UAT,
  [ApiEnv.Prod]: Env.PRD,
};

/**
 * Mobile supplies fetch, env (aligned with AuthenticationController via
 * `getApiEnv`), and Sentry error capture for the wallet-owned
 * ShieldApiService.
 *
 * @returns The mobile ShieldApiService instance options.
 */
export function getShieldApiServiceInstanceOptions(): ShieldApiServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    env: SHIELD_ENV_BY_API_ENV[getApiEnv()],
    captureException,
  };
}
