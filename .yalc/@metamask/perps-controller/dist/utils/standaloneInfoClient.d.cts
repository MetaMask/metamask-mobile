import { InfoClient } from "@nktkas/hyperliquid";
import type { ClearinghouseStateResponse, FrontendOpenOrdersResponse } from "../types/hyperliquid-types.cjs";
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
export declare const createStandaloneInfoClient: (options: StandaloneInfoClientOptions) => InfoClient;
/**
 * Query clearinghouseState across multiple DEXs in parallel.
 * Used by standalone mode to aggregate positions/account state across HIP-3 DEXs.
 *
 * @param infoClient - The HyperLiquid InfoClient instance to use for queries.
 * @param userAddress - The user's wallet address to query state for.
 * @param dexs - The array of DEX identifiers to query (null for main DEX).
 * @returns A promise that resolves to an array of clearinghouse state responses.
 */
export declare const queryStandaloneClearinghouseStates: (infoClient: InfoClient, userAddress: string, dexs: (string | null)[]) => Promise<ClearinghouseStateResponse[]>;
/**
 * Query frontendOpenOrders across multiple DEXs in parallel.
 * Used by standalone mode to fetch open orders across HIP-3 DEXs.
 *
 * @param infoClient - The HyperLiquid InfoClient instance to use for queries.
 * @param userAddress - The user's wallet address to query orders for.
 * @param dexs - The array of DEX identifiers to query (null for main DEX).
 * @returns A promise that resolves to an array of frontend open orders responses.
 */
export declare const queryStandaloneOpenOrders: (infoClient: InfoClient, userAddress: string, dexs: (string | null)[]) => Promise<FrontendOpenOrdersResponse[]>;
//# sourceMappingURL=standaloneInfoClient.d.cts.map