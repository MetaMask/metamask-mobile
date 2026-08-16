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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LighterClientService_deps, _LighterClientService_isTestnet, _LighterClientService_marketsCache, _LighterClientService_marketsCacheTime, _LighterClientService_get, _LighterClientService_request;
import { getLighterHttpEndpoint, LIGHTER_HTTP_TIMEOUT_MS } from "../constants/lighterConfig.mjs";
/**
 * Duration market metadata stays cached before a refetch.
 */
const MARKETS_CACHE_TTL_MS = 5 * 60 * 1000;
/**
 * Convert a snake_case wire key to camelCase.
 *
 * @param key - Wire key (e.g. `min_base_amount`).
 * @returns camelCase key (e.g. `minBaseAmount`).
 */
function toCamelKey(key) {
    return key.replace(/_([a-z0-9])/gu, (_match, char) => char.toUpperCase());
}
/**
 * Recursively convert all object keys from snake_case to camelCase.
 * The zkLighter wire format is snake_case; parsed shapes in this package
 * follow camelCase conventions (see types/lighter-types.ts).
 *
 * @param value - Parsed JSON value.
 * @returns The value with camelCase keys.
 */
export function convertKeysToCamelCase(value) {
    if (Array.isArray(value)) {
        return value.map(convertKeysToCamelCase);
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
            toCamelKey(key),
            convertKeysToCamelCase(entry),
        ]));
    }
    return value;
}
/**
 * Error thrown for non-2xx HTTP responses or API-level error codes.
 */
export class LighterApiError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'LighterApiError';
        this.code = code;
    }
}
/**
 * REST client for the zkLighter API.
 */
export class LighterClientService {
    constructor(deps, config) {
        _LighterClientService_deps.set(this, void 0);
        _LighterClientService_isTestnet.set(this, void 0);
        _LighterClientService_marketsCache.set(this, null);
        _LighterClientService_marketsCacheTime.set(this, 0);
        _LighterClientService_get.set(this, async (path, headers) => {
            return await __classPrivateFieldGet(this, _LighterClientService_request, "f").call(this, path, { method: 'GET', headers });
        });
        _LighterClientService_request.set(this, async (path, init) => {
            const url = `${this.baseUrl}${path}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), LIGHTER_HTTP_TIMEOUT_MS);
            try {
                const response = await fetch(url, {
                    method: init.method,
                    headers: init.headers,
                    body: init.body,
                    signal: controller.signal,
                });
                const payload = convertKeysToCamelCase(await response.json());
                // Lighter returns HTTP 200 with an application-level error code, and
                // 4xx/5xx with `{code, message}` bodies — treat both uniformly.
                if (!response.ok || payload.code !== 200) {
                    throw new LighterApiError(payload.message ?? `Lighter API error (HTTP ${response.status})`, payload.code ?? response.status);
                }
                return payload;
            }
            catch (error) {
                if (error instanceof LighterApiError) {
                    throw error;
                }
                __classPrivateFieldGet(this, _LighterClientService_deps, "f").debugLogger?.log?.('LighterClientService request failed', {
                    url,
                    error,
                });
                throw new LighterApiError(error instanceof Error ? error.message : String(error));
            }
            finally {
                clearTimeout(timeout);
            }
        });
        __classPrivateFieldSet(this, _LighterClientService_deps, deps, "f");
        __classPrivateFieldSet(this, _LighterClientService_isTestnet, config.isTestnet, "f");
    }
    get network() {
        return __classPrivateFieldGet(this, _LighterClientService_isTestnet, "f") ? 'testnet' : 'mainnet';
    }
    get baseUrl() {
        return getLighterHttpEndpoint(this.network);
    }
    /**
     * Fetch market metadata, cached for 5 minutes.
     *
     * @param forceRefresh - Skip the cache and refetch.
     * @returns Market metadata entries.
     */
    async getOrderBooks(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh &&
            __classPrivateFieldGet(this, _LighterClientService_marketsCache, "f") &&
            now - __classPrivateFieldGet(this, _LighterClientService_marketsCacheTime, "f") < MARKETS_CACHE_TTL_MS) {
            return __classPrivateFieldGet(this, _LighterClientService_marketsCache, "f");
        }
        const response = await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, '/api/v1/orderBooks');
        __classPrivateFieldSet(this, _LighterClientService_marketsCache, response.orderBooks, "f");
        __classPrivateFieldSet(this, _LighterClientService_marketsCacheTime, now, "f");
        return response.orderBooks;
    }
    /**
     * Fetch market stats for all markets.
     *
     * @returns Order book details entries.
     */
    async getOrderBookDetails() {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, '/api/v1/orderBookDetails');
    }
    /**
     * Fetch an account (including positions) by its Lighter index.
     *
     * @param accountIndex - The Lighter account index.
     * @returns Account payload.
     */
    async getAccountByIndex(accountIndex) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/account?by=index&value=${accountIndex}`);
    }
    /**
     * Discover Lighter accounts owned by an L1 address.
     *
     * @param l1Address - The owning EVM address.
     * @returns Accounts payload.
     */
    async getAccountsByL1Address(l1Address) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/accountsByL1Address?l1_address=${l1Address}`);
    }
    /**
     * Fetch registered API keys for an account.
     *
     * @param accountIndex - The Lighter account index.
     * @param apiKeyIndex - Key slot, or 255 for all slots.
     * @returns API keys payload.
     */
    async getApiKeys(accountIndex, apiKeyIndex = 255) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/apikeys?account_index=${accountIndex}&api_key_index=${apiKeyIndex}`);
    }
    /**
     * Fetch the next nonce for a key slot.
     *
     * @param accountIndex - The Lighter account index.
     * @param apiKeyIndex - Key slot.
     * @returns Next nonce payload.
     */
    async getNextNonce(accountIndex, apiKeyIndex) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/nextNonce?account_index=${accountIndex}&api_key_index=${apiKeyIndex}`);
    }
    /**
     * Fetch active (open) orders for an account.
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer (`_createAuthToken`).
     * @param marketId - Optional market filter (255 = all markets).
     * @returns Active orders payload.
     */
    async getActiveOrders(accountIndex, authToken, marketId = 255) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/accountActiveOrders?account_index=${accountIndex}&market_id=${marketId}`, { authorization: authToken });
    }
    /**
     * Fetch historical (inactive) orders: filled and canceled lifecycle
     * states, newest first (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param limit - Max entries (1-100).
     * @returns Inactive orders payload.
     */
    async getInactiveOrders(accountIndex, authToken, limit = 50) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/accountInactiveOrders?account_index=${accountIndex}&limit=${limit}`, { authorization: authToken });
    }
    /**
     * Fetch L1→L2 deposit history (auth token required). The venue requires
     * both the account index and its L1 address on this endpoint.
     *
     * @param accountIndex - The Lighter account index.
     * @param l1Address - The account's L1 address.
     * @param authToken - Auth token minted by the signer.
     * @returns Deposit history payload (newest first, cursor-paged).
     */
    async getDepositHistory(accountIndex, l1Address, authToken) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/deposit/history?account_index=${accountIndex}&l1_address=${l1Address}`, { authorization: authToken });
    }
    /**
     * Fetch L2→L1 withdrawal history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @returns Withdrawal history payload (newest first, cursor-paged).
     */
    async getWithdrawHistory(accountIndex, authToken) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/withdraw/history?account_index=${accountIndex}`, { authorization: authToken });
    }
    /**
     * Fetch L2 transfer history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @returns Transfer history payload (newest first, cursor-paged).
     */
    async getTransferHistory(accountIndex, authToken) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/transfer/history?account_index=${accountIndex}`, { authorization: authToken });
    }
    /**
     * Fetch account trade history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param limit - Max entries (1-100).
     * @returns Trades payload (newest first).
     */
    async getTrades(accountIndex, authToken, limit = 50) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/trades?sort_by=timestamp&limit=${limit}&account_index=${accountIndex}&market_type=perp`, { authorization: authToken });
    }
    /**
     * Fetch user funding payment history (auth token required).
     *
     * @param accountIndex - The Lighter account index.
     * @param authToken - Auth token minted by the signer.
     * @param limit - Max entries.
     * @returns Position fundings payload.
     */
    async getPositionFundings(accountIndex, authToken, limit = 50) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/positionFunding?account_index=${accountIndex}&market_id=255&limit=${limit}&sort_by=timestamp&side=all`, { authorization: authToken });
    }
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
    async getPnl(accountIndex, authToken, startTimestamp, endTimestamp, countBack) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/pnl?by=index&value=${accountIndex}&resolution=1d&count_back=${countBack}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`, { authorization: authToken });
    }
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
    async getCandles(marketId, resolution, startTimestamp, endTimestamp, countBack) {
        return await __classPrivateFieldGet(this, _LighterClientService_get, "f").call(this, `/api/v1/candles?market_id=${marketId}&resolution=${resolution}&start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}&count_back=${countBack}`);
    }
    /**
     * Submit a signed L2 transaction.
     *
     * @param txType - L2 transaction type code (see lighterConfig).
     * @param txInfo - Serialized signed transaction JSON.
     * @returns Send result payload.
     */
    async sendTx(txType, txInfo) {
        const body = new URLSearchParams({
            tx_type: String(txType),
            tx_info: txInfo,
        });
        const response = await __classPrivateFieldGet(this, _LighterClientService_request, "f").call(this, '/api/v1/sendTx', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        return response;
    }
}
_LighterClientService_deps = new WeakMap(), _LighterClientService_isTestnet = new WeakMap(), _LighterClientService_marketsCache = new WeakMap(), _LighterClientService_marketsCacheTime = new WeakMap(), _LighterClientService_get = new WeakMap(), _LighterClientService_request = new WeakMap();
//# sourceMappingURL=LighterClientService.mjs.map