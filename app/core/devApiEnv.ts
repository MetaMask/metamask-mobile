import { Env } from '@metamask/profile-sync-controller/sdk';

/**
 * Switch that selects which backend env mobile talks to.
 *
 * `MM_DEV_API_ENV` (`dev`, `uat`, or `prod`) overrides the build flavor.
 * When it is unset, the flavor selects the cluster: `dev` → dev,
 * `exp` → uat, and every other flavor → prod.
 * Services without a host for the selected env keep their own URL.
 *
 * Read synchronously at controller-init time — no Redux, no remote flag,
 * no ordering between controllers required. Each consumer reads the same
 * source independently.
 */

export type DevApiEnv = 'dev' | 'uat' | 'prod';

/**
 * Read at call time (not module load) so tests can set/unset
 * `process.env.MM_DEV_API_ENV` without juggling the module cache.
 *
 * Disclaimer: Enabling dev will break authenticated services that had
 * not adopted our new dev authentication standards.
 */
export const devApiEnv = (): DevApiEnv => {
  const raw = (process.env.MM_DEV_API_ENV ?? '').toLowerCase();
  if (raw === 'dev' || raw === 'uat' || raw === 'prod') {
    return raw;
  }

  switch ((process.env.METAMASK_ENVIRONMENT ?? '').toLowerCase()) {
    case 'dev':
      return 'dev';
    case 'exp':
    case 'uat':
      return 'uat';
    default:
      return 'prod';
  }
};

const AUTH_ENV_BY_DEV_API_ENV: Record<DevApiEnv, Env> = {
  dev: Env.DEV,
  uat: Env.UAT,
  prod: Env.PRD,
};

/** `Env` enum value to hand to `AuthenticationController` / `profile-sync` SDK. */
export const authEnv = (): Env => AUTH_ENV_BY_DEV_API_ENV[devApiEnv()];
