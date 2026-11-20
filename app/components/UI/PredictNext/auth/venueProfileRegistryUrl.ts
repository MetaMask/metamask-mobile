import { getApiEnv } from '../../../../core/apiEnv';
import {
  resolvePredictCluster,
  type ClusterReading,
  type PredictCluster,
} from '../config/predictClusterUrls';

/**
 * The client-config host for each Predict cluster. These are code constants:
 * nothing from predict-api, remote config or the registry can change which
 * host the phone reads profiles from.
 *
 * Prod has a host constant but no Predict cluster yet; `resolvePredictCluster`
 * returns undefined for prod, so `getVenueProfileRegistryUrl()` stays
 * undefined until there is a prod predict deployment.
 */
const REGISTRY_URL_BY_CLUSTER: Record<PredictCluster | 'prod', string> = {
  dev: 'https://client-config.dev-api.cx.metamask.io',
  uat: 'https://client-config.uat-api.cx.metamask.io',
  prod: 'https://client-config.api.cx.metamask.io',
};

/** The path prefix client-config serves the predict R2 prefix under. */
export const VENUE_PROFILE_REGISTRY_PATH = 'v1/config/predict/venue-profiles';

/** Resolves the registry host from the same reading of `MM_API_ENV` the
 * predict API and A2T issuer use. */
export const resolveVenueProfileRegistryUrl = (
  reading: ClusterReading,
): string | undefined => {
  const cluster = resolvePredictCluster(reading);
  return cluster ? REGISTRY_URL_BY_CLUSTER[cluster] : undefined;
};

/** Read at call time so a Metro session picks up `.js.env` after a restart. */
export const getVenueProfileRegistryUrl = (): string | undefined =>
  resolveVenueProfileRegistryUrl({
    rawApiEnv: process.env.MM_API_ENV,
    apiEnv: getApiEnv(),
    isDevelopment: __DEV__,
  });

/** The environment part of the persisted cache key. `undefined` means the
 * build has no registry host, so nothing remote can be stored or read. */
export const getVenueProfileRegistryEnvironment = (): string | undefined => {
  const url = getVenueProfileRegistryUrl();
  return url ? new URL(url).hostname : undefined;
};
