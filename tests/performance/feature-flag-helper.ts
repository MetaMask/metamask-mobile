import axios from 'axios';
import { createLogger } from '../framework/logger';

const CLIENT_CONFIG_URL = 'https://client-config.api.cx.metamask.io/v1/flags';

const logger = createLogger({ name: 'feature-flag-helper' });

/**
 * Fetches the current production feature flags from the MetaMask client-config API.
 * @param distribution - The distribution channel (e.g. 'main').
 * @param environment - The environment (e.g. 'prod').
 * @returns The production feature flags as a JSON object.
 */
export const fetchProductionFeatureFlags = async (
  distribution: string,
  environment: string,
): Promise<Record<string, unknown>> => {
  logger.info(
    `Fetching feature flags for distribution: ${distribution} and environment: ${environment}`,
  );
  logger.info(
    `Feature flag url: ${CLIENT_CONFIG_URL}?client=mobile&distribution=${distribution}&environment=${environment}`,
  );
  const { data } = await axios.get<
    Record<string, unknown>[] | Record<string, unknown>
  >(CLIENT_CONFIG_URL, {
    params: { client: 'mobile', distribution, environment },
    headers: { Accept: 'application/json' },
  });

  // The API returns an array of single-key objects like [{ "flagName": { ... } }, ...]
  // Merge into a single flat object so consumers can access flags by name directly
  if (Array.isArray(data)) {
    return Object.assign({}, ...data) as Record<string, unknown>;
  }
  return data;
};
