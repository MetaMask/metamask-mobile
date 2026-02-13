import type { ClearinghouseStateResponse } from '../types/hyperliquid-types';
import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export type StandaloneInfoClientOptions = {
  /** Whether to use testnet API endpoint */
  isTestnet: boolean;
  /** Request timeout in ms (default: CONNECTION_TIMEOUT_MS) */
  timeout?: number;
};

/**
 * Creates a standalone InfoClient for lightweight read-only queries.
 * Does not require full perps initialization (no wallet, WebSocket, etc.)
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
      (r): r is PromiseFulfilledResult<ClearinghouseStateResponse> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);
};
