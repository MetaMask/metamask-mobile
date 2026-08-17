import type { CaipAccountId, CaipChainId, CaipAssetId, Hex } from "@metamask/utils";
import type { CandlePeriod, TimeDuration } from "../constants/chartConfig.cjs";
import type { LighterSignerBridge } from "./lighter-types.cjs";
import type { CandleData, OrderType, StrategyOrderType, TpslLinkage, TriggerDirection, TriggerOrderType } from "./perps-types.cjs";
/**
 * Connection states for WebSocket management.
 * Defined inline to avoid importing from Mobile-only services.
 * Must stay in sync with HyperLiquidClientService.WebSocketConnectionState.
 */
export declare enum WebSocketConnectionState {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Disconnecting = "disconnecting"
}
/** Provider-agnostic raw ledger update. Fields match the common shape across providers. */
export type RawLedgerUpdate = {
    hash: string;
    time: number;
    delta: {
        type: string;
        usdc?: string;
        coin?: string;
    };
};
export type UserHistoryItem = {
    id: string;
    timestamp: number;
    type: 'deposit' | 'withdrawal';
    amount: string;
    asset: string;
    txHash: string;
    status: 'completed' | 'failed' | 'pending';
    details: {
        source: string;
        bridgeContract?: string;
        recipient?: string;
        blockNumber?: string;
        chainId?: string;
        synthetic?: boolean;
    };
};
export type GetUserHistoryParams = {
    startTime?: number;
    endTime?: number;
    accountId?: CaipAccountId;
};
export type TradeConfiguration = {
    leverage?: number;
    pendingConfig?: {
        amount?: string;
        leverage?: number;
        takeProfitPrice?: string;
        stopLossPrice?: string;
        limitPrice?: string;
        orderType?: OrderType;
        timestamp: number;
    };
};
export declare enum MarketCategory {
    CryptoCurrency = "crypto",
    Stock = "stock",
    PreIpo = "pre-ipo",
    Index = "index",
    Etf = "etf",
    Commodity = "commodity",
    Forex = "forex"
}
export type MarketType = `${MarketCategory}`;
/**
 * Metadata extracted from Terminal API for a single asset.
 * Used downstream to enrich PerpsMarketData with name, keywords, tags, etc.
 */
export type TerminalAssetMetadata = {
    name?: string;
    description?: string;
    keywords?: string[];
    tags?: string[];
    categories?: string[];
    marketType?: MarketType;
    /**
     * Epoch ms when this market was listed on the Terminal backend.
     * Normalized from the raw API value (number or ISO string).
     */
    listedAt?: number;
};
export type MarketTypeFilter = 'all' | 'crypto' | 'stock' | 'pre-ipo' | 'index' | 'etf' | 'commodity' | 'forex' | 'new';
/**
 * Ordered list of the 7 data-model market categories for UI pills.
 * Does not include the 'all' or 'new' sentinel values — those are applied
 * via dedicated UI controls, not the category pills.
 * Kept in sync with {@link MarketTypeFilter} via `satisfies`.
 */
export declare const MARKET_CATEGORIES: ["crypto", "stock", "pre-ipo", "index", "etf", "commodity", "forex"];
export type InputMethod = 'default' | 'slider' | 'keypad' | 'percentage' | 'max';
export type TradeAction = 'create_position' | 'increase_exposure' | 'flip_long_to_short' | 'flip_short_to_long';
export type TrackingData = {
    totalFee: number;
    marketPrice: number;
    metamaskFee?: number;
    metamaskFeeRate?: number;
    feeDiscountPercentage?: number;
    estimatedPoints?: number;
    marginUsed?: number;
    inputMethod?: InputMethod;
    tradeAction?: TradeAction;
    receivedAmount?: number;
    realizedPnl?: number;
    source?: string;
    chartLibrary?: string;
    entryPoint?: string;
    discoverySource?: string;
    perpDiscoverySource?: string;
    hlFeeRate?: number;
    tradeWithToken?: boolean;
    mmPayTokenSelected?: string;
    mmPayNetworkSelected?: string;
    vipTier?: number;
    vipDiscount?: number;
    abTests?: Record<string, string>;
};
export type TPSLTrackingData = {
    direction: 'long' | 'short';
    /**
     * @deprecated Source of the TP/SL update (e.g., 'tp_sl_view', 'position_card').
     * Prefer `entryPoint` / `discoverySource` / `perpDiscoverySource` for risk-event
     * attribution; `source` is retained for backward compatibility.
     */
    source: string;
    positionSize: number;
    takeProfitPercentage?: number;
    stopLossPercentage?: number;
    isEditingExistingPosition?: boolean;
    entryPrice?: number;
    entryPoint?: string;
    discoverySource?: string;
    perpDiscoverySource?: string;
};
export type OrderParams = {
    symbol: string;
    isBuy: boolean;
    size: string;
    orderType: OrderType;
    price?: string;
    reduceOnly?: boolean;
    isFullClose?: boolean;
    timeInForce?: 'GTC' | 'IOC' | 'ALO';
    usdAmount?: string;
    priceAtCalculation?: number;
    maxSlippageBps?: number;
    /**
     * @deprecated Use `maxSlippageBps` instead. Retained for one release so that
     * existing publisher consumers (extension, core) that still pass slippage as
     * a decimal (e.g. 0.03 for 3%) continue to work; the provider normalizes the
     * value to basis points when `maxSlippageBps` is absent.
     */
    slippage?: number;
    triggerPrice?: string;
    twapDuration?: number;
    twapRandomize?: boolean;
    scaleMinPrice?: string;
    scaleMaxPrice?: string;
    scaleNumOrders?: number;
    chaseIntervalMs?: number;
    chaseMaxDurationMs?: number;
    chaseMaxRepricings?: number;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    takeProfitSize?: string;
    stopLossSize?: string;
    clientOrderId?: string;
    /**
     * How an attached TP/SL is linked: to this order (`order`), to the resulting
     * position (`position`), or absent (`none`). Defaults to `none` without TP/SL
     * and `order` with TP/SL. Takes precedence over the deprecated `grouping`.
     */
    tpslLinkage?: TpslLinkage;
    /**
     * @deprecated Use `tpslLinkage`. This field carries HyperLiquid's own grouping
     * vocabulary; it is honoured for existing callers but a provider-agnostic
     * placement should not depend on protocol wording.
     */
    grouping?: 'na' | 'normalTpsl' | 'positionTpsl';
    currentPrice?: number;
    leverage?: number;
    existingPositionLeverage?: number;
    trackingData?: TrackingData;
    providerId?: PerpsProviderType;
};
export type OrderResult = {
    success?: boolean;
    /**
     * What names the placement afterwards.
     *
     * For an ordinary placement this is the exchange's order ID. For a *strategy*
     * placement it is a handle instead — a venue TWAP id, or a client-generated
     * scale-group or chase-session id — which is what `CancelOrderParams` takes
     * together with the matching `orderType`. The individual exchange ids a
     * strategy expanded into are in `childOrderIds`.
     */
    orderId?: string;
    error?: string;
    filledSize?: string;
    submittedSize?: string;
    averagePrice?: string;
    childOrderIds?: string[];
    providerId?: PerpsProviderType;
    /**
     * Structured record of venue state that was ALREADY committed before the
     * placement failed — e.g. a leverage change that landed before the order
     * was rejected. Present only on failure results where such state exists;
     * callers must not treat the failure as "nothing happened".
     */
    partialState?: {
        /** Leverage (in x) the venue already applied for this symbol. */
        leverageUpdated?: number;
    };
};
/**
 * A TP/SL protection change that could not be safely completed
 * automatically and requires an explicit new protection intent from the
 * user. Surfaced by providers with durable settlement state (Lighter).
 */
export type PerpsPendingManualRecovery = {
    symbol: string;
    /** Durable identity (address:accountIndex:apiKey:symbol). */
    settlementKey: string;
    recordedAt: number;
    /** Human-readable cause of the parked state. */
    reason: string;
    /** Whether the interrupted operation replaced or removed protection. */
    priorIntent: 'replace' | 'remove';
    /** Venue order ids still on the books when the state was parked. */
    survivingOrderIds: string[];
    /** What the user should do to resolve the state. */
    actionNeeded: string;
};
/**
 * A previously ambiguous dispatch whose outcome was later resolved.
 * Writes stay blocked until each outcome is explicitly acknowledged via
 * `acknowledgeRecoveredDispatch` (after the caller refreshes venue
 * state) — except `failed`, which is retry-safe and non-blocking.
 */
export type PerpsRecoveredDispatch = {
    /** Stable id for selective acknowledgment. */
    recoveryId: string;
    /** Venue transaction type of the dispatch. */
    kind: number;
    /** Human-readable operation intent. */
    intent: string;
    txHash: string | null;
    outcome: 'succeeded' | 'failed' | 'unknown';
    /** How the outcome was determined (e.g. `tx-status:3`, `rest-advance`). */
    evidence: string;
};
export type Position = {
    symbol: string;
    size: string;
    entryPrice: string;
    positionValue: string;
    unrealizedPnl: string;
    marginUsed: string;
    leverage: {
        type: 'isolated' | 'cross';
        value: number;
        rawUsd?: string;
    };
    liquidationPrice: string | null;
    maxLeverage: number;
    returnOnEquity: string;
    cumulativeFunding: {
        allTime: string;
        sinceOpen: string;
        sinceChange: string;
    };
    /**
     * Take profit price (if set).
     *
     * Legacy summary field: it may also reflect a TP/SL child of a *pending* order
     * on this market, which `takeProfitOrders` and `takeProfitCount` deliberately
     * exclude because such a child protects that order rather than the position.
     * A position can therefore report a price here with an empty array and a count
     * of `0`. Prefer `takeProfitOrders` for anything that must be exact.
     */
    takeProfitPrice?: string;
    /**
     * Stop loss price (if set). Same caveat as `takeProfitPrice`.
     */
    stopLossPrice?: string;
    takeProfitCount: number;
    stopLossCount: number;
    takeProfitOrders?: PositionTriggerOrder[];
    stopLossOrders?: PositionTriggerOrder[];
    providerId?: PerpsProviderType;
};
/**
 * A trigger order attached to a position, as surfaced in position state.
 * Provider-agnostic: protocols map their own trigger representation onto this.
 */
export type PositionTriggerOrder = {
    orderId: string;
    direction: TriggerDirection;
    orderType?: TriggerOrderType;
    triggerPrice: string;
    size: string;
    isPartial: boolean;
    reduceOnly: boolean;
};
export type AccountState = {
    /**
     * Total USD equity on this venue — collateral + unrealized PnL. Live MTM.
     * HL: crossMarginSummary.accountValue + spot(USDC) − spot.hold
     * MYX: walletBalance + marginUsed + unrealizedPnl
     */
    totalBalance: string;
    /**
     * Max USD that can immediately collateralize a new position on this venue,
     * with no internal transfer required.
     * HL Unified: withdrawable + freeSpotUSDC
     * HL Standard: withdrawable
     * MYX: walletBalance
     */
    spendableBalance: string;
    /**
     * Max USD that can leave this venue to the user's external wallet.
     * UI reads this value without branching on provider; the provider
     * contract guarantees HL's own abstraction (Unified) or the direct
     * perps-clearinghouse (Standard) is what actually settles the
     * withdraw — no client-side spot→perps sweep is performed.
     * HL Unified: withdrawable + freeSpotUSDC (USDC only; `freeSpotUSDC = spot.total - spot.hold`, and HL withdraw3 draws from the unified ledger server-side)
     * HL Standard: withdrawable (perps-clearinghouse only; spot is a separate ledger)
     * MYX: walletBalance
     */
    withdrawableBalance: string;
    marginUsed: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    /**
     * Per-sub-account balance breakdown (protocol-specific, optional)
     * Maps sub-account identifier to its balance details.
     *
     * Protocol examples:
     * - HyperLiquid HIP-3: '' or 'main' (main DEX), 'xyz' (HIP-3 builder DEX)
     * - dYdX: Sub-account numbers (e.g., '0', '1', '2')
     * - Other protocols: Vault IDs, pool IDs, margin account IDs, etc.
     *
     * Key: Sub-account identifier (protocol-specific string)
     * Value: Balance details for that sub-account
     */
    subAccountBreakdown?: Record<string, {
        spendableBalance: string;
        withdrawableBalance: string;
        totalBalance: string;
    }>;
    providerId?: PerpsProviderType;
};
export type ClosePositionParams = {
    symbol: string;
    size?: string;
    /**
     * Close order type (default: market). Only `market` and `limit` are meaningful
     * here: `ClosePositionParams` carries no trigger price, so a trigger-based
     * close is not expressible and would be rejected during placement.
     *
     * Strategy placements are excluded at the type level rather than left to a
     * runtime rejection, because this type cannot carry any of the fields they
     * require and `closePosition` has no path that executes them. Derived with
     * `Exclude` on purpose: it shrinks as `StrategyOrderType` grows, so a strategy
     * added later is refused here automatically.
     */
    orderType?: Exclude<OrderType, StrategyOrderType>;
    price?: string;
    currentPrice?: number;
    usdAmount?: string;
    priceAtCalculation?: number;
    maxSlippageBps?: number;
    trackingData?: TrackingData;
    providerId?: PerpsProviderType;
    /**
     * Optional live position data from WebSocket.
     *
     * Pass a WebSocket-sourced snapshot only. The provider treats its own
     * WebSocket position cache as fresher than this value and overrides the
     * snapshot's size and side with it, so a REST-sourced (potentially older)
     * position gives no benefit here.
     *
     * Providing it avoids a position fetch in the common case, but does not
     * guarantee one is skipped: when the WebSocket cache does not cover the
     * symbol's DEX (for example a HIP-3 DEX whose subscription has not published
     * this session), the provider issues a single `clearinghouseState` request for
     * that DEX alone, because the cache's silence proves nothing about the symbol.
     * If that request succeeds, its answer is authoritative — the close fails with
     * `No position found for <symbol>` when the DEX reports the symbol gone, even
     * if it reports no positions at all. This snapshot is used only when that
     * request fails, since a failed lookup proves nothing either.
     *
     * If not provided, the position is read from the WebSocket cache, falling back
     * to a REST fetch when the cache is not initialized.
     */
    position?: Position;
};
export type ClosePositionsParams = {
    symbols?: string[];
    closeAll?: boolean;
};
export type ClosePositionsResult = {
    success: boolean;
    successCount: number;
    failureCount: number;
    results: {
        symbol: string;
        success: boolean;
        error?: string;
    }[];
};
export type UpdateMarginParams = {
    symbol: string;
    amount: string;
    providerId?: PerpsProviderType;
};
export type MarginResult = {
    success: boolean;
    error?: string;
};
export type FlipPositionParams = {
    symbol: string;
    position: Position;
    trackingData?: TrackingData;
};
export type InitializeResult = {
    success: boolean;
    error?: string;
    chainId?: string;
};
export type ReadyToTradeResult = {
    ready: boolean;
    error?: string;
    walletConnected?: boolean;
    networkSupported?: boolean;
    authenticatedAddress?: string;
};
export type DisconnectResult = {
    success: boolean;
    error?: string;
};
export type MarketInfo = {
    name: string;
    szDecimals: number;
    maxLeverage: number;
    marginTableId: number;
    onlyIsolated?: true;
    isDelisted?: true;
    minimumOrderSize?: number;
    providerId?: PerpsProviderType;
};
/**
 * Market data with prices for UI display
 * Protocol-agnostic interface for market information with formatted values
 */
export type PerpsMarketData = {
    /**
     * Token symbol (e.g., 'BTC', 'ETH')
     */
    symbol: string;
    /**
     * Full token name (e.g., 'Bitcoin', 'Ethereum')
     */
    name: string;
    /**
     * Human-readable asset description from Terminal API metadata, when available
     * (e.g., 'The leading smart contract platform. Home to DeFi, NFTs...').
     * Only populated when using the Terminal API backend and the asset has one.
     */
    description?: string;
    /**
     * Maximum leverage available as formatted string (e.g., '40x', '25x')
     */
    maxLeverage: string;
    /**
     * Current price as formatted string (e.g., '$50,000.00')
     */
    price: string;
    /**
     * 24h price change as formatted string (e.g., '+$1,250.00', '-$850.50')
     */
    change24h: string;
    /**
     * 24h price change percentage as formatted string (e.g., '+2.5%', '-1.8%')
     */
    change24hPercent: string;
    /**
     * Trading volume as formatted string (e.g., '$1.2B', '$850M')
     */
    volume: string;
    /**
     * Open interest as formatted string (e.g., '$24.5M', '$1.2B')
     */
    openInterest?: string;
    /**
     * Next funding time in milliseconds since epoch (optional, market-specific)
     */
    nextFundingTime?: number;
    /**
     * Funding interval in hours (optional, market-specific)
     */
    fundingIntervalHours?: number;
    /**
     * Current funding rate as decimal (optional, from predictedFundings API)
     */
    fundingRate?: number;
    /**
     * Market source DEX identifier (HIP-3 support)
     * - null or undefined: Main validator DEX
     * - "xyz", "abc", etc: HIP-3 builder-deployed DEX
     */
    marketSource?: string | null;
    /**
     * Market asset type classification (optional)
     * - crypto: Cryptocurrency (default for most markets)
     * - stock: Individual stocks (HIP-3)
     * - pre-ipo: Pre-IPO assets (HIP-3)
     * - index: Market indices (HIP-3)
     * - etf: Exchange-traded funds (HIP-3)
     * - commodity: Commodity markets (HIP-3)
     * - forex: Foreign exchange pairs (HIP-3)
     */
    marketType?: MarketType;
    /**
     * Whether this is a HIP-3 market (has DEX prefix like xyz:, flx:)
     * Used to distinguish between crypto (isHip3=false) and non-crypto markets
     */
    isHip3?: boolean;
    /**
     * Whether this is a new/uncategorized market (HIP-3 markets not yet in explicit mapping)
     * Used for the "New" filter tab
     */
    isNewMarket?: boolean;
    /**
     * Multi-provider: which provider this market data comes from (injected by aggregator)
     */
    providerId?: PerpsProviderType;
    /**
     * Indicates this market snapshot came from the last known good cache after live fetch failure.
     */
    isStale?: boolean;
    /** Identifies an atomic Terminal summary whose price/change use mark semantics. */
    dataSource?: 'terminal-global-snapshot-mark';
    /** Source-bounded expiry for an atomic Terminal summary. */
    sourceExpiresAt?: number;
    /**
     * Searchable keywords from Terminal API metadata (e.g., ['defi', 'layer-1'])
     */
    keywords?: string[];
    /**
     * Taxonomy tags from Terminal API metadata (e.g., ['top-100', 'gaming'])
     */
    tags?: string[];
    /**
     * Market categories from Terminal API metadata (e.g., ['crypto', 'meme'])
     */
    categories?: string[];
    /** Timestamped hourly price points supplied by the atomic Terminal snapshot. */
    trend?: [timestampMs: number, price: string][];
    /**
     * Epoch ms when this market was listed on the Terminal backend.
     * Sourced from the Terminal API `listedAt` field.
     * Clients can use this to surface recently added markets (e.g. markets listed within the last 30 days).
     */
    listedAt?: number;
};
export type ToggleTestnetResult = {
    success: boolean;
    isTestnet: boolean;
    error?: string;
};
export type AssetRoute = {
    assetId: CaipAssetId;
    chainId: CaipChainId;
    contractAddress: Hex;
    constraints?: {
        minAmount?: string;
        maxAmount?: string;
        estimatedTime?: string;
        estimatedMinutes?: number;
        fees?: {
            fixed?: number;
            percentage?: number;
            token?: string;
        };
    };
};
export type SwitchProviderResult = {
    success: boolean;
    providerId: PerpsActiveProviderMode;
    error?: string;
};
export type CancelOrderParams = {
    orderId: string;
    symbol: string;
    /**
     * Placement type of what is being cancelled. Only the strategy types
     * (`twap`, `scale`, `chase`) change anything: each is cancelled through its
     * own path — the venue's TWAP cancel endpoint, a batch cancel of the ladder's
     * children, or stopping the chase session and cancelling its live order.
     * Omit it (or pass an ordinary order type) to cancel a single resting order,
     * which is what every existing caller does.
     */
    orderType?: OrderType;
    providerId?: PerpsProviderType;
    trackingData?: TrackingData;
};
export type CancelOrderResult = {
    success: boolean;
    /**
     * What was cancelled, named the same way it was placed: an exchange order ID
     * for an ordinary cancel, and the strategy handle — TWAP id, scale group, or
     * chase session — when `CancelOrderParams.orderType` named one.
     */
    orderId?: string;
    error?: string;
    providerId?: PerpsProviderType;
};
export type BatchCancelOrdersParams = {
    orderId: string;
    symbol: string;
}[];
export type CancelOrdersParams = {
    symbols?: string[];
    orderIds?: string[];
    cancelAll?: boolean;
};
export type CancelOrdersResult = {
    success: boolean;
    successCount: number;
    failureCount: number;
    results: {
        orderId: string;
        symbol: string;
        success: boolean;
        error?: string;
    }[];
};
export type EditOrderParams = {
    orderId: string | number;
    newOrder: OrderParams;
};
export type DepositParams = {
    amount: string;
    assetId: CaipAssetId;
    fromChainId?: CaipChainId;
    toChainId?: CaipChainId;
    recipient?: Hex;
};
/** Params for depositWithConfirmation: prepares transaction for confirmation screen */
export type DepositWithConfirmationParams = {
    /** Optional deposit amount (display/tracking; actual amount comes from prepared transaction) */
    amount?: string;
    /** If true, uses addTransaction instead of submit to avoid navigation (e.g. deposit + place order flow) */
    placeOrder?: boolean;
};
export type DepositResult = {
    success: boolean;
    txHash?: string;
    error?: string;
};
export type DepositStatus = 'idle' | 'preparing' | 'swapping' | 'bridging' | 'depositing' | 'success' | 'error';
export type DepositFlowType = 'direct' | 'swap' | 'bridge' | 'swap_bridge';
export type DepositStepInfo = {
    totalSteps: number;
    currentStep: number;
    stepNames: string[];
    stepTxHashes?: string[];
};
export type WithdrawParams = {
    amount: string;
    destination?: Hex;
    assetId?: CaipAssetId;
    providerId?: PerpsProviderType;
};
export type WithdrawResult = {
    success: boolean;
    txHash?: string;
    error?: string;
    withdrawalId?: string;
    estimatedArrivalTime?: number;
};
export type TransferBetweenDexsParams = {
    sourceDex: string;
    destinationDex: string;
    amount: string;
};
export type TransferBetweenDexsResult = {
    success: boolean;
    txHash?: string;
    error?: string;
};
export type GetHistoricalPortfolioParams = {
    accountId?: CaipAccountId;
};
export type HistoricalPortfolioResult = {
    accountValue1dAgo: string;
    timestamp: number;
};
export type LiveDataConfig = {
    priceThrottleMs?: number;
    positionThrottleMs?: number;
    maxUpdatesPerSecond?: number;
};
export type PerpsControllerConfig = {
    /**
     * Fallback blocked regions to use when RemoteFeatureFlagController fails to fetch.
     * The fallback is set by default if defined and replaced with remote block list once available.
     */
    fallbackBlockedRegions?: string[];
    /**
     * Fallback HIP-3 equity perps master switch to use when RemoteFeatureFlagController fails to fetch.
     * Controls whether HIP-3 (builder-deployed) DEXs are enabled.
     * The fallback is set by default if defined and replaced with remote feature flag once available.
     */
    fallbackHip3Enabled?: boolean;
    /**
     * Fallback HIP-3 market allowlist to use when RemoteFeatureFlagController fails to fetch.
     * Empty array = enable all markets (discovery mode), non-empty = allowlist specific markets.
     * Supports wildcards: "xyz:*" (all xyz markets), "xyz" (shorthand for "xyz:*"), "BTC" (main DEX market).
     * Only applies when HIP-3 is enabled.
     * The fallback is set by default if defined and replaced with remote feature flag once available.
     */
    fallbackHip3AllowlistMarkets?: string[];
    /**
     * Fallback HIP-3 market blocklist to use when RemoteFeatureFlagController fails to fetch.
     * Empty array = no blocking, non-empty = block specific markets.
     * Supports wildcards: "xyz:*" (block all xyz markets), "xyz" (shorthand for "xyz:*"), "BTC" (block main DEX market).
     * Always applied regardless of HIP-3 enabled state.
     * The fallback is set by default if defined and replaced with remote feature flag once available.
     */
    fallbackHip3BlocklistMarkets?: string[];
    /**
     * Override for the maximum allowed deviation of a market's price from its oracle
     * (reference) price before it is reported as untradable (`PriceUpdate.isTradable`),
     * as a decimal fraction (e.g. `0.95` = 95%). Protocol-agnostic: each provider applies
     * its own default when omitted (HyperLiquid uses
     * `HYPERLIQUID_CONFIG.OraclePriceDeviationLimit`, `0.95`). Lets a client tune the
     * threshold without a package release.
     */
    fallbackPriceDeviationLimit?: number;
    /**
     * Per-provider credentials and configuration.
     * Nested by provider name so each provider's settings are self-contained
     * and new protocols can be added without polluting the top-level config.
     * Passed from the init file where `process.env.X` is babel-transformed at build time.
     */
    providerCredentials?: PerpsProviderCredentials;
};
export type HyperLiquidCredentials = {
    /** Builder fee wallet address for testnet. Empty/omitted = uses BUILDER_FEE_CONFIG default. */
    builderAddressTestnet?: string;
    /** Builder fee wallet address for mainnet. Empty/omitted = uses BUILDER_FEE_CONFIG default. */
    builderAddressMainnet?: string;
    /** Dedicated subscription waiver builder for testnet. */
    subscriptionBuilderAddressTestnet?: string;
    /** Dedicated subscription waiver builder for mainnet. */
    subscriptionBuilderAddressMainnet?: string;
};
export type MYXCredentials = {
    /** Whether MYX provider is enabled via local env var. */
    enabled?: boolean;
    appIdTestnet?: string;
    apiSecretTestnet?: string;
    brokerAddressTestnet?: string;
    appIdMainnet?: string;
    apiSecretMainnet?: string;
    brokerAddressMainnet?: string;
};
export type LighterCredentials = {
    /** Whether Lighter provider is enabled via local env var. */
    enabled?: boolean;
    /** Lighter account index override (testnet tooling). */
    accountIndexTestnet?: number;
    accountIndexMainnet?: number;
    /** API key slot to register/use (defaults to LIGHTER_DEFAULT_API_KEY_INDEX). */
    apiKeyIndex?: number;
    /**
     * Transport for the Lighter Go/WASM signer, provided by the client
     * (mobile: off-screen WebView bridge; headless: in-process WASM).
     * Optional — without it the Lighter provider is read-only. Lives on the
     * Lighter credentials bag, not PerpsPlatformDependencies, so the shared
     * platform surface stays venue-agnostic.
     */
    signerBridge?: LighterSignerBridge;
};
export type PerpsProviderCredentials = {
    hyperliquid?: HyperLiquidCredentials;
    myx?: MYXCredentials;
    lighter?: LighterCredentials;
};
export type PriceUpdate = {
    symbol: string;
    price: string;
    timestamp: number;
    percentChange24h?: string;
    bestBid?: string;
    bestAsk?: string;
    spread?: string;
    markPrice?: string;
    funding?: number;
    openInterest?: number;
    volume24h?: number;
    /**
     * Whether the market is currently tradable. Defaults to `true`.
     *
     * Some markets — most often HIP-3 builder-deployed ones — become temporarily
     * untradable when their market price drifts too far from the oracle price, in which
     * case the protocol rejects orders (HyperLiquid: "Order price cannot be more than 95%
     * away from the reference price"). Clients use this to proactively show a "trading
     * unavailable" warning instead of letting the order fail on submission.
     *
     * Computed per provider/protocol from that protocol's own rules. It is `false` only
     * when a provider determines the market is currently untradable; a provider that has no
     * such rule, or cannot assess tradability yet (e.g. before the oracle price is cached),
     * reports `true`. The value is always a concrete boolean — never `undefined`.
     */
    isTradable: boolean;
    providerId?: PerpsProviderType;
};
export type OrderFill = {
    orderId: string;
    symbol: string;
    side: string;
    size: string;
    price: string;
    pnl: string;
    direction: string;
    fee: string;
    feeToken: string;
    timestamp: number;
    startPosition?: string;
    success?: boolean;
    liquidation?: {
        liquidatedUser: string;
        markPx: string;
        method: string;
    };
    orderType?: 'take_profit' | 'stop_loss' | 'liquidation' | 'regular';
    detailedOrderType?: string;
    providerId?: PerpsProviderType;
};
export type CheckEligibilityParams = {
    blockedRegions: string[];
    geoLocation: string;
};
export type GetPositionsParams = {
    accountId?: CaipAccountId;
    includeHistory?: boolean;
    skipCache?: boolean;
    standalone?: boolean;
    userAddress?: string;
};
export type GetAccountStateParams = {
    accountId?: CaipAccountId;
    source?: string;
    standalone?: boolean;
    userAddress?: string;
};
export type GetUserDataSnapshotParams = {
    userAddress: string;
    identity: {
        provider: 'hyperliquid';
        network: 'mainnet' | 'testnet';
        hip3ConfigVersion: number;
        dexes: string[];
    };
};
export type PerpsUserDataSnapshot = {
    positions: Position[];
    orders: Order[];
    accountState: AccountState;
    identity: GetUserDataSnapshotParams['identity'] & {
        address: string;
    };
};
export type GetOrderFillsParams = {
    accountId?: CaipAccountId;
    user?: Hex;
    startTime?: number;
    endTime?: number;
    limit?: number;
    aggregateByTime?: boolean;
};
/**
 * Parameters for getOrFetchFills - optimized cache-first fill retrieval.
 * Subset of GetOrderFillsParams for cache filtering.
 */
export type GetOrFetchFillsParams = {
    startTime?: number;
    symbol?: string;
};
export type GetOrdersParams = {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
    skipCache?: boolean;
    standalone?: boolean;
    userAddress?: string;
};
/**
 * Options for cache-aware provider read calls (getOrders, getOrderFills, etc.).
 * Provider-agnostic: providers without inner caches can ignore; providers that
 * cache at the service layer (e.g. HyperLiquid) must honor forceRefresh.
 */
export type PerpsReadOptions = {
    /** Bypass any provider-internal cache. Used for user-initiated refresh (pull-to-refresh). */
    forceRefresh?: boolean;
};
export type GetFundingParams = {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
};
export type GetSupportedPathsParams = {
    isTestnet?: boolean;
    assetId?: CaipAssetId;
    symbol?: string;
    chainId?: CaipChainId;
};
/** Placeholder for future filter/pagination params (e.g., validated, chain). Empty today so the API signature is stable. */
export type GetAvailableDexsParams = Record<string, never>;
/** Field to sort markets by. */
export type SortField = 'volume' | 'priceChange' | 'fundingRate' | 'openInterest';
/** Direction for market sorting. */
export type SortDirection = 'asc' | 'desc';
export type GetMarketsParams = {
    symbols?: string[];
    dex?: string;
    skipFilters?: boolean;
    standalone?: boolean;
    useTerminalApi?: boolean;
};
/**
 * Parameters for {@link PerpsController.getMarketDataWithPrices}.
 * Extends the base market-fetch params with optional category filtering,
 * sorting, and pagination that are applied as post-processing.
 */
export type GetMarketDataWithPricesParams = {
    standalone?: boolean;
    categories?: MarketTypeFilter[];
    excludeSymbols?: string[];
    sortBy?: SortField;
    direction?: SortDirection;
    limit?: number;
    useTerminalApi?: boolean;
};
export type SubscribePricesParams = {
    symbols: string[];
    callback: (prices: PriceUpdate[]) => void;
    throttleMs?: number;
    includeOrderBook?: boolean;
    includeMarketData?: boolean;
};
export type SubscribePositionsParams = {
    callback: (positions: Position[]) => void;
    accountId?: CaipAccountId;
    includeHistory?: boolean;
};
export type SubscribeOrderFillsParams = {
    callback: (fills: OrderFill[], isSnapshot?: boolean) => void;
    accountId?: CaipAccountId;
    since?: number;
};
export type SubscribeOrdersParams = {
    callback: (orders: Order[]) => void;
    accountId?: CaipAccountId;
    includeHistory?: boolean;
};
export type SubscribeAccountParams = {
    callback: (account: AccountState | null) => void;
    accountId?: CaipAccountId;
};
export type SubscribeOICapsParams = {
    callback: (caps: string[]) => void;
    accountId?: CaipAccountId;
};
export type SubscribeCandlesParams = {
    symbol: string;
    interval: CandlePeriod;
    duration?: TimeDuration;
    callback: (data: CandleData) => void;
    onError?: (error: Error) => void;
};
/**
 * Single price level in the order book
 */
export type OrderBookLevel = {
    /** Price at this level */
    price: string;
    /** Size at this level (in base asset) */
    size: string;
    /** Cumulative size up to and including this level */
    total: string;
    /** Notional value in USD */
    notional: string;
    /** Cumulative notional up to and including this level */
    totalNotional: string;
};
/**
 * Full order book data with multiple price levels
 */
export type OrderBookData = {
    /** Bid levels (buy orders) - highest price first */
    bids: OrderBookLevel[];
    /** Ask levels (sell orders) - lowest price first */
    asks: OrderBookLevel[];
    /** Spread between best bid and best ask */
    spread: string;
    /** Spread as a percentage of mid price */
    spreadPercentage: string;
    /** Mid price (average of best bid and best ask) */
    midPrice: string;
    /** Timestamp of last update */
    lastUpdated: number;
    /** Maximum total size across all levels (for scaling depth bars) */
    maxTotal: string;
};
export type SubscribeOrderBookParams = {
    /** Symbol to subscribe to (e.g., 'BTC', 'ETH') */
    symbol: string;
    /** Number of levels to return per side (default: 10) */
    levels?: number;
    /** Price aggregation significant figures (2-5, default: 5). Higher = finer granularity */
    nSigFigs?: 2 | 3 | 4 | 5;
    /** Mantissa for aggregation when nSigFigs is 5 (2 or 5). Controls finest price increments */
    mantissa?: 2 | 5;
    /**
     * Enable fast order book updates (5 levels @ ~0.5 s cadence).
     * When omitted, Hyperliquid uses the default cadence (20 levels @ ~2 s).
     * Note: with `fast: true` the widget receives at most 5 levels per side
     * regardless of the `levels` setting.
     */
    fast?: boolean;
    /** Callback function receiving order book updates */
    callback: (orderBook: OrderBookData) => void;
    /** Callback for errors */
    onError?: (error: Error) => void;
};
export type LiquidationPriceParams = {
    entryPrice: number;
    leverage: number;
    direction: 'long' | 'short';
    positionSize?: number;
    marginType?: 'isolated' | 'cross';
    asset?: string;
};
export type MaintenanceMarginParams = {
    asset: string;
    positionSize?: number;
};
export type FeeCalculationParams = {
    orderType: OrderType;
    isMaker?: boolean;
    amount?: string;
    symbol: string;
};
export type FeeCalculationResult = {
    feeRate?: number;
    feeAmount?: number;
    protocolFeeRate?: number;
    protocolFeeAmount?: number;
    metamaskFeeRate?: number;
    metamaskFeeAmount?: number;
    breakdown?: {
        baseFeeRate: number;
        volumeTier?: string;
        volumeDiscount?: number;
        stakingDiscount?: number;
    };
    /**
     * Read-only subscription fee-waiver preview, sourced from the same cached
     * benefits snapshot the fee resolver uses. Present only when the controller
     * has a subscription source wired; the quoted rates above are not adjusted
     * from it, so surfacing this never mutates the cap or the cache.
     */
    subscription?: PerpsSubscriptionFeeWaiverStatus;
};
/**
 * Usage state of the perps fee waiver on a subscription benefits snapshot.
 */
export type PerpsSubscriptionUsage = 'available' | 'exhausted';
/**
 * Subscription benefits as returned by `GET /v1/profiles/{profileId}/benefits`.
 *
 * The perps controller never performs this request itself — the client owns the
 * Profile JWT and injects the read through
 * {@link PerpsPlatformDependencies.subscription}. Only the fields the perps fee
 * waiver depends on are modelled here.
 */
export type PerpsSubscriptionBenefits = {
    /** Subscription status; only `active` can pass the eligibility gate. */
    status: string;
    /** Perps fee waiver entitlement and its remaining allowance. */
    perpsFeeWaiver?: {
        /** Whether the plan entitles this profile to the perps fee waiver. */
        entitled: boolean;
        /** Backend usage state; only `available` can pass the eligibility gate. */
        usage?: PerpsSubscriptionUsage;
        /**
         * Set by the backend once the notional cap is crossed. Honored on the next
         * cache refresh — there is no client-held reservation to release.
         */
        exhausted?: boolean;
        /** Notional (USD) still covered by the waiver, for fee previews. */
        remainingNotionalUsd?: number;
    };
};
/**
 * Why the subscription fee waiver did or did not apply, plus the remaining
 * allowance for fee previews. Derived purely from the cached benefits snapshot.
 */
export type PerpsSubscriptionFeeWaiverStatus = {
    /** True only when every condition of the eligibility gate passed. */
    eligible: boolean;
    /**
     * Gate outcome:
     * - `eligible` — every condition passed
     * - `no-source` — no subscription dependency is wired
     * - `not-hydrated` — nothing cached yet; a refresh was kicked off
     * - `stale` — the cached snapshot is past the hard-stale ceiling
     * - `no-subscription` — the read succeeded but reported no subscription at
     *   all (signed out, or no profile)
     * - `inactive` — subscription status is not `active`
     * - `not-entitled` — the plan does not include the perps fee waiver
     * - `exhausted` — the backend reported the notional cap as spent
     */
    reason: 'eligible' | 'no-source' | 'not-hydrated' | 'stale' | 'no-subscription' | 'inactive' | 'not-entitled' | 'exhausted';
    /** Notional (USD) still covered by the waiver, when the backend reports it. */
    remainingNotionalUsd?: number;
};
/**
 * Fee source that won the unified resolver.
 *
 * `rewards` covers both VIP and season discounts: `RewardsController` already
 * returns the better of the two as a single discount, so the perps controller
 * treats them as one source rather than re-deriving the split.
 */
export type PerpsFeeSource = 'default' | 'rewards' | 'subscription';
/**
 * Outcome of the unified fee resolver.
 */
export type PerpsFeeResolution = {
    /** Winning MetaMask builder fee, in basis points (lowest across sources). */
    feeBips: number;
    /**
     * Winning fee expressed as a discount off the default builder fee, in basis
     * points — the unit providers consume. `undefined` when no source resolved
     * (e.g. rewards state has not hydrated and no subscription waiver applies),
     * so callers do not treat it as a definitive "no discount" answer.
     */
    discountBips: number | undefined;
    /** Source that produced the winning fee. */
    source: PerpsFeeSource;
    /** Subscription gate outcome, always populated for observability. */
    subscription: PerpsSubscriptionFeeWaiverStatus;
};
export type UpdatePositionTPSLParams = {
    symbol: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    takeProfitSize?: string;
    stopLossSize?: string;
    trackingData?: TPSLTrackingData;
    providerId?: PerpsProviderType;
    /**
     * Optional live position data from WebSocket.
     * If provided, skips the REST API position fetch (avoids rate limiting issues).
     * If not provided, falls back to fetching positions via REST API.
     */
    position?: Position;
};
export type Order = {
    orderId: string;
    symbol: string;
    side: 'buy' | 'sell';
    orderType: OrderType;
    size: string;
    originalSize: string;
    price: string;
    filledSize: string;
    remainingSize: string;
    status: 'open' | 'filled' | 'canceled' | 'rejected' | 'triggered' | 'queued';
    timestamp: number;
    lastUpdated?: number;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    stopLossOrderId?: string;
    takeProfitOrderId?: string;
    detailedOrderType?: string;
    isTrigger?: boolean;
    triggerOrderType?: TriggerOrderType;
    reduceOnly?: boolean;
    isPositionTpsl?: boolean;
    parentOrderId?: string;
    isSynthetic?: boolean;
    triggerPrice?: string;
    providerId?: PerpsProviderType;
};
export type Funding = {
    symbol: string;
    amountUsd: string;
    rate?: string;
    timestamp: number;
    transactionHash?: string;
};
export type PerpsProvider = {
    readonly protocolId: string;
    getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[];
    getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[];
    placeOrder(params: OrderParams): Promise<OrderResult>;
    editOrder(params: EditOrderParams): Promise<OrderResult>;
    cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult>;
    cancelOrders?(params: BatchCancelOrdersParams): Promise<CancelOrdersResult>;
    closePosition(params: ClosePositionParams): Promise<OrderResult>;
    closePositions?(params: ClosePositionsParams): Promise<ClosePositionsResult>;
    updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
    updateMargin(params: UpdateMarginParams): Promise<MarginResult>;
    getPendingManualRecoveries?(): Promise<PerpsPendingManualRecovery[]>;
    getRecoveredDispatches?(): Promise<PerpsRecoveredDispatch[]>;
    acknowledgeRecoveredDispatch?(recoveryId: string): Promise<void>;
    getPositions(params?: GetPositionsParams): Promise<Position[]>;
    getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
    getUserDataSnapshot?(params: GetUserDataSnapshotParams): Promise<PerpsUserDataSnapshot>;
    getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]>;
    getMarketDataWithPrices(): Promise<PerpsMarketData[]>;
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    validateDeposit(params: DepositParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    validateOrder(params: OrderParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    validateClosePosition(params: ClosePositionParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    validateWithdrawal(params: WithdrawParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Historical trade fills - actual executed trades with exact prices and fees.
     * Purpose: Track what actually happened when orders were executed.
     * Example: Market long 1 ETH @ $50,000 → OrderFill with exact execution price and fees
     */
    getOrderFills(params?: GetOrderFillsParams, options?: PerpsReadOptions): Promise<OrderFill[]>;
    /**
     * Get fills using WebSocket cache first, falling back to REST API.
     * OPTIMIZATION: Uses cached fills when available (0 API weight), only calls REST on cache miss.
     * Purpose: Prevent 429 errors during rapid market switching by reusing cached fills.
     *
     * @param params - Optional filter parameters (startTime, symbol)
     */
    getOrFetchFills(params?: GetOrFetchFillsParams): Promise<OrderFill[]>;
    /**
     * Get historical portfolio data
     * Purpose: Retrieve account value from previous periods for PnL tracking
     * Example: Get account value from yesterday to calculate 24h percentage change
     *
     * @param params - Optional parameters for historical portfolio retrieval
     */
    getHistoricalPortfolio(params?: GetHistoricalPortfolioParams): Promise<HistoricalPortfolioResult>;
    /**
     * Historical order lifecycle - order placement, modifications, and status changes.
     * Purpose: Track the complete journey of orders from request to completion.
     * Example: Limit buy 1 ETH @ $48,000 → Order with status 'open' → 'filled' when executed
     */
    getOrders(params?: GetOrdersParams, options?: PerpsReadOptions): Promise<Order[]>;
    /**
     * Currently active open orders (real-time status).
     * Purpose: Show orders that are currently open/pending execution (not historical states).
     * Different from getOrders() which returns complete historical order lifecycle.
     * Example: Shows only orders that are actually open right now in the exchange.
     */
    getOpenOrders(params?: GetOrdersParams): Promise<Order[]>;
    /**
     * Historical funding payments - periodic costs/rewards for holding positions.
     * Purpose: Track ongoing expenses and income from position maintenance.
     * Example: Holding long ETH position → Funding payment of -$5.00 (you pay the funding)
     */
    getFunding(params?: GetFundingParams, options?: PerpsReadOptions): Promise<Funding[]>;
    /**
     * Get user non-funding ledger updates (deposits, transfers, withdrawals)
     */
    getUserNonFundingLedgerUpdates(params?: {
        accountId?: string;
        startTime?: number;
        endTime?: number;
    }): Promise<RawLedgerUpdate[]>;
    /**
     * Resolve the provider's currently active account identifier.
     * Used by the REST coalesce layer so cached payloads are account-scoped
     * even when callers omit params.accountId (the common hook path) — prevents
     * one account's data from being served after an account switch within
     * the coalesce TTL window.
     */
    getCurrentAccountId(): Promise<CaipAccountId>;
    /**
     * Get user history (deposits, withdrawals, transfers)
     */
    getUserHistory(params?: {
        accountId?: CaipAccountId;
        startTime?: number;
        endTime?: number;
    }): Promise<UserHistoryItem[]>;
    calculateLiquidationPrice(params: LiquidationPriceParams): Promise<string>;
    calculateMaintenanceMargin(params: MaintenanceMarginParams): Promise<number>;
    getMaxLeverage(asset: string): Promise<number>;
    calculateFees(params: FeeCalculationParams): Promise<FeeCalculationResult>;
    subscribeToPrices(params: SubscribePricesParams): () => void;
    subscribeToPositions(params: SubscribePositionsParams): () => void;
    subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;
    subscribeToOrders(params: SubscribeOrdersParams): () => void;
    subscribeToAccount(params: SubscribeAccountParams): () => void;
    subscribeToOICaps(params: SubscribeOICapsParams): () => void;
    subscribeToCandles(params: SubscribeCandlesParams): () => void;
    subscribeToOrderBook(params: SubscribeOrderBookParams): () => void;
    setLiveDataConfig(config: Partial<LiveDataConfig>): void;
    toggleTestnet(): Promise<ToggleTestnetResult>;
    initialize(): Promise<InitializeResult>;
    isReadyToTrade(): Promise<ReadyToTradeResult>;
    disconnect(): Promise<DisconnectResult>;
    ping(timeoutMs?: number): Promise<void>;
    getWebSocketConnectionState?(): WebSocketConnectionState;
    subscribeToConnectionState?(listener: (state: WebSocketConnectionState, reconnectionAttempt: number) => void): () => void;
    reconnect?(): Promise<void>;
    getBlockExplorerUrl(address?: string): string;
    setUserFeeDiscount?(discountBips: number | undefined): void;
    setUserFeeResolution?(resolution: PerpsFeeResolution | undefined): void;
    /** Approve the dedicated subscription builder outside order submission. */
    approveSubscriptionBuilderFee?(): Promise<boolean>;
    /**
     * Get list of available HIP-3 builder-deployed DEXs
     *
     * @param params - Optional parameters (reserved for future filters/pagination)
     * @returns Array of DEX names (empty string '' represents main DEX)
     */
    getAvailableDexs?(params?: GetAvailableDexsParams): Promise<string[]>;
    /**
     * Fetch historical OHLCV candle data for a symbol.
     * Optional: only providers that support historical candles need to implement this.
     */
    fetchHistoricalCandles?(options: {
        symbol: string;
        interval: CandlePeriod;
        limit?: number;
        endTime?: number;
    }): Promise<CandleData>;
};
/**
 * Provider identifier type for multi-provider support.
 * Add new providers here as they are implemented.
 */
export type PerpsProviderType = 'hyperliquid' | 'myx' | 'lighter';
/**
 * Active provider mode for PerpsController state.
 * - Direct providers: 'hyperliquid', 'myx'
 * - 'aggregated': Multi-provider aggregation mode
 */
export type PerpsActiveProviderMode = PerpsProviderType | 'aggregated';
/**
 * Aggregation mode for read operations.
 * - 'all': Aggregate data from all registered providers
 * - 'active': Only aggregate from providers with active connections
 * - 'specific': Aggregate from a specific subset of providers
 */
export type AggregationMode = 'all' | 'active' | 'specific';
/**
 * Routing strategy for write operations.
 * Phase 1 only supports 'default_provider' - advanced strategies deferred to Phase 3.
 */
export type RoutingStrategy = 'default_provider';
/**
 * Configuration for AggregatedPerpsProvider
 */
export type AggregatedProviderConfig = {
    /** Map of provider ID to provider instance */
    providers: Map<PerpsProviderType, PerpsProvider>;
    /** Default provider for write operations when providerId not specified */
    defaultProvider: PerpsProviderType;
    /** Aggregation mode for read operations (default: 'all') */
    aggregationMode?: AggregationMode;
    /** Platform dependencies for logging, metrics, etc. */
    infrastructure: PerpsPlatformDependencies;
};
/**
 * Provider-specific error with context for multi-provider error handling
 */
export type ProviderError = {
    /** Which provider the error originated from */
    providerId: PerpsProviderType;
    /** Human-readable error message */
    message: string;
    /** Original error object if available */
    originalError?: Error;
    /** Whether the operation can be retried */
    isRetryable?: boolean;
};
/**
 * Aggregated account state combining data from multiple providers
 */
export type AggregatedAccountState = {
    /** Combined totals across all providers */
    total: AccountState;
    /** Per-provider breakdown */
    byProvider: Map<PerpsProviderType, AccountState>;
};
/**
 * Injectable logger interface for error reporting.
 * Allows core package to be platform-agnostic (mobile: Sentry, extension: different impl)
 */
export type PerpsLogger = {
    error(error: Error, options?: {
        tags?: Record<string, string | number>;
        context?: {
            name: string;
            data: Record<string, unknown>;
        };
        extras?: Record<string, unknown>;
    }): void;
};
/**
 * Analytics events specific to Perps feature.
 * These are the actual event names sent to analytics backend.
 * Values must match the corresponding MetaMetricsEvents values in mobile for compatibility.
 *
 * When migrating to core monorepo, this enum travels with PerpsController.
 */
export declare enum PerpsAnalyticsEvent {
    WithdrawalTransaction = "Perp Withdrawal Transaction",
    TradeTransaction = "Perp Trade Transaction",
    PositionCloseTransaction = "Perp Position Close Transaction",
    OrderCancelTransaction = "Perp Order Cancel Transaction",
    ScreenViewed = "Perp Screen Viewed",
    UiInteraction = "Perp UI Interaction",
    RiskManagement = "Perp Risk Management",
    PerpsError = "Perp Error",
    AccountSetup = "Perp Account Setup",
    TransactionConsidered = "Perp Transaction Considered",
    TradeQuoteReceived = "Perp Trade Quote Received",
    SearchQuery = "Perp Search Query",
    SearchResultTapped = "Perp Search Result Tapped",
    SearchAbandoned = "Perp Search Abandoned"
}
/**
 * UTM / discovery attribution context for Perps analytics.
 *
 * Held transiently in-memory by PerpsController (never persisted in state) and
 * merged into analytics event properties so client-originated UTM attribution
 * can be propagated onto core-emitted transaction events.
 */
export type PerpsAttributionContext = {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
};
/**
 * Perps-specific trace names. These must match TraceName enum values in mobile.
 * When in core monorepo, this defines the valid trace names for Perps operations.
 */
export type PerpsTraceName = 'Perps Open Position' | 'Perps Close Position' | 'Perps Deposit' | 'Perps Withdraw' | 'Perps Place Order' | 'Perps Edit Order' | 'Perps Cancel Order' | 'Perps Update TP/SL' | 'Perps Update Margin' | 'Perps Flip Position' | 'Perps Market Data Update' | 'Perps Order View' | 'Perps Tab View' | 'Perps Market List View' | 'Perps Position Details View' | 'Perps Adjust Margin View' | 'Perps Order Details View' | 'Perps Order Book View' | 'Perps Flip Position Sheet' | 'Perps Transactions View' | 'Perps Order Fills Fetch' | 'Perps Orders Fetch' | 'Perps Funding Fetch' | 'Perps Get Positions' | 'Perps Get Account State' | 'Perps Get Historical Portfolio' | 'Perps Get Markets' | 'Perps Get Market Data With Prices' | 'Perps Fetch Historical Candles' | 'Perps WebSocket Connected' | 'Perps WebSocket Disconnected' | 'Perps WebSocket First Positions' | 'Perps WebSocket First Orders' | 'Perps WebSocket First Account' | 'Perps Data Lake Report' | 'Perps Rewards API Call' | 'Perps Close Position View' | 'Perps Withdraw View' | 'Perps Connection Establishment' | 'Perps Account Switch Reconnection' | 'Perps Market Data Preload' | 'Perps User Data Preload';
/**
 * Perps trace name constants. Values match TraceName enum in mobile.
 * When in core, these ARE the source of truth - mobile will re-export from core.
 */
export declare const PerpsTraceNames: {
    readonly PlaceOrder: "Perps Place Order";
    readonly EditOrder: "Perps Edit Order";
    readonly CancelOrder: "Perps Cancel Order";
    readonly ClosePosition: "Perps Close Position";
    readonly UpdateTpsl: "Perps Update TP/SL";
    readonly UpdateMargin: "Perps Update Margin";
    readonly FlipPosition: "Perps Flip Position";
    readonly Withdraw: "Perps Withdraw";
    readonly Deposit: "Perps Deposit";
    readonly GetPositions: "Perps Get Positions";
    readonly GetAccountState: "Perps Get Account State";
    readonly GetMarkets: "Perps Get Markets";
    readonly GetMarketDataWithPrices: "Perps Get Market Data With Prices";
    readonly OrderFillsFetch: "Perps Order Fills Fetch";
    readonly OrdersFetch: "Perps Orders Fetch";
    readonly FundingFetch: "Perps Funding Fetch";
    readonly GetHistoricalPortfolio: "Perps Get Historical Portfolio";
    readonly FetchHistoricalCandles: "Perps Fetch Historical Candles";
    readonly DataLakeReport: "Perps Data Lake Report";
    readonly WebsocketConnected: "Perps WebSocket Connected";
    readonly WebsocketDisconnected: "Perps WebSocket Disconnected";
    readonly WebsocketFirstPositions: "Perps WebSocket First Positions";
    readonly WebsocketFirstOrders: "Perps WebSocket First Orders";
    readonly WebsocketFirstAccount: "Perps WebSocket First Account";
    readonly RewardsApiCall: "Perps Rewards API Call";
    readonly ConnectionEstablishment: "Perps Connection Establishment";
    readonly AccountSwitchReconnection: "Perps Account Switch Reconnection";
    readonly MarketDataPreload: "Perps Market Data Preload";
    readonly UserDataPreload: "Perps User Data Preload";
};
/**
 * Perps trace operation constants. Values match TraceOperation enum in mobile.
 * These categorize traces by type of operation for Sentry/observability filtering.
 */
export declare const PerpsTraceOperations: {
    readonly Operation: "perps.operation";
    readonly OrderSubmission: "perps.order_submission";
    readonly PositionManagement: "perps.position_management";
    readonly MarketData: "perps.market_data";
};
/**
 * Values allowed in trace data/tags. Matches Sentry's TraceValue type.
 */
export type PerpsTraceValue = string | number | boolean;
/**
 * Properties allowed in analytics events. More constrained than unknown.
 * Named PerpsAnalyticsProperties to avoid conflict with PERPS_EVENT_PROPERTY
 * constant object from eventNames.ts (which contains property key names).
 */
export type PerpsAnalyticsProperties = Record<string, string | number | boolean | Record<string, string> | null | undefined>;
/**
 * Injectable metrics interface for analytics.
 * Allows core package to work with different analytics backends.
 */
export type PerpsMetrics = {
    isEnabled(): boolean;
    /**
     * Track a Perps-specific analytics event with properties.
     * This abstracts away the MetricsEventBuilder pattern used in mobile.
     *
     * @param event - The Perps analytics event type (enum with actual event name values)
     * @param properties - Type-safe key-value properties to attach to the event
     */
    trackPerpsEvent(event: PerpsAnalyticsEvent, properties: PerpsAnalyticsProperties): void;
};
/**
 * Injectable debug logger for development logging.
 * Only logs in development mode.
 * Accepts `unknown` to allow logging error objects from catch blocks.
 */
export type PerpsDebugLogger = {
    log(...args: unknown[]): void;
};
/**
 * Injectable stream manager interface for pause/resume during critical operations.
 *
 * WHY THIS IS NEEDED:
 * PerpsStreamManager is a React-based mobile-specific singleton that:
 * - Uses React Context for subscription management
 * - Uses react-native-performance for tracing
 * - Directly accesses Engine.context (mobile singleton pattern)
 * - Manages WebSocket connections with throttling/caching
 *
 * PerpsController only needs pause/resume during critical operations (withStreamPause method)
 * to prevent stale UI updates during batch operations. The minimal interface allows:
 * - Mobile: Wrap existing singleton (streamManager[channel].pause())
 * - Extension: Implement with whatever streaming solution they use
 */
/**
 * Injectable stream manager interface for pause/resume during critical operations.
 *
 * WHY THIS IS NEEDED:
 * PerpsStreamManager is a React-based mobile-specific singleton that:
 * - Uses React Context for subscription management
 * - Uses react-native-performance for tracing
 * - Directly accesses Engine.context (mobile singleton pattern)
 * - Manages WebSocket connections with throttling/caching
 *
 * PerpsController only needs pause/resume during critical operations (withStreamPause method)
 * to prevent stale UI updates during batch operations. The minimal interface allows:
 * - Mobile: Wrap existing singleton (streamManager[channel].pause())
 * - Extension: Implement with whatever streaming solution they use
 */
export type PerpsStreamManager = {
    pauseChannel(channel: string): void;
    resumeChannel(channel: string): void;
    clearAllChannels(): void;
};
/**
 * Injectable performance monitor interface.
 * Wraps react-native-performance or browser Performance API.
 */
export type PerpsPerformance = {
    now(): number;
};
/**
 * Injectable tracer interface for Sentry/observability tracing.
 * Services use this to create spans and measure operation durations.
 *
 * Note: trace() returns void because services use name/id pairs to identify traces.
 * The actual span management is handled internally by the platform adapter.
 */
export type PerpsTracer = {
    trace(params: {
        name: PerpsTraceName;
        id: string;
        op: string;
        tags?: Record<string, PerpsTraceValue>;
        data?: Record<string, PerpsTraceValue>;
    }): void;
    endTrace(params: {
        name: PerpsTraceName;
        id: string;
        data?: Record<string, PerpsTraceValue>;
    }): void;
    setMeasurement(name: string, value: number, unit: string): void;
    addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
        data?: Record<string, unknown>;
    }): void;
};
/**
 * Minimal typed-message params passed to keyring for EIP-712 signing.
 * Structurally matches KeyringController's TypedMessageParams.
 */
export type PerpsTypedMessageParams = {
    from: string;
    data: unknown;
};
/**
 * Minimal transaction params passed to TransactionController.addTransaction.
 * Only the fields PerpsController actually sets.
 */
export type PerpsTransactionParams = {
    from: string;
    to?: string;
    value?: string;
    data?: string;
    gas?: string;
};
/**
 * Options passed to TransactionController.addTransaction.
 */
export type PerpsAddTransactionOptions = {
    networkClientId: string;
    origin?: string;
    type?: string;
    skipInitialGasEstimate?: boolean;
};
/**
 * Minimal account shape read from AccountTreeController.
 * Only the fields PerpsController and its services actually use.
 */
export type PerpsInternalAccount = {
    address: string;
    type: string;
    id: string;
};
/**
 * Minimal remote feature flag state shape.
 * Only the remoteFeatureFlags record is needed by PerpsController.
 */
export type PerpsRemoteFeatureFlagState = {
    remoteFeatureFlags: Record<string, unknown>;
};
/**
 * Injectable interface for the Terminal-market service.
 *
 * `MarketDataService` programs against this contract so the concrete
 * `TerminalMarketService` class (which lives in `services/`) never leaks
 * into the types barrel — callers can supply any implementation that
 * satisfies the shape (production, stub, mock, etc.).
 */
export type PerpsTerminalMarketService = {
    fetchMarkets(): Promise<{
        markets: MarketInfo[];
        metadata: Map<string, TerminalAssetMetadata>;
    }>;
    clearCache(): void;
    logError(error: unknown, method: string): void;
    fetchGlobalSnapshot?(request: PerpsGlobalSnapshotRequest): Promise<PerpsGlobalSnapshotResult>;
};
/** Exact identity a client expects from an atomic global Perps snapshot. */
export type PerpsGlobalSnapshotRequest = {
    provider: 'hyperliquid';
    network: 'mainnet' | 'testnet';
    enabledDexes: string[];
};
/** Validated snapshot data and its source-bounded expiry. */
export type PerpsGlobalSnapshotResult = {
    markets: PerpsMarketData[];
    expiresAt: number;
};
/**
 * Platform dependencies for PerpsController and services.
 *
 * Architecture:
 * - Observability: logger, debugLogger, metrics, performance, tracer
 * - Platform: streamManager (mobile/extension specific)
 * - Cache: cache invalidation for standalone queries
 * - Rewards: delegated rewards interaction (DI — no RewardsController in Core yet)
 *
 * Cross-controller communication uses the messenger pattern (messenger.call).
 * Only rewards remains as DI because RewardsController is not yet in Core.
 */
export type PerpsPlatformDependencies = {
    logger: PerpsLogger;
    debugLogger: PerpsDebugLogger;
    metrics: PerpsMetrics;
    performance: PerpsPerformance;
    tracer: PerpsTracer;
    streamManager: PerpsStreamManager;
    featureFlags: {
        /**
         * Validate a version-gated feature flag against current app version.
         * Returns true if flag is enabled AND app meets minimum version,
         * false if flag is disabled, or undefined if flag is misconfigured/overridden.
         *
         * Platform-specific because it uses react-native-device-info (mobile)
         * or browser APIs (extension) to get the app version.
         */
        validateVersionGated(flag: VersionGatedFeatureFlag): boolean | undefined;
    };
    marketDataFormatters: MarketDataFormatters;
    cacheInvalidator: PerpsCacheInvalidator;
    diskCache: {
        getItem(key: string): Promise<string | null>;
        getItemSync?(key: string): string | null;
        setItem(key: string, value: string): Promise<void>;
        removeItem(key: string): Promise<void>;
    };
    terminalApi?: {
        /** Full endpoint URL for the legacy perpetuals market-data endpoint. */
        marketDataUrl?: string;
        /** Full endpoint URL for the schema-v2 atomic global Perps snapshot. */
        globalSnapshotUrl?: string;
    };
    /** @deprecated Use `terminalApi.marketDataUrl`. */
    terminalApiUrl?: string;
    /**
     * Optional Terminal-market service instance for fetching structured market
     * metadata from the MetaMask Terminal API.
     *
     * When provided, `MarketDataService` uses this service to attempt the
     * Terminal API path before falling back to the provider.
     * Clients that do not use the Terminal API can omit this field.
     */
    terminalMarketService?: PerpsTerminalMarketService;
    rewards: {
        /**
         * Get fee discount for an account from the RewardsController.
         * Returns discount in basis points (e.g., 6500 = 65% discount), or null
         * when subscription state hasn't hydrated yet — callers should skip
         * caching null results and retry on the next fee calculation.
         *
         * Pass the perps MetaMask builder base fee in bips so the rewards
         * controller can convert an absolute VIP fee into a discount fraction.
         */
        getPerpsDiscountForAccount(caipAccountId: `${string}:${string}:${string}`, baseFeeBips: number): Promise<number | null>;
    };
    /**
     * Optional subscription source for the unified fee resolver.
     *
     * The client owns the Profile JWT, so it performs
     * `GET /v1/profiles/{profileId}/benefits` and hands the perps controller the
     * parsed body. The controller caches the result stale-while-revalidate and
     * never awaits this call on the order-signing path.
     *
     * Omit it entirely on clients that do not ship the subscription waiver; the
     * resolver then falls back to the rewards and default sources.
     */
    subscription?: {
        /**
         * Read the current profile's subscription benefits.
         * Resolve `null` when there is no subscription to report (signed out, no
         * profile). Rejections are tolerated: the resolver keeps the previous
         * snapshot and never grants the waiver from a failed read.
         */
        getPerpsBenefits(): Promise<PerpsSubscriptionBenefits | null>;
    };
};
/**
 * Cache types that can be invalidated.
 * Used by standalone query caches (e.g., usePerpsPositionForAsset).
 */
export type PerpsCacheType = 'positions' | 'accountState' | 'markets';
/**
 * Parameters for invalidating a specific cache type.
 */
export type InvalidateCacheParams = {
    /** The type of cache to invalidate */
    cacheType: PerpsCacheType;
};
/**
 * Cache invalidation interface for standalone query caches.
 * Allows services to signal when data has changed without depending on
 * mobile-specific implementations.
 */
export type PerpsCacheInvalidator = {
    /**
     * Invalidate a specific cache type.
     * Notifies all subscribers that cached data is stale.
     */
    invalidate(params: InvalidateCacheParams): void;
    /**
     * Invalidate all cache types.
     */
    invalidateAll(): void;
};
/**
 * Injectable formatters for market data transformation.
 * Decouples marketDataTransform from mobile-specific intl/formatUtils imports.
 *
 * Range configs are opaque (unknown[]) because the concrete type
 * (FiatRangeConfig on mobile) is platform-specific. The formatter
 * implementation casts internally.
 */
export type MarketDataFormatters = {
    /** Format a number as a USD volume string (e.g., '$1.2B', '$850M') */
    formatVolume(value: number): string;
    /** Format a number as a USD fiat string with adaptive precision */
    formatPerpsFiat(value: number, options?: {
        ranges?: unknown[];
    }): string;
    /** Format a number as a percentage string (e.g., '2.50%', '-1.80%') */
    formatPercentage(percent: number): string;
    /** Universal price ranges for formatting (opaque to portable code) */
    priceRangesUniversal: unknown[];
};
/**
 * Minimal payment token for deposit flow.
 * Only the fields actually used by PerpsController are included.
 * Replaces the mobile-only AssetType (which extends TokenI and uses ImageSourcePropType).
 */
export type PaymentToken = {
    description?: string;
    address: string;
    chainId?: string;
    symbol?: string;
};
/**
 * Selected pay-with token shape used in PerpsController state, pending trade config,
 * selectors, and UI hooks. Use this type everywhere this shape is needed.
 */
export type PerpsSelectedPaymentToken = {
    description?: string;
    address: string;
    chainId: string;
    symbol?: string;
};
/**
 * Structure for a version-gated feature flag from LaunchDarkly.
 * Portable: no platform-specific imports.
 */
export type VersionGatedFeatureFlag = {
    enabled: boolean;
    minimumVersion: string;
};
/**
 * Type guard for VersionGatedFeatureFlag.
 * Pure logic, no platform dependencies.
 *
 * @param value - The value to check.
 * @returns True if the value is a VersionGatedFeatureFlag.
 */
export declare function isVersionGatedFeatureFlag(value: unknown): value is VersionGatedFeatureFlag;
export type * from "./perps-types.cjs";
export * from "./transactionTypes.cjs";
export type { AssetPosition, SpotBalance, PerpsUniverse, PerpsAssetCtx, PredictedFunding, FrontendOrder, SDKOrderParams, ClearinghouseStateResponse, SpotClearinghouseStateResponse, MetaResponse, FrontendOpenOrdersResponse, AllMidsResponse, MetaAndAssetCtxsResponse, PredictedFundingsResponse, SpotMetaResponse, } from "./hyperliquid-types.cjs";
//# sourceMappingURL=index.d.cts.map