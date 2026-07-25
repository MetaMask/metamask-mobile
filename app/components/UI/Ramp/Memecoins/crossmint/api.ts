import { getBundleId } from 'react-native-device-info';
import {
  CROSSMINT_DEFAULT_MAX_SLIPPAGE_BPS,
  CROSSMINT_ORDERS_API_PATH,
  CROSSMINT_STAGING_XMEME_TOKEN,
  CROSSMINT_TOKENS_API_PATH,
} from './constants';
import {
  getCrossmintBaseUrl,
  getCrossmintClientApiKey,
  getCrossmintEnvironment,
} from './config';
import {
  mergeDemoMemecoinStubs,
  mergeStagingXmeme,
  toMemecoinToken,
} from './tokenLocator';
import type {
  CrossmintCreateOrderParams,
  CrossmintCreateOrderResponse,
  CrossmintMemecoinToken,
  CrossmintTokensResponse,
} from './types';

function buildHeaders(): Record<string, string> {
  const apiKey = getCrossmintClientApiKey();
  if (!apiKey) {
    throw new Error(
      'Missing MM_CROSSMINT_CLIENT_API_KEY. Add a Crossmint client API key to .js.env.',
    );
  }

  return {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
    'x-app-identifier': getBundleId(),
  };
}

/**
 * Fetches Crossmint memecoin catalog.
 *
 * Staging development keys often lack `get-all-tokens` scope (HTTP 403). In that
 * case we fall back to the documented XMEME staging token so checkout can still
 * be exercised end-to-end.
 */
export async function fetchCrossmintMemecoinTokens(options?: {
  limit?: number;
  chains?: string;
}): Promise<CrossmintMemecoinToken[]> {
  const params = new URLSearchParams({
    tokenClasses: 'memecoin',
    limit: String(options?.limit ?? 30),
  });
  if (options?.chains) {
    params.set('chains', options.chains);
  }

  const url = `${getCrossmintBaseUrl()}${CROSSMINT_TOKENS_API_PATH}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      if (
        getCrossmintEnvironment() === 'staging' &&
        (response.status === 403 || response.status === 401)
      ) {
        return mergeDemoMemecoinStubs([CROSSMINT_STAGING_XMEME_TOKEN]);
      }
      throw new Error(
        `Failed to fetch Crossmint tokens (${response.status} ${response.statusText})`,
      );
    }

    const payload = (await response.json()) as CrossmintTokensResponse;
    const tokens = (payload.data ?? [])
      .filter((item) => item.available && item.features?.creditCardPayment)
      .map(toMemecoinToken);

    return mergeDemoMemecoinStubs(mergeStagingXmeme(tokens));
  } catch (error) {
    if (getCrossmintEnvironment() === 'staging') {
      return mergeDemoMemecoinStubs([CROSSMINT_STAGING_XMEME_TOKEN]);
    }
    throw error;
  }
}

export async function createCrossmintOrder(
  params: CrossmintCreateOrderParams,
): Promise<CrossmintCreateOrderResponse> {
  const url = `${getCrossmintBaseUrl()}${CROSSMINT_ORDERS_API_PATH}`;
  const body = {
    lineItems: [
      {
        tokenLocator: params.tokenLocator,
        executionParameters: {
          mode: 'exact-in',
          amount: params.amountUsd,
          maxSlippageBps:
            params.maxSlippageBps ?? CROSSMINT_DEFAULT_MAX_SLIPPAGE_BPS,
        },
      },
    ],
    payment: {
      method: 'card',
      ...(params.receiptEmail ? { receiptEmail: params.receiptEmail } : {}),
    },
    recipient: {
      walletAddress: params.walletAddress,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Failed to create Crossmint order (${response.status}): ${errorText || response.statusText}`,
    );
  }

  return (await response.json()) as CrossmintCreateOrderResponse;
}
