const PREDICT_API_URL_BY_CLUSTER = {
  dev: 'https://predict-api.dev-api.cx.metamask.io',
  uat: 'https://predict-api.uat-api.cx.metamask.io',
} as const;

const PREDICT_A2T_ISSUER_URL_BY_CLUSTER = {
  dev: 'https://authentication.dev-api.cx.metamask.io',
  uat: 'https://authentication.uat-api.cx.metamask.io',
} as const;

type PredictCluster = keyof typeof PREDICT_API_URL_BY_CLUSTER;

const explicitUrl = (override: string | undefined): string | undefined => {
  const trimmed = override?.trim();
  return trimmed || undefined;
};

/**
 * `dev` and a development build with no cluster use the dev hosts. `uat`
 * uses the UAT hosts. Prod, and a release build with no cluster, stay blank:
 * there is no production predict deployment yet.
 */
const predictCluster = (
  rawApiEnv: string | undefined,
  isDevelopment: boolean,
): PredictCluster | undefined => {
  const apiEnv = (rawApiEnv ?? '').trim().toLowerCase();
  if (apiEnv === 'dev' || (apiEnv === '' && isDevelopment)) {
    return 'dev';
  }
  if (apiEnv === 'uat') {
    return 'uat';
  }
  return undefined;
};

/**
 * Predict API base. `MM_PREDICT_API_URL` wins when set. Otherwise the host
 * follows `MM_API_ENV`: dev and a local development build use the dev API,
 * uat uses the UAT API, and prod stays blank.
 */
export const resolvePredictApiUrl = (
  rawApiEnv: string | undefined,
  override: string | undefined,
  isDevelopment: boolean,
): string | undefined => {
  const configured = explicitUrl(override);
  if (configured) {
    return configured;
  }
  const cluster = predictCluster(rawApiEnv, isDevelopment);
  return cluster ? PREDICT_API_URL_BY_CLUSTER[cluster] : undefined;
};

/**
 * A2T issuer base. `MM_PREDICT_A2T_URL` wins when set. Otherwise the host
 * follows `MM_API_ENV` with the same dev, local, uat, and prod rules as
 * the predict API.
 */
export const resolvePredictDeviceAuthIssuerUrl = (
  rawApiEnv: string | undefined,
  override: string | undefined,
  isDevelopment: boolean,
): string | undefined => {
  const configured = explicitUrl(override);
  if (configured) {
    return configured;
  }
  const cluster = predictCluster(rawApiEnv, isDevelopment);
  return cluster ? PREDICT_A2T_ISSUER_URL_BY_CLUSTER[cluster] : undefined;
};

/** Read at call time so a Metro session picks up `.js.env` after a restart. */
export const getPredictApiUrl = (): string | undefined =>
  resolvePredictApiUrl(
    process.env.MM_API_ENV,
    process.env.MM_PREDICT_API_URL,
    __DEV__,
  );
