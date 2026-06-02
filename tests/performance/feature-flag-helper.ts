import axios, { isAxiosError } from 'axios';
import { createLogger } from '../framework/logger';
import { sleep } from '../framework/Utilities.ts';

const CLIENT_CONFIG_URL = 'https://client-config.api.cx.metamask.io/v1/flags';

const MAX_RETRIES_ON_4XX = 3;
const RETRY_DELAY_MS = 1_000;

const logger = createLogger({ name: 'feature-flag-helper' });

function is4xxStatus(status: number): boolean {
  return status >= 400 && status < 500;
}

function buildFeatureFlagUrl(
  distribution: string,
  environment: string,
): string {
  const params = new URLSearchParams({
    client: 'mobile',
    distribution,
    environment,
  });
  return `${CLIENT_CONFIG_URL}?${params.toString()}`;
}

function formatResponseBody(data: unknown): string {
  if (data === undefined || data === null) {
    return '(empty)';
  }
  if (typeof data === 'string') {
    return data.slice(0, 500);
  }
  try {
    return JSON.stringify(data).slice(0, 500);
  } catch {
    return String(data);
  }
}

function toFeatureFlagRequestError(
  error: unknown,
  distribution: string,
  environment: string,
): Error {
  const url = buildFeatureFlagUrl(distribution, environment);
  const context = `distribution="${distribution}", environment="${environment}", url=${url}`;

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const statusText = error.response?.statusText ?? '';
    const responseBody = formatResponseBody(error.response?.data);
    const axiosCode = error.code ? `, code=${error.code}` : '';

    const message =
      `Feature flags request failed: HTTP ${status ?? 'unknown'} ${statusText}${axiosCode}. ` +
      `${context}. ` +
      `Response body: ${responseBody}`;
    const wrapped = new Error(message);
    (wrapped as Error & { cause?: unknown }).cause = error;
    return wrapped;
  }

  if (error instanceof Error) {
    const wrapped = new Error(
      `Feature flags request failed: ${error.message}. ${context}`,
    );
    (wrapped as Error & { cause?: unknown }).cause = error;
    return wrapped;
  }

  return new Error(
    `Feature flags request failed: ${String(error)}. ${context}`,
  );
}

function mergeFeatureFlagPayload(
  data: Record<string, unknown>[] | Record<string, unknown>,
): Record<string, unknown> {
  // The API returns an array of single-key objects like [{ "flagName": { ... } }, ...]
  // Merge into a single flat object so consumers can access flags by name directly
  if (Array.isArray(data)) {
    return Object.assign({}, ...data) as Record<string, unknown>;
  }
  return data;
}

/**
 * Fetches the current production feature flags from the MetaMask client-config API.
 * Retries up to {@link MAX_RETRIES_ON_4XX} times when the API responds with HTTP 4xx.
 * Returns `null` when the request fails or the payload is empty (callers may fall back to UI).
 * @param distribution - The distribution channel (e.g. 'main').
 * @param environment - The environment (e.g. 'prod').
 * @returns The production feature flags, or `null` if unavailable.
 */
export const fetchProductionFeatureFlags = async (
  distribution: string,
  environment: string,
): Promise<Record<string, unknown> | null> => {
  logger.info(
    `Fetching feature flags for distribution: ${distribution} and environment: ${environment}`,
  );
  logger.info(
    `Feature flag url: ${buildFeatureFlagUrl(distribution, environment)}`,
  );

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES_ON_4XX; attempt++) {
    try {
      const { data } = await axios.get<
        Record<string, unknown>[] | Record<string, unknown>
      >(CLIENT_CONFIG_URL, {
        params: { client: 'mobile', distribution, environment },
        headers: { Accept: 'application/json' },
      });

      const flags = mergeFeatureFlagPayload(data);
      if (!flags || Object.keys(flags).length === 0) {
        logger.warn(
          `Feature flags response empty for distribution="${distribution}", environment="${environment}"`,
        );
        return null;
      }
      return flags;
    } catch (error) {
      lastError = error;

      const status = isAxiosError(error) ? error.response?.status : undefined;
      const shouldRetry =
        status !== undefined &&
        is4xxStatus(status) &&
        attempt < MAX_RETRIES_ON_4XX;

      if (!shouldRetry) {
        const detailedError = toFeatureFlagRequestError(
          error,
          distribution,
          environment,
        );
        logger.warn(detailedError.message);
        return null;
      }

      const responseBody = isAxiosError(error)
        ? formatResponseBody(error.response?.data)
        : '';
      logger.warn(
        `Feature flags request returned HTTP ${status}; retrying (${attempt}/${MAX_RETRIES_ON_4XX}). ` +
          `Response body: ${responseBody}`,
      );
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const detailedError = toFeatureFlagRequestError(
    lastError,
    distribution,
    environment,
  );
  logger.warn(detailedError.message);
  return null;
};
