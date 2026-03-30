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
    `Fetching production feature flags for distribution: ${distribution} and environment: ${environment}`,
  );
  const { data } = await axios.get<Record<string, unknown>>(CLIENT_CONFIG_URL, {
    params: { client: 'mobile', distribution, environment },
    headers: { Accept: 'application/json' },
  });
  return data;
};
