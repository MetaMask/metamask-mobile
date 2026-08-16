/**
 * Lighter Protocol Type Definitions
 *
 * Types for the zkLighter REST API, the Go/WASM signer bridge, and
 * provider configuration. No SDK dependency — shapes are derived from
 * the public API (https://apidocs.lighter.xyz) and the reference
 * WebView bridge (elliottech/lighter-go, `web-wasm` branch).
 */
/**
 * Lighter Network type - mainnet or testnet
 */
export type LighterNetwork = 'mainnet' | 'testnet';
/**
 * Lighter endpoint configuration for a single network
 */
export type LighterEndpointConfig = {
    http: string;
    ws: string;
};
/**
 * Lighter endpoints for all networks
 */
export type LighterEndpoints = {
    mainnet: LighterEndpointConfig;
    testnet: LighterEndpointConfig;
};
/**
 * A single call into the Lighter Go/WASM signer.
 *
 * Mirrors the postMessage protocol of the reference React Native WebView
 * bridge (`{ function, params }`), so a WebView-backed bridge on mobile and
 * an in-process WASM bridge in Node are interchangeable implementations.
 */
export type LighterWasmCall = {
    /** Global function name registered by the WASM module (e.g. `_createClient`). */
    function: string;
    /** Positional arguments forwarded verbatim to the WASM function. */
    params: unknown[];
};
/**
 * Transport-agnostic seam to the Lighter Go/WASM signer.
 *
 * Implementations:
 * - Mobile: off-screen WebView loading the locally-bundled
 *   `wasm-wrapper.standalone.html`, dispatching calls via postMessage.
 * - Node (e2e): in-process `WebAssembly.instantiate` via Go's `wasm_exec.js`.
 */
export type LighterSignerBridge = {
    /**
     * Execute one WASM signer call and resolve with its result object.
     *
     * @param call - The function name and positional params to invoke.
     */
    execute<Result>(call: LighterWasmCall): Promise<Result>;
    /**
     * Optional subscription to bridge resets (WebView reload / process
     * loss). The provider uses it to invalidate its cached signer session
     * IMMEDIATELY instead of learning about the reset from the next failed
     * trading call.
     *
     * @param listener - Invoked on every reset.
     * @returns Unsubscribe function.
     */
    onReset?(listener: () => void): () => void;
    /**
     * Optional hook to re-arm the bridge after a reload (WebView remount).
     */
    reset?(): void;
};
/**
 * Response of `_createClient` / `_createClientByPrv`.
 */
export type LighterCreateClientResult = {
    success: boolean;
    /** Venue public key, hex (80 chars / 40 bytes, Schnorr over ECgFp5). */
    pk: string;
    /**
     * Venue private key, hex. Present only when the signer host runs
     * in-process (headless Node); the mobile WebView redacts it before the
     * result crosses the bridge. Never persist, forward, or log it.
     */
    prv?: string;
    pubKeySuccess: boolean;
    /**
     * ChangePubKey plaintext body to be signed with EIP-191 `personal_sign`
     * by the user's L1 (EVM) account.
     */
    body: string;
    error?: string;
};
/**
 * Response of `_signChangePubKey`.
 */
export type LighterSignChangePubKeyResult = {
    /** Serialized L2 transaction JSON (includes the injected `L1Sig`). */
    txInfo: string;
    error?: string;
};
/**
 * Response of `_createAuthToken`.
 */
export type LighterCreateAuthTokenResult = {
    token: string;
    deadline: number;
    error?: string;
};
/**
 * Response of signing functions returning a full L2 transaction
 * (`_signCreateOrder`, `_signCancelOrder`, ...).
 */
export type LighterTxResult = {
    txInfo: string;
    txHash?: string;
    error?: string;
};
/**
 * Signs an EIP-191 personal message and resolves with the 65-byte signature
 * as a 0x-prefixed hex string. Injected for headless use; when a messenger
 * is available the wallet service routes through
 * `KeyringController:signPersonalMessage` instead.
 */
export type LighterPersonalSigner = (message: string) => Promise<string>;
/**
 * Lighter auth/config passed at construction time.
 */
export type LighterAuthConfig = {
    /** Whether the Lighter provider is enabled via local override. */
    enabled?: boolean;
    /** Lighter account index (assigned at first deposit). */
    accountIndex?: number;
    /** API key slot to register/use (0-254). */
    apiKeyIndex?: number;
    /** L1 address owning the Lighter account. */
    l1Address?: string;
    /** Headless personal_sign implementation (e2e / tooling). */
    personalSigner?: LighterPersonalSigner;
};
/**
 * One market entry from `GET /api/v1/orderBooks`.
 */
export type LighterOrderBookMeta = {
    symbol: string;
    marketId: number;
    marketType: string;
    status: string;
    takerFee: string;
    makerFee: string;
    minBaseAmount: string;
    minQuoteAmount: string;
    supportedSizeDecimals: number;
    supportedPriceDecimals: number;
    supportedQuoteDecimals: number;
};
/**
 * Response of `GET /api/v1/orderBooks`.
 */
export type LighterOrderBooksResponse = {
    code: number;
    orderBooks: LighterOrderBookMeta[];
};
/**
 * Market stats from `GET /api/v1/orderBookDetails`.
 */
export type LighterOrderBookDetail = LighterOrderBookMeta & {
    lastTradePrice: number;
    /** Default initial margin fraction, hundredths of a percent (666 = 6.66%). */
    defaultInitialMarginFraction?: number;
    /** Minimum initial margin fraction, hundredths of a percent (400 → 25x max). */
    minInitialMarginFraction?: number;
    /** Maintenance margin fraction, hundredths of a percent (240 = 2.4%). */
    maintenanceMarginFraction?: number;
    dailyTradesCount: number;
    dailyBaseTokenVolume: number;
    dailyQuoteTokenVolume: number;
    dailyPriceLow: number;
    dailyPriceHigh: number;
    dailyPriceChange: number;
    openInterest: number;
    dailyChart: Record<string, number>;
};
/**
 * Response of `GET /api/v1/orderBookDetails`.
 */
export type LighterOrderBookDetailsResponse = {
    code: number;
    orderBookDetails: LighterOrderBookDetail[];
};
/**
 * One sub-account from `GET /api/v1/accountsByL1Address` or `account`.
 */
export type LighterSubAccount = {
    code: number;
    accountType: number;
    index: number;
    l1Address: string;
    cancelAllTime: number;
    totalOrderCount: number;
    pendingOrderCount: number;
    status: number;
    collateral: string;
    availableBalance: string;
    positions?: LighterApiPosition[];
};
/**
 * Response of `GET /api/v1/accountsByL1Address`.
 */
export type LighterAccountsByL1AddressResponse = {
    code: number;
    message?: string;
    l1Address: string;
    subAccounts: LighterSubAccount[];
};
/**
 * Response of `GET /api/v1/account` (`by=index`).
 */
export type LighterAccountResponse = {
    code: number;
    message?: string;
    accounts: LighterSubAccount[];
};
/**
 * One position inside an account payload.
 */
export type LighterApiPosition = {
    marketId: number;
    symbol: string;
    initialMarginFraction: string;
    openOrderCount: number;
    /** 1 = long, -1 = short (sign convention per API). */
    sign: number;
    position: string;
    avgEntryPrice: string;
    positionValue: string;
    unrealizedPnl: string;
    realizedPnl: string;
    liquidationPrice: string;
};
/**
 * One API key entry from `GET /api/v1/apikeys`.
 */
export type LighterApiKey = {
    accountIndex: number;
    apiKeyIndex: number;
    nonce: number;
    publicKey: string;
};
/**
 * Response of `GET /api/v1/apikeys`.
 */
export type LighterApiKeysResponse = {
    code: number;
    message?: string;
    apiKeys: LighterApiKey[];
};
/**
 * Response of `GET /api/v1/nextNonce`.
 */
export type LighterNextNonceResponse = {
    code: number;
    message?: string;
    nonce: number;
};
/**
 * Response of `POST /api/v1/sendTx`.
 */
export type LighterSendTxResponse = {
    code: number;
    message?: string;
    txHash?: string;
};
/**
 * One market entry from the `market_stats/all` WebSocket channel
 * (`subscribed/market_stats` snapshot and `update/market_stats` deltas),
 * after snake→camel conversion at the socket boundary.
 */
export type LighterWsMarketStat = {
    symbol: string;
    marketId: number;
    indexPrice: string;
    markPrice: string;
    midPrice: string;
    bestAskPrice: string;
    bestBidPrice: string;
    lastTradePrice: string;
    openInterest: string;
    fundingRate: string;
    currentFundingRate?: string;
    dailyQuoteTokenVolume: number;
    dailyPriceChange: number;
};
/**
 * Envelope of a `market_stats` WebSocket message (post-camelization).
 */
export type LighterWsMarketStatsMessage = {
    type: string;
    channel?: string;
    timestamp?: number;
    marketStats?: Record<string, LighterWsMarketStat>;
};
/**
 * Stats block of a `user_stats/{account_index}` WebSocket message
 * (post-camelization). Live-verified against testnet account 28.
 */
export type LighterWsUserStats = {
    collateral: string;
    portfolioValue: string;
    leverage: string;
    availableBalance: string;
    marginUsage: string;
    buyingPower: string;
};
/**
 * Generic account-channel WebSocket envelope (post-camelization):
 * `user_stats` carries `stats`, `account_all_positions` carries `positions`
 * (same field shape as the REST account payload), `account_all_orders`
 * carries `orders` keyed by market id.
 */
export type LighterWsAccountMessage = {
    type: string;
    channel?: string;
    timestamp?: number;
    stats?: LighterWsUserStats;
    positions?: Record<string, LighterApiPosition>;
    orders?: Record<string, LighterApiOrder[]>;
};
/**
 * Minimal structural WebSocket surface the Lighter stream manager uses.
 * Structural (rather than the DOM/Node `WebSocket` type) so platforms and
 * tests can supply any compatible implementation.
 */
export type LighterWebSocketLike = {
    readyState: number;
    send(data: string): void;
    close(): void;
    onopen: (() => void) | null;
    onmessage: ((event: {
        data: unknown;
    }) => void) | null;
    onclose: (() => void) | null;
    onerror: (() => void) | null;
};
/**
 * Constructor for {@link LighterWebSocketLike} transports.
 */
export type LighterWebSocketCtor = new (url: string) => LighterWebSocketLike;
/**
 * `order_book/{market_id}` WebSocket payload (post-camelization).
 * `subscribed/*` carries a full snapshot; `update/*` carries deltas where
 * `size: "0.000"` removes a level.
 */
export type LighterWsOrderBookMessage = {
    type: string;
    channel?: string;
    timestamp?: number;
    orderBook?: {
        bids?: {
            price: string;
            size: string;
        }[];
        asks?: {
            price: string;
            size: string;
        }[];
    };
};
/**
 * `candle/{market_id}/{resolution}` WebSocket payload (post-camelization,
 * candle entries keep the compact t/o/h/l/c/v wire keys).
 */
export type LighterWsCandleMessage = {
    type: string;
    channel?: string;
    timestamp?: number;
    candles?: LighterCandle[];
};
/**
 * One trade entry from the `account_all_trades/{account_index}` channel
 * (post-camelization).
 */
export type LighterWsTrade = {
    tradeId: number;
    marketId: number;
    size: string;
    price: string;
    askId: number;
    bidId: number;
    askAccountId: number;
    bidAccountId: number;
    isMakerAsk: boolean;
    timestamp: number;
};
/**
 * `account_all_trades/{account_index}` WebSocket payload (post-camelization).
 */
export type LighterWsTradesMessage = {
    type: string;
    channel?: string;
    timestamp?: number;
    trades?: Record<string, LighterWsTrade[]>;
};
/**
 * One trade from `GET /api/v1/trades` (post-camelization).
 */
export type LighterRestTrade = {
    tradeId: number;
    txHash?: string;
    type: string;
    marketId: number;
    size: string;
    price: string;
    usdAmount?: string;
    askId: number;
    bidId: number;
    askAccountId: number;
    bidAccountId: number;
    isMakerAsk?: boolean;
    timestamp: number;
    /** Realized pnl for the ask-side account, signed USDC. */
    askAccountPnl?: string;
    /** Realized pnl for the bid-side account, signed USDC. */
    bidAccountPnl?: string;
};
/**
 * Response of `GET /api/v1/trades`.
 */
export type LighterTradesResponse = {
    code: number;
    message?: string;
    trades?: LighterRestTrade[];
};
/**
 * One entry from `GET /api/v1/positionFunding` (post-camelization).
 */
export type LighterPositionFunding = {
    timestamp: number;
    marketId: number;
    fundingId: number;
    change: string;
    rate: string;
    positionSize: string;
    positionSide: string;
};
/**
 * Response of `GET /api/v1/positionFunding`.
 */
export type LighterPositionFundingsResponse = {
    code: number;
    message?: string;
    positionFundings?: LighterPositionFunding[];
};
/**
 * One record from `GET /api/v1/pnl` (post-camelization).
 */
export type LighterPnlRecord = {
    timestamp: number;
    tradePnl: number;
    inflow: number;
    outflow: number;
    volume: number;
};
/**
 * Response of `GET /api/v1/pnl`.
 */
export type LighterPnlResponse = {
    code: number;
    message?: string;
    resolution?: string;
    pnl?: LighterPnlRecord[];
};
/**
 * One candle from `GET /api/v1/candles` (compact wire keys: t/o/h/l/c/v).
 */
export type LighterCandle = {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
};
/**
 * Response of `GET /api/v1/candles`.
 */
export type LighterCandlesResponse = {
    code: number;
    message?: string;
    /** Resolution echo (e.g. `15m`). */
    r?: string;
    /** Ascending candle series. */
    c?: LighterCandle[];
};
/**
 * One order from `GET /api/v1/accountActiveOrders`.
 */
export type LighterApiOrder = {
    orderIndex: number;
    clientOrderIndex: number;
    marketIndex: number;
    ownerAccountIndex: number;
    initialBaseAmount: string;
    remainingBaseAmount: string;
    price: string;
    isAsk: boolean;
    type: string;
    timeInForce: string;
    reduceOnly: number | boolean;
    status: string;
    orderExpiry: number;
    timestamp: number;
};
/**
 * Response of `GET /api/v1/accountActiveOrders`.
 */
export type LighterActiveOrdersResponse = {
    code: number;
    message?: string;
    orders: LighterApiOrder[];
};
/**
 * Response of `GET /api/v1/accountInactiveOrders` (historical order
 * lifecycle: filled / canceled orders, newest first, cursor-paged).
 */
export type LighterInactiveOrdersResponse = {
    code: number;
    message?: string;
    nextCursor?: string;
    orders: LighterApiOrder[];
};
/**
 * One entry of `GET /api/v1/deposit/history` (camelized).
 */
export type LighterDepositHistoryItem = {
    id: string;
    assetId: number;
    amount: string;
    timestamp: number;
    status: string;
    l1TxHash: string;
};
/**
 * Response of `GET /api/v1/deposit/history`.
 */
export type LighterDepositHistoryResponse = {
    code: number;
    message?: string;
    deposits: LighterDepositHistoryItem[];
    cursor?: string;
};
/**
 * One entry of `GET /api/v1/withdraw/history` (camelized).
 */
export type LighterWithdrawHistoryItem = {
    id: string;
    assetId: number;
    amount: string;
    timestamp: number;
    status: string;
    type: string;
    l1TxHash: string;
};
/**
 * Response of `GET /api/v1/withdraw/history`.
 */
export type LighterWithdrawHistoryResponse = {
    code: number;
    message?: string;
    withdraws: LighterWithdrawHistoryItem[];
    cursor?: string;
};
/**
 * One entry of `GET /api/v1/transfer/history` (camelized).
 */
export type LighterTransferHistoryItem = {
    id: string;
    assetId: number;
    amount: string;
    fee: string;
    timestamp: number;
    type: string;
    fromL1Address: string;
    toL1Address: string;
    fromAccountIndex: number;
    toAccountIndex: number;
    txHash: string;
};
/**
 * Response of `GET /api/v1/transfer/history`.
 */
export type LighterTransferHistoryResponse = {
    code: number;
    message?: string;
    transfers: LighterTransferHistoryItem[];
    cursor?: string;
};
//# sourceMappingURL=lighter-types.d.cts.map