import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';

import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type {
  ClearinghouseStateResponse,
  FrontendOpenOrdersResponse,
} from '../types/hyperliquid-types';

export type StandaloneInfoClientOptions = {
  /** Whether to use testnet API endpoint */
  isTestnet: boolean;
  /** Request timeout in ms (default: CONNECTION_TIMEOUT_MS) */
  timeout?: number;
};

/**
 * Creates a standalone InfoClient for lightweight read-only queries.
 * Does not require full perps initialization (no wallet, WebSocket, etc.)
 *
 * @param options - The configuration options for the standalone client.
 * @returns A new InfoClient instance configured for read-only queries.
 */
export const createStandaloneInfoClient = (
  options: StandaloneInfoClientOptions,
): InfoClient => {
  const { isTestnet, timeout = PERPS_CONSTANTS.ConnectionTimeoutMs } = options;

  const httpTransport = new HttpTransport({
    isTestnet,
    timeout,
  });

  return new InfoClient({ transport: httpTransport });
};

/**
 * Query clearinghouseState across multiple DEXs in parallel.
 * Used by standalone mode to aggregate positions/account state across HIP-3 DEXs.
 *
 * @param infoClient - The HyperLiquid InfoClient instance to use for queries.
 * @param userAddress - The user's wallet address to query state for.
 * @param dexs - The array of DEX identifiers to query (null for main DEX).
 * @returns A promise that resolves to an array of clearinghouse state responses.
 */
export const queryStandaloneClearinghouseStates = async (
  infoClient: InfoClient,
  userAddress: string,
  dexs: (string | null)[],
): Promise<ClearinghouseStateResponse[]> => {
  const results = await Promise.allSettled(
    dexs.map(async (dex) => {
      const queryParams: { user: string; dex?: string } = {
        user: userAddress,
      };
      if (dex) {
        queryParams.dex = dex;
      }
      return infoClient.clearinghouseState(queryParams);
    }),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<ClearinghouseStateResponse> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value);
};

/**
 * Query frontendOpenOrders across multiple DEXs in parallel.
 * Used by standalone mode to fetch open orders across HIP-3 DEXs.
 *
 * @param infoClient - The HyperLiquid InfoClient instance to use for queries.
 * @param userAddress - The user's wallet address to query orders for.
 * @param dexs - The array of DEX identifiers to query (null for main DEX).
 * @returns A promise that resolves to an array of frontend open orders responses.
 */
export const queryStandaloneOpenOrders = async (
  infoClient: InfoClient,
  userAddress: string,
  dexs: (string | null)[],
): Promise<FrontendOpenOrdersResponse[]> => {
  const results = await Promise.allSettled(
    dexs.map(async (dex) => {
      const queryParams: { user: string; dex?: string } = {
        user: userAddress,
      };
      if (dex) {
        queryParams.dex = dex;
      }
      return infoClient.frontendOpenOrders(queryParams);
    }),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<FrontendOpenOrdersResponse> =>
        result.status === 'fulfilled',
    )
    .map((result) => result.value);
};
