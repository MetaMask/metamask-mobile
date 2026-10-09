interface LighterFeatureEnvironment {
  METAMASK_ENVIRONMENT?: string;
  MM_PERPS_LIGHTER_PROVIDER_ENABLED?: string;
}

/**
 * Enables the experimental Lighter infrastructure only with an explicit
 * build-time opt-in, matching the gate that keeps the embedded signer out of
 * the bundle (see `Root/index.tsx` and `metro.config.js`).
 */
export function isLighterProviderEnabled(
  environment: LighterFeatureEnvironment = {
    METAMASK_ENVIRONMENT: process.env.METAMASK_ENVIRONMENT,
    MM_PERPS_LIGHTER_PROVIDER_ENABLED:
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED,
  },
): boolean {
  return environment.MM_PERPS_LIGHTER_PROVIDER_ENABLED === 'true';
}
