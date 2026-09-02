import AppConstants from '../../../../AppConstants';

/**
 * Resolves the referral-program API base URL for a MetaMask environment.
 *
 * `REFERRAL_PROGRAM_API_URL` overrides everything so the app can be pointed at
 * a locally running backend. Otherwise the environment picks the DEV or PRD
 * host. UAT deliberately has no branch: the referral-program namespace is not
 * deployed there, so a UAT build falls back to DEV rather than resolving to a
 * host that answers nothing.
 *
 * Both env vars are inlined at build time by
 * `transform-inline-environment-variables`, so they are taken as default
 * parameters rather than read inside the body — that keeps the branches
 * reachable from a test, which cannot change an inlined value at runtime.
 *
 * @param metaMaskEnv - The build's MetaMask environment.
 * @param overrideUrl - Explicit base URL that wins over the environment map.
 * @returns The base URL, with no trailing slash.
 */
export function getReferralProgramApiBaseUrl(
  metaMaskEnv: string | undefined = process.env.METAMASK_ENVIRONMENT,
  overrideUrl: string | undefined = process.env.REFERRAL_PROGRAM_API_URL,
): string {
  if (overrideUrl) {
    return overrideUrl;
  }

  switch (metaMaskEnv) {
    case 'production':
    case 'beta':
    case 'pre-release':
    case 'rc':
      return AppConstants.REFERRAL_PROGRAM_API_URL.PRD;
    default:
      return AppConstants.REFERRAL_PROGRAM_API_URL.DEV;
  }
}
