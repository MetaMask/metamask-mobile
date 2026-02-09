import Logger from '../../../../util/Logger';
import { getDefaultCardApiBaseUrlForMetaMaskEnv } from './mapCardApiUrl';

/**
 * Response from the Card API configuration endpoint
 * GET /v1/configuration
 */
export interface CardOAuthConfig {
  /** The Baanx OAuth2 Client ID for this environment */
  baanxClientId: string;
}

// In-memory cache for the configuration
let cachedConfig: CardOAuthConfig | null = null;

/**
 * Fetches the OAuth configuration from the Card API.
 * The response is cached in-memory since the Client ID
 * does not change during a session.
 *
 * @returns The Card OAuth configuration containing the baanxClientId
 * @throws Error if the fetch fails or the response is invalid
 */
export const fetchCardOAuthConfig = async (): Promise<CardOAuthConfig> => {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  const baseUrl =
    process.env.CARD_API_URL ||
    getDefaultCardApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);

  const url = `${baseUrl}/v1/configuration`;

  try {
    Logger.log('[fetchCardOAuthConfig] Fetching config from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Card API configuration request failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    if (!data.baanxClientId || typeof data.baanxClientId !== 'string') {
      throw new Error(
        'Invalid Card API configuration response: missing baanxClientId',
      );
    }

    const config: CardOAuthConfig = {
      baanxClientId: data.baanxClientId,
    };

    // Cache the result
    cachedConfig = config;

    Logger.log('[fetchCardOAuthConfig] Config loaded successfully');

    return config;
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'card', operation: 'fetchCardOAuthConfig' },
      context: {
        name: 'card_oauth_config',
        data: { url },
      },
    });
    throw error;
  }
};

/**
 * Clears the cached Card OAuth configuration.
 * Useful for testing or when the environment changes.
 */
export const clearCardOAuthConfigCache = (): void => {
  cachedConfig = null;
};
