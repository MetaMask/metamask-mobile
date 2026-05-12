import { Env } from '@metamask/profile-sync-controller/sdk';

/**
 * Build-time switch that selects which backend env mobile talks to.
 *
 * Set `MM_DEV_API_ENV=dev` (or `uat`) in `.js.env` to point the auth
 * controller and every downstream JWT-consuming service at non-prod
 * backends. Defaults to prod when unset or unrecognized.
 *
 * Read synchronously at controller-init time — no Redux, no remote flag,
 * no ordering between controllers required. Each consumer reads the same
 * source independently.
 */

export type DevApiEnv = 'dev' | 'uat' | 'prod';

/**
 * Read at call time (not module load) so tests can set/unset
 * `process.env.MM_DEV_API_ENV` without juggling the module cache.
 */
export const devApiEnv = (): DevApiEnv => {
  const raw = (process.env.MM_DEV_API_ENV ?? '').toLowerCase();
  return raw === 'dev' ? 'dev' : raw === 'uat' ? 'uat' : 'prod';
};

export const isDevApiEnv = (): boolean => devApiEnv() !== 'prod';

const AUTH_ENV_BY_DEV_API_ENV: Record<DevApiEnv, Env> = {
  dev: Env.DEV,
  uat: Env.UAT,
  prod: Env.PRD,
};

/** `Env` enum value to hand to `AuthenticationController` / `profile-sync` SDK. */
export const authEnv = (): Env => AUTH_ENV_BY_DEV_API_ENV[devApiEnv()];

/**
 * Rewrite a prod cx.metamask.io URL to its dev-api counterpart when
 * `MM_DEV_API_ENV` is non-prod. Returns the input unchanged otherwise.
 *
 * Most cx.metamask.io services follow `*.api.cx.metamask.io` ↔
 * `*.dev-api.cx.metamask.io`. Callers should verify their service follows
 * this convention; if not, switch on `devApiEnv()` explicitly instead.
 */
export const apiUrl = (prodUrl: string): string =>
  isDevApiEnv()
    ? prodUrl.replace('.api.cx.metamask.io', '.dev-api.cx.metamask.io')
    : prodUrl;
