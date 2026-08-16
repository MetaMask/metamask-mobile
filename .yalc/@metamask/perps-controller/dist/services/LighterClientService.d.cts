/**
 * Lighter Client Service
 *
 * Thin REST client for the zkLighter API. No SDK dependency — endpoints are
 * called with the platform `fetch` global. Response shapes are validated
 * minimally (code field) and returned as typed payloads for the adapter
 * layer.
 *
 * Endpoints used (https://apidocs.lighter.xyz):
 * - GET  /api/v1/orderBooks           market metadata
 * - GET  /api/v1/orderBookDetails     market stats
 * - GET  /api/v1/account              account (+positions) by index
 * - GET  /api/v1/accountsByL1Address  account discovery
 * - GET  /api/v1/apikeys              registered venue keys
 * - GET  /api/v1/nextNonce            per-key nonce
 * - GET  /api/v1/accountActiveOrders  open orders (auth token header)
 * - POST /api/v1/sendTx               submit signed L2 transaction
 */
import type { PerpsPlatformDependencies } from "../types/index.cjs";
import type { LighterAccountResponse, LighterAccountsByL1AddressResponse, LighterActiveOrdersResponse, LighterApiKeysResponse, LighterNetwork, LighterNextNonceResponse, LighterOrderBookMeta, LighterOrderBookDetailsResponse, LighterCandlesResponse, LighterDepositHistoryResponse, LighterInactiveOrdersResponse, LighterPnlResponse, LighterPositionFundingsResponse, LighterSendTxResponse, LighterTradesResponse, LighterTransferHistoryResponse, LighterWithdrawHistoryResponse } from "../types/lighter-types.cjs";
/**
 * Recursively convert all object keys from snake_case to camelCase.
 * The zkLighter wire format is snake_case; parsed shapes in this package
 * follow camelCase conventions (see types/lighter-types.ts).
 *
 * @param value - Parsed JSON value.
 * @returns The value with camelCase keys.
 */
export declare function convertKeysToCamelCase(value: unknown): unknown;
/**
 * Error thrown for non-2xx HTTP responses or API-level error codes.
 */
export declare class LighterApiError extends Error {
    readonly code: number | undefined;
    constructor(message: string, code?: number);
}
/**
 * REST client for the zkLighter API.
 */
export declare class LighterClientService {
    #private;
    constructor(deps: PerpsPlatformDependencies, config: {
        isTestnet: boolean;
    });
    get network(): LighterNetwork;
    get baseUrl(): string;
    /**
     * Fetch market metadata, cached for 5 minutes.
     *
     * @param forceRefresh - Skip the cache and refetch.
     * @returns Market metadata entries.
     */
    getOrderBooks(forceRefresh?: boolean): Promise<LighterOrderBookMeta[]>;
    /**
     * Fetch market stats for all markets.
     *
     * @returns Order book details entries.
     */
    getOrderBookDetails(): Promise<LighterOrderBookDetailsResponse>;
    /**
     * Fetch an account (including positions) by its Lighter index.
     *
     * @param accountIndex - The Lighter account index.
     * @returns Account payload.
     */
    getAccountByIndex(accountIndex: number): Promise<LighterAccountResponse>;
    /**
     * Discover Lighter accounts owned by an L1 address.
     *
     * @param l1Address - The owning EVM address.
     * @returns Accounts payload.
     */
    getAccountsByL1Address(l1Address: string): Promise<LighterAccountsByL1AddressResponse>;
    /**
     * Fetch registered API keys for an account.
     *
     * @param accountIndex - The Lighter account index.
     * @param apiKeyIndex - Key slot, or 255 for all slots.
     * @returns API keys payload.
     */
    getApiKeys(accountIndex: number, apiKeyIndex?: number): Promise<LighterApiKeysResponse>;
    /**
     * Fetch the next nonce for a key slot.
     *
     * @param accountIndex - The Lighter account index.
     * @param apiKeyIndex - Key slot.
     * @returns Next nonce payload.
     */
    getNextNonce(accountIndex: number, apiKeyIndex: number): Promise<LighterNextNonceResponse>;
    /**
     * Fetch active (open) orders for an account.
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer (`_createAuthToken`).
     * @param marketId - Optional market filter (255 = all markets).
     * @returns Active orders payload.
     */
    getActiveOrders(accountIndex: number, authToken: string, marketId?: number): Promise<LighterActiveOrdersResponse>;
    /**
     * Fetch historical (inactive) orders: filled and canceled lifecycle
     * states, newest first (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param limit - Max entries (1-100).
     * @returns Inactive orders payload.
     */
    getInactiveOrders(accountIndex: number, authToken: string, limit?: number): Promise<LighterInactiveOrdersResponse>;
    /**
     * Fetch L1→L2 deposit history (auth token required). The venue requires
     * both the account index and its L1 address on this endpoint.
     *
     * @param accountIndex - The Lighter account index.
     * @param l1Address - The account's L1 address.
     * @param authToken - Auth token minted by the signer.
     * @returns Deposit history payload (newest first, cursor-paged).
     */
    getDepositHistory(accountIndex: number, l1Address: string, authToken: string): Promise<LighterDepositHistoryResponse>;
    /**
     * Fetch L2→L1 withdrawal history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @returns Withdrawal history payload (newest first, cursor-paged).
     */
    getWithdrawHistory(accountIndex: number, authToken: string): Promise<LighterWithdrawHistoryResponse>;
    /**
     * Fetch L2 transfer history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @returns Transfer history payload (newest first, cursor-paged).
     */
    getTransferHistory(accountIndex: number, authToken: string): Promise<LighterTransferHistoryResponse>;
    /**
     * Fetch account trade history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param limit - Max entries (1-100).
     * @returns Trades payload (newest first).
     */
    getTrades(accountIndex: number, authToken: string, limit?: number): Promise<LighterTradesResponse>;
    /**
     * Fetch user funding payment history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param limit - Max entries.
     * @returns Position fundings payload.
     */
    getPositionFundings(accountIndex: number, authToken: string, limit?: number): Promise<LighterPositionFundingsResponse>;
    /**
     * Fetch account PnL history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param startTimestamp - Range start (ms).
     * @param endTimestamp - Range end (ms).
     * @param countBack - Records counted back from range end.
     * @returns PnL payload.
     */
    getPnl(accountIndex: number, authToken: string, startTimestamp: number, endTimestamp: number, countBack: number): Promise<LighterPnlResponse>;
    /**
     * Fetch an OHLCV candle series for a market.
     *
     * @param marketId - Numeric Lighter market id.
     * @param resolution - Candle resolution (e.g. `1m`, `15m`, `1h`, `1d`).
     * @param startTimestamp - Range start (ms).
     * @param endTimestamp - Range end (ms).
     * @param countBack - Number of candles counted back from the range end.
     * @returns Candle series payload.
     */
    getCandles(marketId: number, resolution: string, startTimestamp: number, endTimestamp: number, countBack: number): Promise<LighterCandlesResponse>;
    /**
     * Submit a signed L2 transaction.
     *
     * @param txType - L2 transaction type code (see lighterConfig).
     * @param txInfo - Serialized signed transaction JSON.
     * @returns Send result payload.
     */
    sendTx(txType: number, txInfo: string): Promise<LighterSendTxResponse>;
}
//# sourceMappingURL=LighterClientService.d.cts.map