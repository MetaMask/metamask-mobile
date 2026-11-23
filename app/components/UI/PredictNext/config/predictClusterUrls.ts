import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';

const PREDICT_API_URL_BY_CLUSTER = {
  dev: 'https://predict-api.dev-api.cx.metamask.io',
  uat: 'https://predict-api.uat-api.cx.metamask.io',
} as const;

const PREDICT_A2T_ISSUER_URL_BY_CLUSTER = {
  dev: 'https://authentication.dev-api.cx.metamask.io',
  uat: 'https://authentication.uat-api.cx.metamask.io',
} as const;

export type PredictCluster = keyof typeof PREDICT_API_URL_BY_CLUSTER;

/**
 * Prod, and any value `getApiEnv` reads as prod, have no predict host yet,
 * so they stay absent here and both hosts resolve blank.
 */
const PREDICT_CLUSTER_BY_API_ENV: Partial<Record<ApiEnv, PredictCluster>> = {
  [ApiEnv.Dev]: 'dev',
  [ApiEnv.Uat]: 'uat',
};

/** The two env readings a cluster decision needs, plus the build type. */
export interface ClusterReading {
  /** `MM_API_ENV` as written, used to tell "unset" from "set to prod". */
  rawApiEnv: string | undefined;
  /** `getApiEnv()`'s reading of `rawApiEnv`. */
  apiEnv: ApiEnv;
  isDevelopment: boolean;
}

const explicitUrl = (override: string | undefined): string | undefined => {
  const trimmed = override?.trim();
  return trimmed || undefined;
};

/**
 * `dev` and a development build with no cluster use the dev hosts. `uat`
 * uses the UAT hosts. Prod stays blank: there is no production predict
 * deployment yet.
 *
 * The cluster comes from `getApiEnv()`, the single reading of `MM_API_ENV`,
 * so predict cannot resolve to a different environment than the A2T issuer
 * it verifies against. The raw value decides the local-development case,
 * because `getApiEnv` reads an unset variable as prod.
 */
export const resolvePredictCluster = ({
  rawApiEnv,
  apiEnv,
  isDevelopment,
}: ClusterReading): PredictCluster | undefined => {
  if ((rawApiEnv ?? '').trim() === '') {
    return isDevelopment ? 'dev' : undefined;
  }
  return PREDICT_CLUSTER_BY_API_ENV[apiEnv];
};

/**
 * Predict API base. `MM_PREDICT_API_URL` wins when set. Otherwise the host
 * follows `MM_API_ENV`: dev and a local development build use the dev API,
 * uat uses the UAT API, and prod stays blank.
 */
export const resolvePredictApiUrl = (
  reading: ClusterReading,
  override: string | undefined,
): string | undefined => {
  const configured = explicitUrl(override);
  if (configured) {
    return configured;
  }
  const cluster = resolvePredictCluster(reading);
  return cluster ? PREDICT_API_URL_BY_CLUSTER[cluster] : undefined;
};

/**
 * A2T issuer base. `MM_PREDICT_A2T_URL` wins when set. Otherwise the host
 * follows `MM_API_ENV` with the same dev, local, uat, and prod rules as
 * the predict API.
 */
export const resolvePredictDeviceAuthIssuerUrl = (
  reading: ClusterReading,
  override: string | undefined,
): string | undefined => {
  const configured = explicitUrl(override);
  if (configured) {
    return configured;
  }
  const cluster = resolvePredictCluster(reading);
  return cluster ? PREDICT_A2T_ISSUER_URL_BY_CLUSTER[cluster] : undefined;
};

/** Read at call time so a Metro session picks up `.js.env` after a restart. */
export const getPredictApiUrl = (): string | undefined =>
  resolvePredictApiUrl(
    {
      rawApiEnv: process.env.MM_API_ENV,
      apiEnv: getApiEnv(),
      isDevelopment: __DEV__,
    },
    process.env.MM_PREDICT_API_URL,
  );

/** A2T issuer base, read the same way as `getPredictApiUrl`. */
export const getPredictDeviceAuthIssuerUrl = (): string | undefined =>
  resolvePredictDeviceAuthIssuerUrl(
    {
      rawApiEnv: process.env.MM_API_ENV,
      apiEnv: getApiEnv(),
      isDevelopment: __DEV__,
    },
    process.env.MM_PREDICT_A2T_URL,
  );
