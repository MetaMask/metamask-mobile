/**
 * LighterProvider
 *
 * Provider implementation for the zkLighter protocol (POC).
 * Implements the PerpsProvider interface with live REST reads and a real
 * write path (place/cancel limit orders) driven through the Lighter Go/WASM
 * signer behind the transport-agnostic {@link LighterSignerBridge} seam.
 *
 * Key differences from HyperLiquid:
 * - Venue-specific key (Schnorr over ECgFp5) registered per API-key slot via
 *   a ChangePubKey L2 transaction carrying an EIP-191 personal_sign L1Sig.
 * - Order prices/sizes are integers scaled by per-market decimals.
 * - REST + polling in the POC; WebSocket streams deferred.
 */
import type { CaipAccountId } from "@metamask/utils";
import type { CandlePeriod } from "../constants/chartConfig.cjs";
import type { PerpsControllerMessenger } from "../PerpsController.cjs";
import { WebSocketConnectionState } from "../types/index.cjs";
import type { AccountState, AssetRoute, CandleData, CancelOrderParams, CancelOrderResult, ClosePositionParams, DepositParams, DisconnectResult, EditOrderParams, FeeCalculationParams, FeeCalculationResult, Funding, GetAccountStateParams, GetFundingParams, GetHistoricalPortfolioParams, GetMarketsParams, GetOrderFillsParams, GetOrdersParams, GetOrFetchFillsParams, GetPositionsParams, GetSupportedPathsParams, HistoricalPortfolioResult, InitializeResult, LiquidationPriceParams, LiveDataConfig, MaintenanceMarginParams, MarginResult, MarketInfo, Order, OrderFill, OrderParams, OrderResult, PerpsMarketData, PerpsPlatformDependencies, PerpsProvider, PerpsReadOptions, Position, RawLedgerUpdate, ReadyToTradeResult, SubscribeAccountParams, SubscribeCandlesParams, SubscribeOICapsParams, SubscribeOrderBookParams, SubscribeOrderFillsParams, SubscribeOrdersParams, SubscribePositionsParams, SubscribePricesParams, ToggleTestnetResult, UpdateMarginParams, UpdatePositionTPSLParams, UserHistoryItem, WithdrawParams, WithdrawResult } from "../types/index.cjs";
import type { LighterAuthConfig, LighterSignerBridge, LighterWebSocketCtor } from "../types/lighter-types.cjs";
/**
 * Identity of the position the journalled protection belonged to. A
 * delayed restore must never attach old triggers to a DIFFERENT
 * lifecycle (original closed, new same-symbol position opened).
 */
/**
 * Durable nonce dispatch ledger document. Entries carry the OPERATION
 * kind (tx type) and a human-readable intent so a dispatch whose
 * response was lost but which is later PROVEN consumed can be surfaced
 * as a recovered outcome — blocking blind retries of financial
 * operations until explicitly acknowledged.
 */
type LighterRecoveredDispatch = {
    /** Stable identity for selective acknowledgment. */
    recoveryId: string;
    kind: number;
    intent: string;
    txHash: string | null;
    /**
     * Authoritative outcome: 'succeeded' (exact-hash lookup, venue status
     * executed), 'failed' (exact-hash lookup, venue status failed/rejected
     * — retry-safe, non-blocking), 'unknown' (only the nonce advance is
     * proven, e.g. another device moved the nonce; the intent's own fate
     * is NOT known and must never be reported as completed).
     */
    outcome: 'succeeded' | 'failed' | 'unknown';
    /** What proved the outcome (e.g. 'tx-status:3', 'rest-advance'). */
    evidence: string;
};
/**
 * Lighter provider implementation (POC).
 */
export declare class LighterProvider implements PerpsProvider {
    #private;
    readonly protocolId = "lighter";
    constructor(options: {
        isTestnet?: boolean;
        platformDependencies: PerpsPlatformDependencies;
        messenger?: PerpsControllerMessenger;
        lighterAuthConfig?: LighterAuthConfig;
        signerBridge?: LighterSignerBridge;
        webSocketCtor?: LighterWebSocketCtor | null;
    });
    initialize(): Promise<InitializeResult>;
    disconnect(): Promise<DisconnectResult>;
    ping(_timeoutMs?: number): Promise<void>;
    toggleTestnet(): Promise<ToggleTestnetResult>;
    isReadyToTrade(): Promise<ReadyToTradeResult>;
    /**
     * List TP/SL obligations parked in DURABLE manual-recovery state: the
     * venue removed (or rejected) protection in a way that cannot be
     * safely re-established automatically. Surfaced to callers/UI; each
     * entry resolves when the user issues a new explicit TP/SL update for
     * the symbol.
     *
     * @returns Parked manual-recovery entries.
     */
    getPendingManualRecoveries(): Promise<{
        symbol: string;
        settlementKey: string;
        recordedAt: number;
        reason: string;
        priorIntent: 'replace' | 'remove';
        survivingOrderIds: string[];
        actionNeeded: string;
    }[]>;
    /**
     * READ-ONLY view of the durable recovered-dispatch outcomes
     * (previously ambiguous submissions later resolved). Never mutates the
     * ledger — acknowledgment is a separate, per-outcome call so a crash
     * between reading and acting can never silently drop an outcome.
     *
     * @returns The pending recovered-dispatch outcomes.
     */
    getRecoveredDispatches(): Promise<LighterRecoveredDispatch[]>;
    /**
     * Acknowledge ONE recovered-dispatch outcome by its stable id, after
     * the caller has refreshed venue state and decided how to proceed.
     * Runs under the ledger mutex and re-verifies the session generation
     * inside it so an account switch mid-acknowledge can never clear
     * another account's outcome.
     *
     * @param recoveryId - Stable id from {@link getRecoveredDispatches}.
     */
    acknowledgeRecoveredDispatch(recoveryId: string): Promise<void>;
    getMarkets(_params?: GetMarketsParams): Promise<MarketInfo[]>;
    getMarketDataWithPrices(): Promise<PerpsMarketData[]>;
    getPositions(_params?: GetPositionsParams): Promise<Position[]>;
    getAccountState(_params?: GetAccountStateParams): Promise<AccountState>;
    getOpenOrders(_params?: GetOrdersParams): Promise<Order[]>;
    getOrders(params?: GetOrdersParams, _options?: PerpsReadOptions): Promise<Order[]>;
    getCurrentAccountId(): Promise<CaipAccountId>;
    placeOrder(params: OrderParams, inheritedGeneration?: number): Promise<OrderResult>;
    cancelOrder(params: CancelOrderParams, inheritedGeneration?: number): Promise<CancelOrderResult>;
    editOrder(_params: EditOrderParams): Promise<OrderResult>;
    closePosition(params: ClosePositionParams): Promise<OrderResult>;
    updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
    updateMargin(params: UpdateMarginParams): Promise<MarginResult>;
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    getOrderFills(params?: GetOrderFillsParams, _options?: PerpsReadOptions): Promise<OrderFill[]>;
    getOrFetchFills(params?: GetOrFetchFillsParams): Promise<OrderFill[]>;
    getHistoricalPortfolio(_params?: GetHistoricalPortfolioParams): Promise<HistoricalPortfolioResult>;
    getFunding(_params?: GetFundingParams, _options?: PerpsReadOptions): Promise<Funding[]>;
    getUserNonFundingLedgerUpdates(params?: {
        accountId?: string;
        startTime?: number;
        endTime?: number;
    }): Promise<RawLedgerUpdate[]>;
    getUserHistory(params?: {
        accountId?: CaipAccountId;
        startTime?: number;
        endTime?: number;
    }): Promise<UserHistoryItem[]>;
    validateDeposit(_params: DepositParams): Promise<{
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
    calculateLiquidationPrice(_params: LiquidationPriceParams): Promise<string>;
    calculateMaintenanceMargin(params: MaintenanceMarginParams): Promise<number>;
    getMaxLeverage(asset: string): Promise<number>;
    calculateFees(params: FeeCalculationParams): Promise<FeeCalculationResult>;
    subscribeToPrices(params: SubscribePricesParams): () => void;
    subscribeToOICaps(params: SubscribeOICapsParams): () => void;
    subscribeToAccount(params: SubscribeAccountParams): () => void;
    subscribeToPositions(params: SubscribePositionsParams): () => void;
    subscribeToOrders(params: SubscribeOrdersParams): () => void;
    subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;
    subscribeToCandles(params: SubscribeCandlesParams): () => void;
    readonly fetchHistoricalCandles: (options: {
        symbol: string;
        interval: CandlePeriod;
        limit?: number;
        endTime?: number;
    }) => Promise<CandleData>;
    subscribeToOrderBook(params: SubscribeOrderBookParams): () => void;
    setLiveDataConfig(_config: Partial<LiveDataConfig>): void;
    getWebSocketConnectionState(): WebSocketConnectionState;
    subscribeToConnectionState(listener: (state: WebSocketConnectionState, reconnectionAttempt: number) => void): () => void;
    reconnect(): Promise<void>;
    getDepositRoutes(_params?: GetSupportedPathsParams): AssetRoute[];
    getWithdrawalRoutes(_params?: GetSupportedPathsParams): AssetRoute[];
    getBlockExplorerUrl(address?: string): string;
}
export {};
//# sourceMappingURL=LighterProvider.d.cts.map