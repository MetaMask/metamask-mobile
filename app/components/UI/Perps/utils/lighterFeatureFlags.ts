interface LighterFeatureEnvironment {
  METAMASK_ENVIRONMENT?: string;
  MM_PERPS_LIGHTER_PROVIDER_ENABLED?: string;
}

/**
 * Enables the Lighter controller infrastructure automatically in local
 * development builds, while retaining an explicit opt-in for other builds.
 */
export function isLighterProviderEnabled(
  environment: LighterFeatureEnvironment = {
    METAMASK_ENVIRONMENT: process.env.METAMASK_ENVIRONMENT,
    MM_PERPS_LIGHTER_PROVIDER_ENABLED:
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED,
  },
): boolean {
  return (
    environment.METAMASK_ENVIRONMENT === 'dev' ||
    environment.MM_PERPS_LIGHTER_PROVIDER_ENABLED === 'true'
  );
}

/**
 * The provider/network selector is a developer tool and is never exposed by
 * the explicit infrastructure override in non-development builds.
 */
export function isPerpsProviderSelectorEnabled(
  environment: LighterFeatureEnvironment = {
    METAMASK_ENVIRONMENT: process.env.METAMASK_ENVIRONMENT,
    MM_PERPS_LIGHTER_PROVIDER_ENABLED:
      process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED,
  },
): boolean {
  return environment.METAMASK_ENVIRONMENT === 'dev';
}
