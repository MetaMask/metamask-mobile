const DEV_ENVIRONMENTS = new Set(['dev', 'local', 'test']);

/**
 * Whether this build runs the MFA recovery dev tools (developer options
 * section and the dev fallback for the `mfaRecovery` remote flag).
 *
 * Uses an explicit allowlist so non-dev environments (`production`, `beta`,
 * `pre-release`, `rc`, `e2e`, `exp`, or unknown values) fail closed.
 *
 * @param environment - The build's `METAMASK_ENVIRONMENT`, inlined at build time.
 * @returns `true` only in explicit dev builds (`dev`, `local`, `test`).
 */
export const isMfaDevRecoveryBuild = (
  environment = process.env.METAMASK_ENVIRONMENT,
): boolean => environment !== undefined && DEV_ENVIRONMENTS.has(environment);
