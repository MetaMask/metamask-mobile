import axios from 'axios';

const CLIENT_CONFIG_URL = 'https://client-config.api.cx.metamask.io/v1/flags';

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
  const { data } = await axios.get<Record<string, unknown>>(CLIENT_CONFIG_URL, {
    params: { client: 'mobile', distribution, environment },
    headers: { Accept: 'application/json' },
  });
  return data;
};
