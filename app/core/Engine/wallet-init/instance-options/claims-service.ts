import { Env } from '@metamask/claims-controller';
import type { WalletOptions } from '@metamask/wallet';
import { captureException } from '@sentry/react-native';
import { devApiEnv, type DevApiEnv } from '../../../devApiEnv';

type ClaimsServiceInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['claimsService']
>;

const CLAIMS_ENV_BY_DEV_API_ENV: Record<DevApiEnv, Env> = {
  dev: Env.DEV,
  prod: Env.PRD,
};

/**
 * Mobile supplies fetch, env (aligned with AuthenticationController via
 * `devApiEnv`), and Sentry error capture for the wallet-owned ClaimsService.
 *
 * @returns The mobile ClaimsService instance options.
 */
export function getClaimsServiceInstanceOptions(): ClaimsServiceInstanceOptions {
  return {
    fetchFunction: fetch,
    env: CLAIMS_ENV_BY_DEV_API_ENV[devApiEnv()],
    captureException,
  };
}
