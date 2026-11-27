import { getApiEnv } from '../../../../core/apiEnv';
import {
  resolvePredictCluster,
  type ClusterReading,
} from '../config/predictClusterUrls';

/** Registry content is shared by every supported Predict cluster. */
export const VENUE_PROFILE_REGISTRY_URL =
  'https://client-config.api.cx.metamask.io/v1/config/predict/venue-profiles';

/** A configured override wins; otherwise reads follow a resolved cluster. */
export const resolveVenueProfileRegistryUrl = (
  reading: ClusterReading,
  override?: string,
): string | undefined => {
  const configured = override?.trim();
  if (configured) return configured;
  const cluster = resolvePredictCluster(reading);
  return cluster ? VENUE_PROFILE_REGISTRY_URL : undefined;
};

/** Read at call time so a Metro session picks up `.js.env` after a restart. */
export const getVenueProfileRegistryUrl = (): string | undefined =>
  resolveVenueProfileRegistryUrl(
    {
      rawApiEnv: process.env.MM_API_ENV,
      apiEnv: getApiEnv(),
      isDevelopment: __DEV__,
    },
    process.env.MM_VENUE_PROFILES_URL,
  );
