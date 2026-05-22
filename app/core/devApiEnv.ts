import { Env } from '@metamask/profile-sync-controller/sdk';

/**
 * Switch that selects which backend env mobile talks to.
 *
 * Set `MM_DEV_API_ENV=dev` in `.js.env` to point the auth
 * controller and every downstream JWT-consuming service at non-prod
 * backends. Defaults to prod when unset or unrecognized.
 *
 * Read synchronously at controller-init time — no Redux, no remote flag,
 * no ordering between controllers required. Each consumer reads the same
 * source independently.
 */

export type DevApiEnv = 'dev' | 'prod';

/**
 * Read at call time (not module load) so tests can set/unset
 * `process.env.MM_DEV_API_ENV` without juggling the module cache.
 *
 * Disclaimer: Enabling dev will break authenticated services that had
 * not adopted our new dev authentication standards.
 */
export const devApiEnv = (): DevApiEnv => {
  const raw = (process.env.MM_DEV_API_ENV ?? '').toLowerCase();
  return raw === 'dev' ? 'dev' : 'prod';
};

const AUTH_ENV_BY_DEV_API_ENV: Record<DevApiEnv, Env> = {
  dev: Env.DEV,
  prod: Env.PRD,
};

/** `Env` enum value to hand to `AuthenticationController` / `profile-sync` SDK. */
export const authEnv = (): Env => AUTH_ENV_BY_DEV_API_ENV[devApiEnv()];
