/**
 * Whether this build runs the MFA dev tools (the QA presets). Also the
 * fallback for the `mfaUiKit` remote flag, which decides whether the MFA
 * screens can be reached.
 *
 * @param environment - The build's `METAMASK_ENVIRONMENT`, inlined at build time.
 * @returns `false` in production and beta builds.
 */
export const isMfaDevBuild = (
  environment = process.env.METAMASK_ENVIRONMENT,
): boolean => environment !== 'production' && environment !== 'beta';
