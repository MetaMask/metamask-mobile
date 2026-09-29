import { Env } from '@metamask/profile-sync-controller/sdk';

/**
 * Cluster that selects which backend env mobile talks to.
 *
 * Hosts are grouped in `builds.yml` (`api_prod`, `api_dev`, `api_uat`).
 * Enum clients do not read those URLs. When `MM_API_ENV` is unset, the
 * flavor selects their cluster: `dev` → dev, `exp` → uat, and every
 * other flavor → prod. Set `MM_API_ENV` only when that flavor would
 * pick the wrong cluster. A local `.js.env` overrides the build.
 * Services without a host for the selected env keep their own URL.
 *
 * Read synchronously at controller-init time — no Redux, no remote flag,
 * no ordering between controllers required. Each consumer reads the same
 * source independently.
 */
export enum ApiEnv {
  Dev = 'dev',
  Uat = 'uat',
  Prod = 'prod',
}

const API_ENV_BY_VALUE: Record<string, ApiEnv> = {
  [ApiEnv.Dev]: ApiEnv.Dev,
  [ApiEnv.Uat]: ApiEnv.Uat,
  [ApiEnv.Prod]: ApiEnv.Prod,
};

/**
 * Read at call time (not module load) so tests can set/unset
 * `process.env.MM_API_ENV` without juggling the module cache.
 *
 * Disclaimer: Enabling dev will break authenticated services that had
 * not adopted our new dev authentication standards.
 *
 * @returns The cluster for this build.
 */
export const getApiEnv = (): ApiEnv => {
  const override =
    API_ENV_BY_VALUE[(process.env.MM_API_ENV ?? '').toLowerCase()];
  if (override) {
    return override;
  }

  switch ((process.env.METAMASK_ENVIRONMENT ?? '').toLowerCase()) {
    case 'dev':
      return ApiEnv.Dev;
    case 'exp':
    case 'uat':
      return ApiEnv.Uat;
    default:
      return ApiEnv.Prod;
  }
};

const AUTH_ENV_BY_API_ENV: Record<ApiEnv, Env> = {
  [ApiEnv.Dev]: Env.DEV,
  [ApiEnv.Uat]: Env.UAT,
  [ApiEnv.Prod]: Env.PRD,
};

/** `Env` enum value to hand to `AuthenticationController` / `profile-sync` SDK. */
export const authEnv = (): Env => AUTH_ENV_BY_API_ENV[getApiEnv()];
