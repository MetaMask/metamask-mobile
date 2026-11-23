import { getApiEnv } from '../../../../core/apiEnv';
import {
  resolvePredictCluster,
  type ClusterReading,
} from '../config/predictClusterUrls';

/** Registry content is shared by every supported Predict cluster. */
export const VENUE_PROFILE_REGISTRY_URL =
  'https://pub-4571681e7ae145b0abdff881a1172b04.r2.dev/predict/venue-profiles';

/** Remote reads are enabled only for a resolved dev or uat Predict cluster. */
export const resolveVenueProfileRegistryUrl = (
  reading: ClusterReading,
): string | undefined => {
  const cluster = resolvePredictCluster(reading);
  return cluster ? VENUE_PROFILE_REGISTRY_URL : undefined;
};

/** Read at call time so a Metro session picks up `.js.env` after a restart. */
export const getVenueProfileRegistryUrl = (): string | undefined =>
  resolveVenueProfileRegistryUrl({
    rawApiEnv: process.env.MM_API_ENV,
    apiEnv: getApiEnv(),
    isDevelopment: __DEV__,
  });
