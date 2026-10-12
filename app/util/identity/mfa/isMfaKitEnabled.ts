/**
 * Whether the MFA screens can be reached in this build.
 *
 * @param environment - The build's `METAMASK_ENVIRONMENT`, inlined at build time.
 * @returns `false` in production and beta builds.
 */
export const isMfaKitEnabled = (
  environment = process.env.METAMASK_ENVIRONMENT,
): boolean => environment !== 'production' && environment !== 'beta';
