import { Env } from '@metamask/profile-sync-controller/sdk';

/**
 * Cluster that selects which backend env mobile talks to.
 *
 * Hosts are grouped in `builds.yml` (`api_prod`, `api_dev`, `api_uat`).
 * Each anchor sets `MM_API_ENV`, which enum clients read. A local
 * `.js.env` overrides the build. An unset or unrecognized value is prod.
 * `METAMASK_ENVIRONMENT` does not select the cluster.
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
export const getApiEnv = (): ApiEnv =>
  API_ENV_BY_VALUE[(process.env.MM_API_ENV ?? '').toLowerCase()] ?? ApiEnv.Prod;

const AUTH_ENV_BY_API_ENV: Record<ApiEnv, Env> = {
  [ApiEnv.Dev]: Env.DEV,
  [ApiEnv.Uat]: Env.UAT,
  [ApiEnv.Prod]: Env.PRD,
};

/** `Env` enum value to hand to `AuthenticationController` / `profile-sync` SDK. */
export const authEnv = (): Env => AUTH_ENV_BY_API_ENV[getApiEnv()];
