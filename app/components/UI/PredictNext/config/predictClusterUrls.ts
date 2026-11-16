import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';

const PREDICT_API_URL_BY_CLUSTER = {
  dev: 'https://predict-api.dev-api.cx.metamask.io',
  uat: 'https://predict-api.uat-api.cx.metamask.io',
} as const;

const PREDICT_A2T_ISSUER_URL_BY_CLUSTER = {
  dev: 'https://authentication.dev-api.cx.metamask.io',
  uat: 'https://authentication.uat-api.cx.metamask.io',
} as const;

type PredictCluster = keyof typeof PREDICT_API_URL_BY_CLUSTER;

/**
 * Prod, and any value `getApiEnv` reads as prod, have no predict host yet,
 * so they stay absent here and both hosts resolve blank.
 */
const PREDICT_CLUSTER_BY_API_ENV: Partial<Record<ApiEnv, PredictCluster>> = {
  [ApiEnv.Dev]: 'dev',
  [ApiEnv.Uat]: 'uat',
};

const explicitUrl = (override: string | undefined): string | undefined => {
  const trimmed = override?.trim();
  return trimmed || undefined;
};

/**
 * `dev` and a development build with no cluster use the dev hosts. `uat`
 * uses the UAT hosts. Prod stays blank: there is no production predict
 * deployment yet.
 *
 * Goes through `getApiEnv`, the single reading of `MM_API_ENV`, so predict
 * cannot resolve to a different environment than the A2T issuer it verifies
 * against. `getApiEnv` reads an unset value as prod, so the raw value decides
 * the local-development case itself.
 */
const predictCluster = (isDevelopment: boolean): PredictCluster | undefined => {
  if ((process.env.MM_API_ENV ?? '').trim() === '') {
    return isDevelopment ? 'dev' : undefined;
  }
  return PREDICT_CLUSTER_BY_API_ENV[getApiEnv()];
};

/**
 * Predict API base. `MM_PREDICT_API_URL` wins when set. Otherwise the host
 * follows `MM_API_ENV`: dev and a local development build use the dev API,
 * uat uses the UAT API, and prod stays blank.
 */
export const resolvePredictApiUrl = (
  override: string | undefined,
  isDevelopment: boolean,
): string | undefined => {
  const configured = explicitUrl(override);
  if (configured) {
    return configured;
  }
  const cluster = predictCluster(isDevelopment);
  return cluster ? PREDICT_API_URL_BY_CLUSTER[cluster] : undefined;
};

/**
 * A2T issuer base. `MM_PREDICT_A2T_URL` wins when set. Otherwise the host
 * follows `MM_API_ENV` with the same dev, local, uat, and prod rules as
 * the predict API.
 */
export const resolvePredictDeviceAuthIssuerUrl = (
  override: string | undefined,
  isDevelopment: boolean,
): string | undefined => {
  const configured = explicitUrl(override);
  if (configured) {
    return configured;
  }
  const cluster = predictCluster(isDevelopment);
  return cluster ? PREDICT_A2T_ISSUER_URL_BY_CLUSTER[cluster] : undefined;
};

/** Read at call time so a Metro session picks up `.js.env` after a restart. */
export const getPredictApiUrl = (): string | undefined =>
  resolvePredictApiUrl(process.env.MM_PREDICT_API_URL, __DEV__);

/** A2T issuer base, read the same way as `getPredictApiUrl`. */
export const getPredictDeviceAuthIssuerUrl = (): string | undefined =>
  resolvePredictDeviceAuthIssuerUrl(process.env.MM_PREDICT_A2T_URL, __DEV__);
