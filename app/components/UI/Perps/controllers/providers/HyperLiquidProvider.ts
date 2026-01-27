import { CaipAccountId, type Hex } from '@metamask/utils';
import { createStandaloneInfoClient } from '../../utils/standaloneInfoClient';
import { v4 as uuidv4 } from 'uuid';
import { ensureError } from '../../../../../util/errorUtils';
import {
  BASIS_POINTS_DIVISOR,
  BUILDER_FEE_CONFIG,
  FEE_RATES,
  getBridgeInfo,
  getChainId,
  HIP3_ASSET_MARKET_TYPES,
  HIP3_FEE_CONFIG,
  HIP3_MARGIN_CONFIG,
  HYPERLIQUID_WITHDRAWAL_MINUTES,
  REFERRAL_CONFIG,
  TESTNET_HIP3_CONFIG,
  TRADING_DEFAULTS,
  USDC_DECIMALS,
  USDH_CONFIG,
} from '../../constants/hyperLiquidConfig';
import {
  ORDER_SLIPPAGE_CONFIG,
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  TP_SL_CONFIG,
  WITHDRAWAL_CONSTANTS,
} from '../../constants/perpsConfig';
import { PERPS_TRANSACTIONS_HISTORY_CONSTANTS } from '../../constants/transactionsHistoryConfig';
import {
  HyperLiquidClientService,
  WebSocketConnectionState,
} from '../../services/HyperLiquidClientService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import {
  adaptAccountStateFromSDK,
  adaptHyperLiquidLedgerUpdateToUserHistoryItem,
  adaptMarketFromSDK,
  adaptOrderFromSDK,
  adaptPositionFromSDK,
  buildAssetMapping,
  formatHyperLiquidPrice,
  formatHyperLiquidSize,
  parseAssetName,
  type RawHyperLiquidLedgerUpdate,
} from '../../utils/hyperLiquidAdapter';
import {
  buildOrdersArray,
  calculateFinalPositionSize,
  calculateOrderPriceAndSize,
} from '../../utils/orderCalculations';
import {
  compileMarketPattern,
  shouldIncludeMarket,
  type CompiledMarketPattern,
} from '../../utils/marketUtils';
import type {
  SDKOrderParams,
  MetaResponse,
  PerpsAssetCtx,
  FrontendOrder,
} from '../../types/hyperliquid-types';
import {
  createErrorResult,
  getMaxOrderValue,
  getSupportedPaths,
  validateAssetSupport,
  validateBalance,
  validateCoinExists,
  validateDepositParams,
  validateOrderParams,
  validateWithdrawalParams,
} from '../../utils/hyperLiquidValidation';
import { transformMarketData } from '../../utils/marketDataTransform';
import type {
  AccountState,
  AssetRoute,
  BatchCancelOrdersParams,
  CancelOrderParams,
  CancelOrderResult,
  CancelOrdersResult,
  ClosePositionParams,
  ClosePositionsParams,
  ClosePositionsResult,
  DepositParams,
  DisconnectResult,
  EditOrderParams,
  FeeCalculationParams,
  FeeCalculationResult,
  Funding,
  GetAccountStateParams,
  GetAvailableDexsParams,
  GetFundingParams,
  GetHistoricalPortfolioParams,
  GetMarketsParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  HistoricalPortfolioResult,
  InitializeResult,
  PerpsPlatformDependencies,
  PerpsProvider,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarginResult,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsMarketData,
  Position,
  ReadyToTradeResult,
  SubscribeAccountParams,
  SubscribeCandlesParams,
  SubscribeOICapsParams,
  SubscribeOrderBookParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  ToggleTestnetResult,
  TransferBetweenDexsParams,
  TransferBetweenDexsResult,
  UpdatePositionTPSLParams,
  UserHistoryItem,
  WithdrawParams,
  WithdrawResult,
} from '../types';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import type {
  ExtendedAssetMeta,
  ExtendedPerpDex,
} from '../../types/perps-types';
import { getStreamManagerInstance } from '../../providers/PerpsStreamManager';

/**
 * Type guard to check if a status is an object (not a string literal like "waitingForFill")
 * The SDK returns status as a union of object types and string literals.
 */
const isStatusObject = (status: unknown): status is Record<string, unknown> =>
  typeof status === 'object' && status !== null;

// Helper method parameter interfaces (module-level for class-dependent methods only)
interface GetAssetInfoParams {
  symbol: string;
  dexName: string | null;
}

interface GetAssetInfoResult {
  assetInfo: {
    name: string;
    szDecimals: number;
    maxLeverage: number;
  };
  currentPrice: number;
  meta: MetaResponse;
}

interface PrepareAssetForTradingParams {
  symbol: string;
  assetId: number;
  leverage?: number;
}

interface HandleHip3PreOrderParams {
  dexName: string;
  symbol: string;
  orderPrice: number;
  positionSize: number;
  leverage: number;
  isBuy: boolean;
  maxLeverage: number;
}

interface HandleHip3PreOrderResult {
  transferInfo: { amount: number; sourceDex: string } | null;
}

interface SubmitOrderWithRollbackParams {
  orders: SDKOrderParams[];
  grouping: 'na' | 'normalTpsl' | 'positionTpsl';
  isHip3Order: boolean;
  dexName: string | null;
  transferInfo: { amount: number; sourceDex: string } | null;
  symbol: string;
  assetId: number;
}

interface HandleOrderErrorParams {
  error: unknown;
  symbol: string;
  orderType: 'market' | 'limit';
  isBuy: boolean;
}

/**
 * HyperLiquid provider implementation
 *
 * Implements the PerpsProvider interface for HyperLiquid protocol.
 * Uses the @nktkas/hyperliquid SDK for all operations.
 * Delegates to service classes for client management, wallet integration, and subscriptions.
 *
 * HIP-3 Balance Management:
 * Attempts to use HyperLiquid's native DEX abstraction for automatic collateral transfers.
 * If not supported, falls back to programmatic balance management using SDK's sendAsset.
 */
export class HyperLiquidProvider implements PerpsProvider {
  readonly protocolId = 'hyperliquid';

  // Platform dependencies for logging and debugging
  private readonly deps: PerpsPlatformDependencies;

  // Service instances
  private clientService: HyperLiquidClientService;
  private walletService: HyperLiquidWalletService;
  private subscriptionService: HyperLiquidSubscriptionService;

  // Asset mapping
  private symbolToAssetId = new Map<string, number>();

  // Cache for user fee rates to avoid excessive API calls
  private userFeeCache = new Map<
    string,
    {
      perpsTakerRate: number;
      perpsMakerRate: number;
      spotTakerRate: number;
      spotMakerRate: number;
      timestamp: number;
      ttl: number;
    }
  >();

  // Cache for max leverage values to avoid excessive API calls
  private maxLeverageCache = new Map<
    string,
    { value: number; timestamp: number }
  >();

  // Cache for raw meta responses (shared across methods to avoid redundant API calls)
  // Filtering is applied on-demand (cheap array operations) - no need for separate processed cache
  private cachedMetaByDex = new Map<string, MetaResponse>();

  // Cache for perpDexs data (deployerFeeScale for dynamic fee calculation)
  // TTL-based cache - fee scales rarely change
  private perpDexsCache: {
    data: ExtendedPerpDex[] | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  // Session cache for referral state (cleared on disconnect/reconnect)
  // Key: `network:userAddress`, Value: true if referral is set
  private referralCheckCache = new Map<string, boolean>();

  // Session cache for builder fee approval state (cleared on disconnect/reconnect)
  // Key: `network:userAddress`, Value: true if builder fee is approved
  private builderFeeCheckCache = new Map<string, boolean>();

  // Pending promise trackers for deduplicating concurrent calls
  // Prevents multiple signature requests when methods called simultaneously
  private ensureReadyPromise: Promise<void> | null = null;
  private pendingBuilderFeeApprovals = new Map<string, Promise<void>>();

  // Pre-compiled patterns for fast filtering
  private compiledAllowlistPatterns: CompiledMarketPattern[] = [];
  private compiledBlocklistPatterns: CompiledMarketPattern[] = [];

  // Fee discount context for MetaMask reward discounts (in basis points)
  private userFeeDiscountBips?: number;

  // Feature flag configuration for HIP-3 market filtering
  private hip3Enabled: boolean;
  private allowlistMarkets: string[];
  private blocklistMarkets: string[];
  private useDexAbstraction: boolean;

  // Cache for validated DEXs to avoid redundant perpDexs() API calls
  private cachedValidatedDexs: (string | null)[] | null = null;
  private cachedAllPerpDexs: Awaited<
    ReturnType<ReturnType<typeof this.clientService.getInfoClient>['perpDexs']>
  > | null = null;
  // Pending promise to deduplicate concurrent getValidatedDexs() calls
  private pendingValidatedDexsPromise: Promise<(string | null)[]> | null = null;

  // Cache for USDC token ID from spot metadata
  private cachedUsdcTokenId?: string;

  // Error mappings from HyperLiquid API errors to standardized PERPS_ERROR_CODES
  private readonly ERROR_MAPPINGS = {
    'isolated position does not have sufficient margin available to decrease leverage':
      PERPS_ERROR_CODES.ORDER_LEVERAGE_REDUCTION_FAILED,
    'could not immediately match': PERPS_ERROR_CODES.IOC_CANCEL,
  };

  // Track whether clients have been initialized (lazy initialization)
  private clientsInitialized = false;

  // Promise-based lock to prevent race conditions in concurrent initialization
  private initializationPromise: Promise<void> | null = null;

  constructor(options: {
    isTestnet?: boolean;
    hip3Enabled?: boolean;
    allowlistMarkets?: string[];
    blocklistMarkets?: string[];
    useDexAbstraction?: boolean;
    platformDependencies: PerpsPlatformDependencies;
  }) {
    this.deps = options.platformDependencies;
    const isTestnet = options.isTestnet || false;

    // Dev-friendly defaults: Enable all markets by default for easier testing (discovery mode)
    this.hip3Enabled = options.hip3Enabled ?? __DEV__;
    this.allowlistMarkets = options.allowlistMarkets ?? [];
    this.blocklistMarkets = options.blocklistMarkets ?? [];

    // Attempt native balance abstraction, fallback to programmatic transfer if unsupported
    this.useDexAbstraction = options.useDexAbstraction ?? true;

    // Initialize services with injected platform dependencies
    this.clientService = new HyperLiquidClientService(this.deps, { isTestnet });
    this.walletService = new HyperLiquidWalletService(this.deps, { isTestnet });
    this.subscriptionService = new HyperLiquidSubscriptionService(
      this.clientService,
      this.walletService,
      this.deps,
      this.hip3Enabled,
      [], // enabledDexs - will be populated after DEX discovery in buildAssetMapping
      this.allowlistMarkets,
      this.blocklistMarkets,
    );

    // NOTE: Clients are NOT initialized here - they'll be initialized lazily
    // when first needed. This avoids accessing Engine.context before it's ready.

    // Pre-compile filter patterns for performance
    this.compiledAllowlistPatterns = this.allowlistMarkets.map((pattern) => ({
      pattern,
      matcher: compileMarketPattern(pattern),
    }));
    this.compiledBlocklistPatterns = this.blocklistMarkets.map((pattern) => ({
      pattern,
      matcher: compileMarketPattern(pattern),
    }));

    // Debug: Confirm batch methods exist and show HIP-3 config
    this.deps.debugLogger.log('[HyperLiquidProvider] Constructor complete', {
      hasBatchCancel: typeof this.cancelOrders === 'function',
      hasBatchClose: typeof this.closePositions === 'function',
      protocolId: this.protocolId,
      hip3Enabled: this.hip3Enabled,
      allowlistMarkets: this.allowlistMarkets,
      blocklistMarkets: this.blocklistMarkets,
      isTestnet,
    });
  }

  /**
   * Initialize HyperLiquid SDK clients (lazy initialization)
   *
   * This is called on first API operation to ensure Engine.context is ready.
   * Creating the wallet adapter requires accessing Engine.context.AccountTreeController,
   * which may not be available during early app initialization.
   *
   * IMPORTANT: This method awaits the WebSocket transport.ready() to ensure
   * the connection is fully established before marking initialization complete.
   */
  private async ensureClientsInitialized(): Promise<void> {
    if (this.clientsInitialized) {
      return; // Already initialized
    }

    // Reuse existing initialization promise if one is in progress
    // This prevents race conditions when multiple methods call concurrently
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create and cache the initialization promise
    this.initializationPromise = (async () => {
      // Double-check after acquiring the "lock"
      if (this.clientsInitialized) {
        return;
      }

      const wallet = this.walletService.createWalletAdapter();
      await this.clientService.initialize(wallet);

      // Set termination callback for logging when WebSocket terminates
      // Note: Do NOT restore subscriptions here - termination means connection failed permanently
      this.clientService.setOnTerminateCallback((error: Error) => {
        this.deps.debugLogger.log(
          '[HyperLiquidProvider] WebSocket terminated',
          {
            error: error.message,
          },
        );
      });

      // Set reconnection callback to restore subscriptions after successful reconnection
      // This is called in handleConnectionDrop() after the WebSocket reconnects successfully
      this.clientService.setOnReconnectCallback(async () => {
        try {
          this.deps.debugLogger.log(
            '[HyperLiquidProvider] WebSocket reconnected, restoring subscriptions',
          );
          await this.subscriptionService.restoreSubscriptions();
          const streamManager = getStreamManagerInstance();
          streamManager.clearAllChannels();
        } catch (restoreError) {
          this.deps.debugLogger.log(
            '[HyperLiquidProvider] Failed to restore subscriptions',
            restoreError,
          );
        }
      });

      // Only set flag AFTER successful initialization
      this.clientsInitialized = true;

      this.deps.debugLogger.log(
        '[HyperLiquidProvider] Clients initialized lazily',
      );
    })();

    try {
      await this.initializationPromise;
    } finally {
      // Clear promise after completion (success or failure)
      // so future calls can retry if needed
      this.initializationPromise = null;
    }
  }

  /**
   * Attempt to enable HIP-3 native balance abstraction
   *
   * If successful, HyperLiquid automatically manages collateral transfers for HIP-3 orders.
   * If not supported, disables the flag to trigger programmatic transfer fallback.
   *
   * @private
   */
  private async ensureDexAbstractionEnabled(): Promise<void> {
    if (!this.useDexAbstraction) {
      return; // Feature disabled
    }

    try {
      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault();

      // Check if already enabled (returns boolean | null)
      const isEnabled = await infoClient.userDexAbstraction({
        user: userAddress,
      });

      if (isEnabled === true) {
        this.deps.debugLogger.log(
          'HyperLiquidProvider: DEX abstraction already enabled',
          {
            user: userAddress,
          },
        );
        return;
      }

      // Enable DEX abstraction (one-time, irreversible)
      this.deps.debugLogger.log(
        'HyperLiquidProvider: Enabling DEX abstraction',
        {
          user: userAddress,
          note: 'HyperLiquid will auto-manage collateral for HIP-3 orders',
        },
      );

      const exchangeClient = this.clientService.getExchangeClient();
      await exchangeClient.agentEnableDexAbstraction();

      this.deps.debugLogger.log(
        '✅ HyperLiquidProvider: DEX abstraction enabled successfully',
      );
    } catch (error) {
      // Don't blindly disable the flag on any error
      // Network errors or unknown issues shouldn't trigger fallback to manual transfer
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('ensureDexAbstractionEnabled', {
          note: 'Could not enable DEX abstraction (may already be enabled or network error), will verify on first order',
        }),
      );
      // Keep useDexAbstraction flag as-is, let placeOrder() verify actual status if needed
    }
  }

  /**
   * Ensure clients are initialized and asset mapping is loaded
   * Asset mapping is built once on first call and reused for the provider's lifetime
   * since HIP-3 configuration is immutable after construction
   */
  private async ensureReady(): Promise<void> {
    // If already initializing or completed, wait for/return that promise
    // This prevents duplicate initialization flows when multiple methods called concurrently
    if (this.ensureReadyPromise) {
      this.deps.debugLogger.log(
        '[ensureReady] Reusing existing initialization promise',
      );
      return this.ensureReadyPromise;
    }

    this.deps.debugLogger.log('[ensureReady] Starting new initialization');

    // Create and track initialization promise
    this.ensureReadyPromise = (async () => {
      // Lazy initialization: ensure clients are created (safe after Engine.context is ready)
      // This awaits WebSocket transport.ready() to ensure connection is established
      await this.ensureClientsInitialized();

      // Verify clients are properly initialized
      this.clientService.ensureInitialized();

      // Build asset mapping on first call only (flags are immutable)
      if (this.symbolToAssetId.size === 0) {
        this.deps.debugLogger.log(
          'HyperLiquidProvider: Building asset mapping',
          {
            hip3Enabled: this.hip3Enabled,
            allowlistMarkets: this.allowlistMarkets,
            blocklistMarkets: this.blocklistMarkets,
          },
        );
        await this.buildAssetMapping();
      }

      // Attempt to enable native balance abstraction
      await this.ensureDexAbstractionEnabled();

      // Set up builder fee approval (non-blocking for viewing data)
      // This happens once per session and is cached until disconnect/reconnect
      // Note: Wrapped in try-catch so accounts without deposits can still view markets
      try {
        await this.ensureBuilderFeeApproval();
      } catch (error) {
        // Log but don't throw - builder fee is only needed for trading, not viewing
        this.deps.debugLogger.log(
          'HyperLiquidProvider: Builder fee approval failed (will retry on first trade)',
          error,
        );
      }

      // Set up referral code (blocks initialization to ensure attribution attempt)
      // Non-throwing: errors caught internally, logged to Sentry, retry next session
      // User can trade immediately after init even if referral setup failed
      await this.ensureReferralSet();
    })();

    // Await initialization - keep the promise so subsequent calls resolve immediately
    // The promise is only reset in disconnect() for clean reconnection
    await this.ensureReadyPromise;
    this.deps.debugLogger.log('[ensureReady] Initialization complete');
  }

  /**
   * Get all available DEXs without allowlist filtering
   * Used when skipFilters=true in getMarkets()
   * @returns Array of all DEX names (null for main DEX, strings for HIP-3 DEXs)
   */
  private async getAllAvailableDexs(): Promise<(string | null)[]> {
    // If already cached by getValidatedDexs, use that
    if (
      this.cachedAllPerpDexs !== null &&
      Array.isArray(this.cachedAllPerpDexs)
    ) {
      const availableHip3Dexs: string[] = [];
      this.cachedAllPerpDexs.forEach((dex) => {
        if (dex !== null) {
          availableHip3Dexs.push(dex.name);
        }
      });
      return [null, ...availableHip3Dexs];
    }

    // Fetch fresh from API
    const infoClient = this.clientService.getInfoClient();
    try {
      const allDexs = await infoClient.perpDexs();
      if (!allDexs || !Array.isArray(allDexs)) {
        return [null]; // Fallback to main DEX only
      }

      this.cachedAllPerpDexs = allDexs;
      const availableHip3Dexs: string[] = [];
      allDexs.forEach((dex) => {
        if (dex !== null) {
          availableHip3Dexs.push(dex.name);
        }
      });
      return [null, ...availableHip3Dexs];
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getAllAvailableDexs'),
      );
      return [null]; // Fallback to main DEX only
    }
  }

  /**
   * Get validated list of DEXs to use based on feature flags and allowlist
   * Implements Step 3b from HIP-3-IMPLEMENTATION.md (lines 108-134)
   *
   * Logic Flow:
   * 1. If hip3Enabled === false → Return [null] (main DEX only)
   * 2. Fetch available DEXs via SDK: infoClient.perpDexs()
   * 3. If enabledDexs is empty [] → Return [null, ...allDiscoveredDexs] (auto-discover)
   * 4. Else filter enabledDexs against available DEXs → Return [null, ...validatedDexs] (allowlist)
   *
   * Invalid DEX names are silently filtered with debugLogger warning.
   *
   * @returns Array of DEX names to use (null = main DEX, strings = HIP-3 DEXs)
   */
  private async getValidatedDexs(): Promise<(string | null)[]> {
    // Return cached result if available
    if (this.cachedValidatedDexs !== null) {
      return this.cachedValidatedDexs;
    }

    // If a fetch is already in progress, reuse the pending promise
    // This prevents duplicate perpDexs() API calls from concurrent callers
    if (this.pendingValidatedDexsPromise !== null) {
      this.deps.debugLogger.log(
        '[getValidatedDexs] Reusing pending promise for perpDexs fetch',
      );
      return this.pendingValidatedDexsPromise;
    }

    // Create and cache the pending promise for deduplication
    this.pendingValidatedDexsPromise = this.fetchValidatedDexsInternal();

    try {
      const result = await this.pendingValidatedDexsPromise;
      return result;
    } finally {
      // Clear the pending promise when done (success or error)
      this.pendingValidatedDexsPromise = null;
    }
  }

  /**
   * Internal method that performs the actual perpDexs fetch and caching
   * Separated from getValidatedDexs to enable promise deduplication
   */
  private async fetchValidatedDexsInternal(): Promise<(string | null)[]> {
    // Kill switch: HIP-3 disabled, return main DEX only
    if (!this.hip3Enabled) {
      this.deps.debugLogger.log(
        'HyperLiquidProvider: HIP-3 disabled via hip3Enabled flag',
      );
      this.cachedAllPerpDexs = [null];
      this.cachedValidatedDexs = [null];
      return this.cachedValidatedDexs;
    }

    // Fetch all available DEXs from HyperLiquid
    const infoClient = this.clientService.getInfoClient();
    let allDexs;
    try {
      allDexs = await infoClient.perpDexs();
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getValidatedDexs.perpDexs'),
      );
      this.cachedAllPerpDexs = [null];
      this.cachedValidatedDexs = [null];
      return this.cachedValidatedDexs;
    }

    // Cache for buildAssetMapping() to avoid duplicate call
    this.cachedAllPerpDexs = allDexs;

    // Validate API response
    if (!allDexs || !Array.isArray(allDexs)) {
      this.deps.debugLogger.log(
        'HyperLiquidProvider: Failed to fetch DEX list (invalid response), falling back to main DEX only',
        { allDexs },
      );
      this.cachedAllPerpDexs = [null];
      this.cachedValidatedDexs = [null];
      return this.cachedValidatedDexs;
    }

    // Extract HIP-3 DEX names (filter out null which represents main DEX)
    const availableHip3Dexs: string[] = [];
    allDexs.forEach((dex) => {
      if (dex !== null) {
        availableHip3Dexs.push(dex.name);
      }
    });

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Available DEXs (market filtering applied at data layer)',
      {
        count: availableHip3Dexs.length,
        dexNames: availableHip3Dexs,
      },
    );

    // Testnet-specific filtering: Limit DEXs to avoid subscription overload
    // On testnet, there are many HIP-3 DEXs (test deployments) that cause instability
    if (this.clientService.isTestnetMode()) {
      const { EnabledDexs, AutoDiscoverAll } = TESTNET_HIP3_CONFIG;

      if (!AutoDiscoverAll) {
        if (EnabledDexs.length === 0) {
          // Main DEX only - no HIP-3 DEXs on testnet
          this.deps.debugLogger.log(
            'HyperLiquidProvider: Testnet - using main DEX only (HIP-3 DEXs filtered)',
            {
              availableHip3Dexs: availableHip3Dexs.length,
              reason: 'TESTNET_HIP3_CONFIG.EnabledDexs is empty',
            },
          );
          this.cachedValidatedDexs = [null];
          return this.cachedValidatedDexs;
        }

        // Filter to specific allowed DEXs on testnet
        const filteredDexs = availableHip3Dexs.filter((dex) =>
          EnabledDexs.includes(dex),
        );
        this.deps.debugLogger.log(
          'HyperLiquidProvider: Testnet - filtered to allowed DEXs',
          {
            allowedDexs: EnabledDexs,
            filteredDexs,
            availableHip3Dexs: availableHip3Dexs.length,
          },
        );
        this.cachedValidatedDexs = [null, ...filteredDexs];
        return this.cachedValidatedDexs;
      }

      // AUTO_DISCOVER_ALL is true - proceed with all DEXs (not recommended for testnet)
      this.deps.debugLogger.log(
        'HyperLiquidProvider: Testnet - AUTO_DISCOVER_ALL enabled, using all DEXs',
        { totalDexCount: availableHip3Dexs.length + 1 },
      );
    }

    // Mainnet (or testnet with AUTO_DISCOVER_ALL): Return all DEXs
    // Market filtering is applied at subscription data layer
    this.deps.debugLogger.log(
      'HyperLiquidProvider: All DEXs enabled (market filtering at data layer)',
      {
        mainDex: true,
        hip3Dexs: availableHip3Dexs,
        totalDexCount: availableHip3Dexs.length + 1,
      },
    );
    this.cachedValidatedDexs = [null, ...availableHip3Dexs];
    return this.cachedValidatedDexs;
  }

  /**
   * Get cached meta response for a DEX, fetching from API if not cached
   * This helper consolidates cache logic to avoid redundant API calls across the provider
   * @param params.dexName - DEX name (null for main DEX)
   * @param params.skipCache - If true, bypass cache and fetch fresh data
   * @returns MetaResponse with universe data
   * @throws Error if API returns invalid data
   */
  private async getCachedMeta(params: {
    dexName: string | null;
    skipCache?: boolean;
  }): Promise<MetaResponse> {
    const { dexName, skipCache } = params;
    // Use empty string for main DEX key (consistent with buildAssetMapping cache population)
    const dexKey = dexName ?? '';
    const dexDisplayName = dexKey || 'main';

    // Skip cache if requested (forces fresh fetch)
    if (!skipCache) {
      const cached = this.cachedMetaByDex.get(dexKey);
      if (cached) {
        this.deps.debugLogger.log(
          '[getCachedMeta] Using cached meta response',
          {
            dex: dexDisplayName,
            universeSize: cached.universe.length,
          },
        );
        return cached;
      }
    }

    // Cache miss or skipCache=true - fetch from API
    const infoClient = this.clientService.getInfoClient();
    const meta = await infoClient.meta({ dex: dexKey });

    // Defensive validation before caching
    if (!meta?.universe || !Array.isArray(meta.universe)) {
      throw new Error(
        `[HyperLiquidProvider] Invalid meta response for DEX ${dexDisplayName}: universe is ${meta?.universe ? 'not an array' : 'missing'}`,
      );
    }

    // Store raw meta response for reuse
    this.cachedMetaByDex.set(dexKey, meta);

    this.deps.debugLogger.log(
      '[getCachedMeta] Fetched and cached meta response',
      {
        dex: dexDisplayName,
        universeSize: meta.universe.length,
        skipCache,
      },
    );

    return meta;
  }

  /**
   * Fetch perpDexs data with TTL-based caching
   * Returns deployerFeeScale info needed for dynamic fee calculation
   * @returns Array of ExtendedPerpDex objects (null entries represent main DEX)
   */
  private async getCachedPerpDexs(): Promise<ExtendedPerpDex[]> {
    const now = Date.now();

    // Return cached data if still valid
    if (
      this.perpDexsCache.data &&
      now - this.perpDexsCache.timestamp < HIP3_FEE_CONFIG.PerpDexsCacheTtlMs
    ) {
      this.deps.debugLogger.log(
        '[getCachedPerpDexs] Using cached perpDexs data',
        {
          age: `${Math.round((now - this.perpDexsCache.timestamp) / 1000)}s`,
          count: this.perpDexsCache.data.length,
        },
      );
      return this.perpDexsCache.data;
    }

    // Fetch fresh data from API
    // Note: SDK types are incomplete, but API returns deployerFeeScale
    await this.ensureClientsInitialized();
    const infoClient = this.clientService.getInfoClient();
    const perpDexs =
      (await infoClient.perpDexs()) as unknown as ExtendedPerpDex[];

    // Cache the result
    this.perpDexsCache = { data: perpDexs, timestamp: now };

    this.deps.debugLogger.log(
      '[getCachedPerpDexs] Fetched and cached perpDexs data',
      {
        count: perpDexs.length,
        dexes: perpDexs
          .filter((d) => d !== null)
          .map((d) => ({
            name: d.name,
            deployerFeeScale: d.deployerFeeScale,
          })),
      },
    );

    return perpDexs;
  }

  /**
   * Calculate HIP-3 fee multiplier using HyperLiquid's official formula
   * Fetches deployerFeeScale from perpDexs API and growthMode from meta API
   *
   * Formula from HyperLiquid docs:
   * - scaleIfHip3 = deployerFeeScale < 1 ? deployerFeeScale + 1 : deployerFeeScale * 2
   * - growthModeScale = growthMode ? 0.1 : 1
   * - finalMultiplier = scaleIfHip3 * growthModeScale
   *
   * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
   */
  private async calculateHip3FeeMultiplier(params: {
    dexName: string;
    assetSymbol: string;
  }): Promise<number> {
    const { dexName, assetSymbol } = params;

    try {
      // Get deployerFeeScale from perpDexs
      const perpDexs = await this.getCachedPerpDexs();
      const dexInfo = perpDexs.find((d) => d?.name === dexName);
      const parsedScale = parseFloat(dexInfo?.deployerFeeScale ?? '');
      const deployerFeeScale = Number.isNaN(parsedScale)
        ? HIP3_FEE_CONFIG.DefaultDeployerFeeScale
        : parsedScale;

      // Get growthMode from meta for this specific asset
      const meta = await this.getCachedMeta({ dexName });
      const fullAssetName = `${dexName}:${assetSymbol}`;
      const assetMeta = meta.universe.find(
        (u) => (u as ExtendedAssetMeta).name === fullAssetName,
      ) as ExtendedAssetMeta | undefined;
      const isGrowthMode = assetMeta?.growthMode === 'enabled';

      // Apply official formula
      const scaleIfHip3 =
        deployerFeeScale < 1 ? deployerFeeScale + 1 : deployerFeeScale * 2;
      const growthModeScale = isGrowthMode
        ? HIP3_FEE_CONFIG.GrowthModeScale
        : 1;

      const finalMultiplier = scaleIfHip3 * growthModeScale;

      this.deps.debugLogger.log('HIP-3 Dynamic Fee Calculation', {
        dexName,
        assetSymbol,
        fullAssetName,
        deployerFeeScale,
        isGrowthMode,
        scaleIfHip3,
        growthModeScale,
        finalMultiplier,
      });

      return finalMultiplier;
    } catch (error) {
      this.deps.debugLogger.log(
        'HIP-3 Fee Calculation Failed, using fallback',
        {
          dexName,
          assetSymbol,
          error: ensureError(error).message,
        },
      );
      // Safe fallback: standard HIP-3 2x multiplier (no Growth Mode discount)
      return HIP3_FEE_CONFIG.DefaultDeployerFeeScale * 2;
    }
  }

  /**
   * Generate session cache key for user-specific caches
   * Format: "network:userAddress" (address normalized to lowercase)
   * @param network - 'mainnet' or 'testnet'
   * @param userAddress - User's Ethereum address
   * @returns Cache key for session-based caches
   */
  private getCacheKey(network: string, userAddress: string): string {
    return `${network}:${userAddress.toLowerCase()}`;
  }

  /**
   * Fetch markets for a specific DEX with optional filtering
   * Uses session-based caching via getCachedMeta() - no TTL, cleared on disconnect
   * @param params.dex - DEX name (null for main DEX)
   * @param params.skipFilters - If true, skip HIP-3 filtering (return all markets)
   * @param params.skipCache - If true, bypass cache and fetch fresh data
   * @returns Array of MarketInfo objects
   */
  private async fetchMarketsForDex(params: {
    dex: string | null;
    skipFilters?: boolean;
    skipCache?: boolean;
  }): Promise<MarketInfo[]> {
    const { dex, skipFilters = false, skipCache = false } = params;

    // Get raw meta response (uses session cache unless skipCache=true)
    const meta = await this.getCachedMeta({ dexName: dex, skipCache });

    if (!meta.universe || !Array.isArray(meta.universe)) {
      this.deps.debugLogger.log(
        `HyperLiquidProvider: Invalid universe data for DEX ${dex || 'main'}`,
      );
      return [];
    }

    // Transform to MarketInfo format
    const markets = meta.universe.map((asset) => adaptMarketFromSDK(asset));

    // Apply HIP-3 filtering on-demand (cheap array operation)
    // Skip filtering for main DEX (null) or if explicitly requested
    const filteredMarkets =
      skipFilters || dex === null
        ? markets
        : markets.filter((market) =>
            shouldIncludeMarket(
              market.name,
              dex,
              this.hip3Enabled,
              this.compiledAllowlistPatterns,
              this.compiledBlocklistPatterns,
            ),
          );

    this.deps.debugLogger.log('HyperLiquidProvider: Fetched markets for DEX', {
      dex: dex || 'main',
      marketCount: filteredMarkets.length,
      skipFilters,
      skipCache,
    });

    return filteredMarkets;
  }

  /**
   * Get USDC token ID from spot metadata
   * Returns format: "USDC:{hex_token_id}"
   * Caches result to avoid repeated API calls
   */
  private async getUsdcTokenId(): Promise<string> {
    if (this.cachedUsdcTokenId) {
      return this.cachedUsdcTokenId;
    }

    const infoClient = this.clientService.getInfoClient();
    const spotMeta = await infoClient.spotMeta();

    const usdcToken = spotMeta.tokens.find((t) => t.name === 'USDC');
    if (!usdcToken) {
      throw new Error('USDC token not found in spot metadata');
    }

    this.cachedUsdcTokenId = `USDC:${usdcToken.tokenId}`;
    this.deps.debugLogger.log('HyperLiquidProvider: USDC token ID cached', {
      tokenId: this.cachedUsdcTokenId,
    });

    return this.cachedUsdcTokenId;
  }

  /**
   * Check if a HIP-3 DEX uses USDH as collateral (vs USDC)
   * Per HyperLiquid docs: USDH DEXs pull collateral from spot balance automatically
   */
  private async isUsdhCollateralDex(dexName: string): Promise<boolean> {
    const meta = await this.getCachedMeta({ dexName });
    const infoClient = this.clientService.getInfoClient();
    const spotMeta = await infoClient.spotMeta();

    const collateralToken = spotMeta.tokens.find(
      (t: { index: number }) => t.index === meta.collateralToken,
    );

    const isUsdh = collateralToken?.name === USDH_CONFIG.TokenName;

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Checked DEX collateral type',
      {
        dexName,
        collateralTokenIndex: meta.collateralToken,
        collateralTokenName: collateralToken?.name,
        isUsdh,
      },
    );

    return isUsdh;
  }

  /**
   * Get user's USDH balance in spot wallet
   */
  private async getSpotUsdhBalance(): Promise<number> {
    const infoClient = this.clientService.getInfoClient();
    const userAddress = await this.walletService.getUserAddressWithDefault();

    const spotState = await infoClient.spotClearinghouseState({
      user: userAddress,
    });

    const usdhBalance = spotState.balances.find(
      (b: { coin: string }) => b.coin === USDH_CONFIG.TokenName,
    );

    const balance = usdhBalance ? parseFloat(usdhBalance.total) : 0;

    this.deps.debugLogger.log('HyperLiquidProvider: Spot USDH balance', {
      balance,
      userAddress,
    });

    return balance;
  }

  /**
   * Get user's USDC balance in spot wallet
   * Required for USDH DEX orders - need USDC in spot to swap to USDH
   */
  private async getSpotUsdcBalance(): Promise<number> {
    const infoClient = this.clientService.getInfoClient();
    const userAddress = await this.walletService.getUserAddressWithDefault();

    const spotState = await infoClient.spotClearinghouseState({
      user: userAddress,
    });

    const usdcBalance = spotState.balances.find(
      (b: { coin: string }) => b.coin === 'USDC',
    );

    const balance = usdcBalance ? parseFloat(usdcBalance.total) : 0;

    this.deps.debugLogger.log('HyperLiquidProvider: Spot USDC balance', {
      balance,
      userAddress,
    });

    return balance;
  }

  /**
   * Transfer USDC from main perps wallet to spot wallet
   * Required before swapping USDC→USDH for USDH DEX orders
   */
  private async transferUsdcToSpot(
    amount: number,
  ): Promise<{ success: boolean; error?: string }> {
    const exchangeClient = this.clientService.getExchangeClient();
    const userAddress = await this.walletService.getUserAddressWithDefault();

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Transferring USDC to spot',
      {
        amount,
        userAddress,
      },
    );

    try {
      const result = await exchangeClient.sendAsset({
        destination: userAddress,
        sourceDex: '', // Main perps DEX (empty string)
        destinationDex: 'spot',
        token: await this.getUsdcTokenId(),
        amount: amount.toString(),
      });

      if (result.status === 'ok') {
        this.deps.debugLogger.log(
          'HyperLiquidProvider: USDC transferred to spot',
          {
            amount,
          },
        );
        return { success: true };
      }

      return { success: false, error: PERPS_ERROR_CODES.TRANSFER_FAILED };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.deps.debugLogger.log(
        'HyperLiquidProvider: USDC transfer to spot failed',
        {
          error: errorMsg,
        },
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Swap USDC to USDH on spot market
   * Returns the result of the swap including filled size
   */
  private async swapUsdcToUsdh(
    amount: number,
  ): Promise<{ success: boolean; filledSize?: number; error?: string }> {
    const infoClient = this.clientService.getInfoClient();
    const spotMeta = await infoClient.spotMeta();

    // Find USDH and USDC tokens by name
    const usdhToken = spotMeta.tokens.find(
      (t: { name: string }) => t.name === USDH_CONFIG.TokenName,
    );
    const usdcToken = spotMeta.tokens.find(
      (t: { name: string }) => t.name === 'USDC',
    );

    if (!usdhToken || !usdcToken) {
      return {
        success: false,
        error: PERPS_ERROR_CODES.SPOT_PAIR_NOT_FOUND,
      };
    }

    // Find USDH/USDC pair by token indices (NOT by name - name is @230)
    const usdhUsdcPair = spotMeta.universe.find(
      (u: { tokens: number[] }) =>
        u.tokens.includes(usdhToken.index) &&
        u.tokens.includes(usdcToken.index),
    );

    if (!usdhUsdcPair) {
      return { success: false, error: PERPS_ERROR_CODES.SPOT_PAIR_NOT_FOUND };
    }

    const spotAssetId = 10000 + usdhUsdcPair.index;

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Found USDH/USDC spot pair',
      {
        pairIndex: usdhUsdcPair.index,
        pairName: usdhUsdcPair.name,
        spotAssetId,
        usdhTokenIndex: usdhToken.index,
        usdcTokenIndex: usdcToken.index,
      },
    );

    // Get current mid price
    const allMids = await infoClient.allMids();
    const pairKey = `@${usdhUsdcPair.index}`;
    const usdhPrice = parseFloat(allMids[pairKey] || '1');

    if (usdhPrice === 0) {
      return {
        success: false,
        error: PERPS_ERROR_CODES.PRICE_UNAVAILABLE,
      };
    }

    // Calculate order parameters
    // USDH is pegged 1:1 to USDC, add small slippage buffer
    const slippageMultiplier =
      1 + USDH_CONFIG.SwapSlippageBps / BASIS_POINTS_DIVISOR;
    const maxPrice = usdhPrice * slippageMultiplier;

    // Size in USDH = amount / price (since we're buying USDH with USDC)
    let sizeInUsdh = amount / usdhPrice;

    // Format size according to HyperLiquid requirements
    let formattedSize = sizeInUsdh.toFixed(usdhToken.szDecimals);

    // CRITICAL: Ensure USDC cost meets $10 minimum after rounding
    // At price ~0.999995, buying 10.00 USDH costs 9.99995 USDC (under minimum)
    // Bump up by one increment if needed to meet minimum
    const minSpotOrderValue = TRADING_DEFAULTS.amount.mainnet;
    const estimatedCost = parseFloat(formattedSize) * usdhPrice;
    if (estimatedCost < minSpotOrderValue) {
      const increment = Math.pow(10, -usdhToken.szDecimals); // 0.01 for szDecimals=2
      sizeInUsdh = parseFloat(formattedSize) + increment;
      formattedSize = sizeInUsdh.toFixed(usdhToken.szDecimals);
    }

    // Format price according to HyperLiquid requirements
    const formattedPrice = formatHyperLiquidPrice({
      price: maxPrice,
      szDecimals: usdhToken.szDecimals,
    });

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Placing USDC→USDH swap order',
      {
        usdcAmount: amount,
        usdhPrice,
        maxPrice: formattedPrice,
        size: formattedSize,
        szDecimals: usdhToken.szDecimals,
      },
    );

    try {
      const exchangeClient = this.clientService.getExchangeClient();
      const result = await exchangeClient.order({
        orders: [
          {
            a: spotAssetId,
            b: true, // Buy USDH
            p: formattedPrice,
            s: formattedSize,
            r: false, // Not reduce-only
            t: { limit: { tif: 'Ioc' } }, // Immediate-or-cancel
          },
        ],
        grouping: 'na',
      });

      if (result.status !== 'ok') {
        return {
          success: false,
          error: PERPS_ERROR_CODES.SWAP_FAILED,
        };
      }

      // Check order status
      const status = result.response?.data?.statuses?.[0];
      if (isStatusObject(status) && 'error' in status) {
        return { success: false, error: String(status.error) };
      }

      const filledSize =
        isStatusObject(status) && 'filled' in status
          ? parseFloat(status.filled?.totalSz || '0')
          : 0;

      this.deps.debugLogger.log(
        'HyperLiquidProvider: USDC→USDH swap completed',
        {
          success: true,
          filledSize,
          requestedSize: formattedSize,
        },
      );

      return { success: true, filledSize };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.deps.debugLogger.log('HyperLiquidProvider: USDC→USDH swap error', {
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Ensure sufficient USDH collateral in spot for HIP-3 DEX order
   * If user lacks USDH, auto-swap from USDC
   */
  private async ensureUsdhCollateralForOrder(
    dexName: string,
    requiredMargin: number,
  ): Promise<void> {
    const spotUsdhBalance = await this.getSpotUsdhBalance();

    this.deps.debugLogger.log('HyperLiquidProvider: Checking USDH collateral', {
      dexName,
      requiredMargin,
      spotUsdhBalance,
    });

    if (spotUsdhBalance >= requiredMargin) {
      this.deps.debugLogger.log('HyperLiquidProvider: Sufficient USDH in spot');
      return;
    }

    const shortfall = requiredMargin - spotUsdhBalance;
    // HyperLiquid spot has $10 minimum order value
    const minSpotOrderValue = TRADING_DEFAULTS.amount.mainnet;

    // If user has some USDH already, we can swap just the shortfall (if >= $10)
    // If user has zero USDH, they need at least $10 for first swap
    const swapAmount =
      spotUsdhBalance > 0 && shortfall >= minSpotOrderValue
        ? shortfall
        : Math.max(shortfall, minSpotOrderValue);

    // Step 1: Check spot USDC balance
    const spotUsdcBalance = await this.getSpotUsdcBalance();

    // Calculate total available USDC (spot + what we can transfer from perps)
    // For now, check if we have enough in spot first
    const totalUsdcNeeded = swapAmount - spotUsdcBalance;

    // Step 2: If insufficient USDC in spot, transfer from main perps
    if (spotUsdcBalance < swapAmount) {
      const transferAmount = totalUsdcNeeded;

      this.deps.debugLogger.log(
        'HyperLiquidProvider: Transferring USDC to spot for swap',
        {
          spotUsdcBalance,
          swapAmount,
          transferAmount,
        },
      );

      const transferResult = await this.transferUsdcToSpot(transferAmount);
      if (!transferResult.success) {
        // Provide user-friendly error for insufficient funds
        if (transferResult.error?.includes('Insufficient balance')) {
          throw new Error(
            `Insufficient USDC balance. Need $${swapAmount.toFixed(2)} for USDH swap but transfer failed. Please deposit more USDC to your HyperLiquid account.`,
          );
        }
        throw new Error(
          `Failed to transfer USDC to spot: ${transferResult.error}`,
        );
      }
    }

    // Step 3: Swap USDC → USDH
    this.deps.debugLogger.log(
      'HyperLiquidProvider: Swapping USDC→USDH for collateral',
      {
        shortfall,
        swapAmount,
        minOrderValue: minSpotOrderValue,
      },
    );

    const swapResult = await this.swapUsdcToUsdh(swapAmount);

    if (!swapResult.success) {
      throw new Error(
        `Failed to acquire USDH collateral for ${dexName}: ${swapResult.error}`,
      );
    }

    this.deps.debugLogger.log('HyperLiquidProvider: USDH collateral acquired', {
      dexName,
      filledSize: swapResult.filledSize,
    });
  }

  /**
   * Build asset ID mapping from market metadata
   * Fetches metadata for feature-flag-enabled DEXs and builds a unified mapping
   * with DEX-prefixed keys for HIP-3 assets (e.g., "xyz:XYZ100" → assetId)
   *
   * Per HIP-3-IMPLEMENTATION.md:
   * - Main DEX: assetId = index (0, 1, 2, ...)
   * - HIP-3 DEX: assetId = BASE_ASSET_ID + (perpDexIndex × DEX_MULTIPLIER) + index
   *
   * This enables proper order routing - when placeOrder({ symbol: "xyz:XYZ100" }) is called,
   * the asset ID lookup succeeds and the order routes to the correct DEX.
   */
  private async buildAssetMapping(): Promise<void> {
    // Get feature-flag-validated DEXs to map (respects hip3Enabled and enabledDexs)
    const dexsToMap = await this.getValidatedDexs();

    // Use cached perpDexs array (populated by getValidatedDexs)
    const allPerpDexs = this.cachedAllPerpDexs;
    if (!allPerpDexs) {
      throw new Error(
        'perpDexs not cached - getValidatedDexs must be called first',
      );
    }

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Starting asset mapping rebuild',
      {
        dexs: dexsToMap,
        previousMapSize: this.symbolToAssetId.size,
        hip3Enabled: this.hip3Enabled,
        allowlistMarkets: this.allowlistMarkets,
        blocklistMarkets: this.blocklistMarkets,
        timestamp: new Date().toISOString(),
      },
    );

    // Update subscription service with current feature flags
    // Extract HIP-3 DEX names (filter out null which represents main DEX)
    const enabledDexs = dexsToMap.filter((dex): dex is string => dex !== null);

    await this.subscriptionService.updateFeatureFlags(
      this.hip3Enabled,
      enabledDexs,
      this.allowlistMarkets,
      this.blocklistMarkets,
    );

    // Fetch metadata for each DEX in parallel using metaAndAssetCtxs
    // Optimization: Check cache first - getMarketDataWithPrices may have already fetched
    // If not cached, fetch via metaAndAssetCtxs and populate cache for other methods
    const infoClient = this.clientService.getInfoClient();
    const allMetas = await Promise.allSettled(
      dexsToMap.map((dex) => {
        const dexKey = dex ?? '';

        // Check if already cached (e.g., by getMarketDataWithPrices running in parallel)
        const cachedMeta = this.cachedMetaByDex.get(dexKey);
        if (cachedMeta) {
          this.deps.debugLogger.log(
            `[buildAssetMapping] Using cached meta for ${dex || 'main'}`,
            { universeSize: cachedMeta.universe.length },
          );
          return Promise.resolve({
            dex,
            meta: cachedMeta,
            success: true as const,
          });
        }

        // Not cached, fetch and populate cache
        const dexParam = dex || undefined;
        return infoClient
          .metaAndAssetCtxs(dexParam ? { dex: dexParam } : undefined)
          .then((result) => {
            const meta = result?.[0] || null;
            const assetCtxs = result?.[1] || [];
            // Cache meta for later use by getCachedMeta
            if (meta?.universe) {
              this.cachedMetaByDex.set(dexKey, meta);
              // Also populate subscription service cache to avoid redundant API calls
              this.subscriptionService.setDexMetaCache(dexKey, meta);
              // Cache assetCtxs for getMarketDataWithPrices (avoids duplicate metaAndAssetCtxs calls)
              this.subscriptionService.setDexAssetCtxsCache(dexKey, assetCtxs);
            }
            return { dex, meta, success: true as const };
          })
          .catch((error) => {
            this.deps.debugLogger.log(
              `HyperLiquidProvider: Failed to fetch metaAndAssetCtxs for DEX ${
                dex || 'main'
              }`,
              { error },
            );
            return { dex, meta: null, success: false as const };
          });
      }),
    );

    // Build mapping with DEX prefixes for HIP-3 DEXs using the utility function
    this.symbolToAssetId.clear();

    allMetas.forEach((result) => {
      if (
        result.status === 'fulfilled' &&
        result.value.success &&
        result.value.meta
      ) {
        const { dex, meta } = result.value;

        // Validate that meta.universe exists and is an array
        if (!meta.universe || !Array.isArray(meta.universe)) {
          this.deps.debugLogger.log(
            `HyperLiquidProvider: Skipping DEX ${
              dex || 'main'
            } - invalid or missing universe data`,
            {
              hasUniverse: !!meta.universe,
              isArray: Array.isArray(meta.universe),
            },
          );
          return;
        }

        // Find perpDexIndex for this DEX in the perpDexs array
        // Main DEX (dex=null) is at index 0
        // HIP-3 DEXs are at indices 1, 2, 3, etc.
        const perpDexIndex = allPerpDexs.findIndex((entry) => {
          if (dex === null) {
            return entry === null; // Main DEX
          }
          return entry !== null && entry.name === dex;
        });

        if (perpDexIndex === -1) {
          this.deps.debugLogger.log(
            `HyperLiquidProvider: Could not find perpDexIndex for DEX ${
              dex || 'main'
            }`,
          );
          return;
        }

        // Use the utility function to build mapping for this DEX
        const { symbolToAssetId } = buildAssetMapping({
          metaUniverse: meta.universe,
          dex,
          perpDexIndex,
        });

        // Merge into provider's map
        symbolToAssetId.forEach((assetId, coin) => {
          this.symbolToAssetId.set(coin, assetId);
        });
      }
    });

    const allKeys = Array.from(this.symbolToAssetId.keys());
    const mainDexKeys = allKeys.filter((k) => !k.includes(':')).slice(0, 5);
    const hip3Keys = allKeys.filter((k) => k.includes(':')).slice(0, 10);

    this.deps.debugLogger.log('HyperLiquidProvider: Asset mapping built', {
      totalAssets: this.symbolToAssetId.size,
      dexCount: dexsToMap.length,
      mainDexSample: mainDexKeys,
      hip3Sample: hip3Keys,
    });
  }

  /**
   * Set user fee discount context for next operations
   * Used by PerpsController to apply MetaMask reward discounts
   * @param discountBips - The discount in basis points (e.g., 550 = 5.5%)
   */
  setUserFeeDiscount(discountBips: number | undefined): void {
    this.userFeeDiscountBips = discountBips;

    this.deps.debugLogger.log('HyperLiquid: Fee discount context updated', {
      discountBips,
      discountPercentage: discountBips ? discountBips / 100 : undefined,
      isActive: discountBips !== undefined,
    });
  }

  /**
   * Query user data across all enabled DEXs in parallel
   *
   * DRY helper for multi-DEX user data queries. Handles feature flag logic
   * and DEX iteration in one place. Uses cached getValidatedDexs() to avoid
   * redundant perpDexs() API calls.
   *
   * @param baseParams - Base parameters (e.g., { user: '0x...' })
   * @param queryFn - API method to call per DEX
   * @returns Array of results per DEX with DEX identifier
   *
   * @example
   * ```typescript
   * const results = await this.queryUserDataAcrossDexs(
   *   { user: userAddress },
   *   (p) => infoClient.clearinghouseState(p)
   * );
   * ```
   */
  private async queryUserDataAcrossDexs<
    TParams extends Record<string, unknown>,
    TResult,
  >(
    baseParams: TParams,
    queryFn: (params: TParams & { dex?: string }) => Promise<TResult>,
  ): Promise<{ dex: string | null; data: TResult }[]> {
    const enabledDexs = await this.getValidatedDexs();

    const results = await Promise.all(
      enabledDexs.map(async (dex) => {
        const params = dex
          ? ({ ...baseParams, dex } as TParams & { dex: string })
          : (baseParams as TParams & { dex?: string });
        const data = await queryFn(params);
        return { dex, data };
      }),
    );

    return results;
  }

  /**
   * Map HyperLiquid API errors to standardized PERPS_ERROR_CODES
   */
  private mapError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);

    for (const [pattern, code] of Object.entries(this.ERROR_MAPPINGS)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        return new Error(code);
      }
    }

    // Return original error to preserve stack trace for unmapped errors
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Get error context for logging with searchable tags and context.
   * Enables Sentry dashboard filtering by feature, provider, and network.
   *
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields (becomes searchable context data)
   * @returns LoggerErrorOptions with tags (searchable) and context (searchable)
   * @private
   *
   * @example
   * this.deps.logger.error(error, this.getErrorContext('placeOrder', { symbol: 'BTC', orderType: 'limit' }));
   * // Creates searchable tags: feature:perps, provider:hyperliquid, network:mainnet
   * // Creates searchable context: perps_provider.method:placeOrder, perps_provider.symbol:BTC, perps_provider.orderType:limit
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): {
    tags?: Record<string, string | number>;
    context?: { name: string; data: Record<string, unknown> };
    extras?: Record<string, unknown>;
  } {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FeatureName,
        provider: this.protocolId,
        network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      },
      context: {
        name: 'HyperLiquidProvider',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  /**
   * Get supported deposit routes with complete asset and routing information
   */
  getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    const isTestnet = params?.isTestnet ?? this.clientService.isTestnetMode();
    const supportedAssets = getSupportedPaths({ ...params, isTestnet });
    const bridgeInfo = getBridgeInfo(isTestnet);

    return supportedAssets.map((assetId) => ({
      assetId,
      chainId: bridgeInfo.chainId,
      contractAddress: bridgeInfo.contractAddress,
      constraints: {
        minAmount: WITHDRAWAL_CONSTANTS.DefaultMinAmount,
        estimatedMinutes: HYPERLIQUID_WITHDRAWAL_MINUTES,
        fees: {
          fixed: WITHDRAWAL_CONSTANTS.DefaultFeeAmount,
          token: WITHDRAWAL_CONSTANTS.DefaultFeeToken,
        },
      },
    }));
  }

  /**
   * Get supported withdrawal routes with complete asset and routing information
   */
  getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    // For HyperLiquid, withdrawal routes are the same as deposit routes
    return this.getDepositRoutes(params);
  }

  /**
   * Check current builder fee approval for the user
   * @param builder - Builder address to check approval for
   * @returns Current max fee rate or null if not approved
   */
  private async checkBuilderFeeApproval(): Promise<number | null> {
    const infoClient = this.clientService.getInfoClient();
    const userAddress = await this.walletService.getUserAddressWithDefault();
    const builder = this.getBuilderAddress(this.clientService.isTestnetMode());

    return infoClient.maxBuilderFee({
      user: userAddress,
      builder,
    });
  }

  /**
   * Ensure builder fee is approved for MetaMask
   * Called once during initialization (ensureReady) to set up builder fee for the session
   * Uses session cache to avoid redundant API calls until disconnect/reconnect
   *
   * Cache semantics: Only caches successful approvals (never caches "not approved" state)
   * This allows detection of external approvals between retries while avoiding redundant checks
   *
   * Note: This is network-specific - testnet and mainnet have separate builder fee states
   */
  private async ensureBuilderFeeApproval(): Promise<void> {
    const isTestnet = this.clientService.isTestnetMode();
    const network = isTestnet ? 'testnet' : 'mainnet';
    const builderAddress = this.getBuilderAddress(isTestnet);
    const userAddress = await this.walletService.getUserAddressWithDefault();

    // Check session cache first to avoid redundant API calls
    // Cache only stores true (approval confirmed), never false
    const cacheKey = this.getCacheKey(network, userAddress);
    const cached = this.builderFeeCheckCache.get(cacheKey);

    if (cached === true) {
      this.deps.debugLogger.log(
        '[ensureBuilderFeeApproval] Using session cache',
        {
          network,
        },
      );
      return; // Already approved this session, skip
    }

    // Check if approval already in-flight for this cache key
    // This prevents race conditions when multiple concurrent calls happen
    const pendingApproval = this.pendingBuilderFeeApprovals.get(cacheKey);
    if (pendingApproval) {
      this.deps.debugLogger.log(
        '[ensureBuilderFeeApproval] Waiting for in-flight approval',
        {
          network,
        },
      );
      return pendingApproval; // Wait for existing approval to complete
    }

    // Create promise for this approval and track it to prevent duplicates
    const approvalPromise = (async () => {
      const { isApproved, requiredDecimal } =
        await this.checkBuilderFeeStatus();

      if (!isApproved) {
        this.deps.debugLogger.log(
          '[ensureBuilderFeeApproval] Approval required',
          {
            builder: builderAddress,
            currentApproval: isApproved,
            requiredDecimal,
          },
        );

        const exchangeClient = this.clientService.getExchangeClient();
        const maxFeeRate = BUILDER_FEE_CONFIG.MaxFeeRate;

        await exchangeClient.approveBuilderFee({
          builder: builderAddress,
          maxFeeRate,
        });

        // Verify approval was successful before caching
        const afterApprovalDecimal = await this.checkBuilderFeeApproval();

        if (
          afterApprovalDecimal === null ||
          afterApprovalDecimal < requiredDecimal
        ) {
          throw new Error(
            '[HyperLiquidProvider] Builder fee approval verification failed',
          );
        }

        // Only cache after verification succeeds
        this.builderFeeCheckCache.set(cacheKey, true);

        this.deps.debugLogger.log(
          '[ensureBuilderFeeApproval] Approval successful',
          {
            builder: builderAddress,
            approvedDecimal: afterApprovalDecimal,
            maxFeeRate,
          },
        );
      } else {
        // User already has approval (possibly from external approval or previous session)
        // Cache success to avoid redundant checks
        this.builderFeeCheckCache.set(cacheKey, true);

        this.deps.debugLogger.log(
          '[ensureBuilderFeeApproval] Already approved',
          {
            network,
          },
        );
      }
    })();

    // Track the pending approval promise
    this.pendingBuilderFeeApprovals.set(cacheKey, approvalPromise);

    try {
      await approvalPromise;
    } finally {
      // Clean up tracking after completion (success or failure)
      this.pendingBuilderFeeApprovals.delete(cacheKey);
    }
  }

  /**
   * Check if builder fee is approved for the current user
   * @returns Object with approval status and current rate
   */
  private async checkBuilderFeeStatus(): Promise<{
    isApproved: boolean;
    currentRate: number | null;
    requiredDecimal: number;
  }> {
    const currentApproval = await this.checkBuilderFeeApproval();
    const requiredDecimal = BUILDER_FEE_CONFIG.MaxFeeDecimal;

    return {
      isApproved:
        currentApproval !== null && currentApproval >= requiredDecimal,
      currentRate: currentApproval,
      requiredDecimal,
    };
  }

  /**
   * Get available balance for a specific DEX
   * @param params - Balance query parameters
   * @param params.dex - DEX name (null = main, 'xyz' = HIP-3)
   * @returns Available balance in USDC
   * @private
   */
  private async getBalanceForDex(params: {
    dex: string | null;
  }): Promise<number> {
    const { dex } = params;
    const userAddress = await this.walletService.getUserAddressWithDefault();
    const infoClient = this.clientService.getInfoClient();

    const queryParams = dex
      ? { user: userAddress, dex }
      : { user: userAddress };

    const accountState = await infoClient.clearinghouseState(queryParams);
    const adapted = adaptAccountStateFromSDK(accountState);
    return parseFloat(adapted.availableBalance);
  }

  /**
   * Find source DEX with sufficient balance for transfer
   * Strategy: Prefer main DEX → other HIP-3 DEXs
   * @param params - Source search parameters
   * @param params.targetDex - Target DEX name
   * @param params.requiredAmount - Required balance shortfall
   * @returns Source DEX info or null if insufficient funds
   * @private
   */
  private async findSourceDexWithBalance(params: {
    targetDex: string;
    requiredAmount: number;
  }): Promise<{ sourceDex: string; available: number } | null> {
    const { targetDex, requiredAmount } = params;

    // Try main DEX first
    try {
      const mainBalance = await this.getBalanceForDex({ dex: null });
      if (mainBalance >= requiredAmount) {
        return { sourceDex: '', available: mainBalance };
      }
    } catch (error) {
      this.deps.debugLogger.log('Could not fetch main DEX balance', { error });
    }

    // Try other HIP-3 DEXs
    // Get all available DEXs from cache (includes all HIP-3 DEXs since we no longer filter)
    const availableDexs =
      this.cachedValidatedDexs?.filter((d): d is string => d !== null) ?? [];
    for (const dex of availableDexs) {
      if (dex === targetDex) continue;

      try {
        const balance = await this.getBalanceForDex({ dex });
        if (balance >= requiredAmount) {
          return { sourceDex: dex, available: balance };
        }
      } catch (error) {
        this.deps.debugLogger.log(`Could not fetch balance for DEX ${dex}`, {
          error,
        });
      }
    }

    return null;
  }

  /**
   * Auto-transfer funds for HIP-3 orders when insufficient balance
   * Only called for HIP-3 markets (not main DEX)
   * @param params - Transfer parameters
   * @param params.targetDex - HIP-3 DEX name (e.g., 'xyz')
   * @param params.requiredMargin - Required margin with buffer
   * @returns Transfer info for rollback, or null if no transfer needed
   * @private
   */
  private async autoTransferForHip3Order(params: {
    targetDex: string;
    requiredMargin: number;
  }): Promise<{ amount: number; sourceDex: string } | null> {
    const { targetDex, requiredMargin } = params;

    // Check target DEX balance
    const targetBalance = await this.getBalanceForDex({ dex: targetDex });

    this.deps.debugLogger.log('HyperLiquidProvider: HIP-3 balance check', {
      targetDex,
      targetBalance: targetBalance.toFixed(2),
      requiredMargin: requiredMargin.toFixed(2),
      shortfall: Math.max(0, requiredMargin - targetBalance).toFixed(2),
    });

    // Sufficient balance - no transfer needed
    if (targetBalance >= requiredMargin) {
      return null;
    }

    // Calculate shortfall and find source
    const shortfall = requiredMargin - targetBalance;
    const source = await this.findSourceDexWithBalance({
      targetDex,
      requiredAmount: shortfall,
    });

    if (!source) {
      throw new Error(
        `Insufficient balance for HIP-3 order. Required: ${requiredMargin.toFixed(
          2,
        )} USDC on ${targetDex} DEX, Available: ${targetBalance.toFixed(
          2,
        )} USDC. Please transfer funds to ${targetDex} DEX.`,
      );
    }

    // Execute transfer
    const transferAmount = Math.min(shortfall, source.available).toFixed(
      USDC_DECIMALS,
    );

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Executing HIP-3 auto-transfer',
      {
        from: source.sourceDex || 'main',
        to: targetDex,
        amount: transferAmount,
      },
    );

    const result = await this.transferBetweenDexs({
      sourceDex: source.sourceDex,
      destinationDex: targetDex,
      amount: transferAmount,
    });

    if (!result.success) {
      throw new Error(
        `Auto-transfer failed: ${result.error || 'Unknown error'}`,
      );
    }

    this.deps.debugLogger.log(
      '✅ HyperLiquidProvider: HIP-3 auto-transfer complete',
      {
        amount: transferAmount,
        from: source.sourceDex || 'main',
        to: targetDex,
      },
    );

    return {
      amount: parseFloat(transferAmount),
      sourceDex: source.sourceDex,
    };
  }

  /**
   * Auto-transfer freed margin back to main DEX after closing a HIP-3 position
   *
   * This method transfers the margin released from closing a position back to
   * the main DEX to prevent balance fragmentation across HIP-3 DEXs.
   *
   * Design: Non-blocking operation - failures are logged but don't affect the
   * position close operation. Extensible for future configuration options.
   *
   * @param params - Transfer configuration
   * @param params.sourceDex - HIP-3 DEX name to transfer from
   * @param params.freedMargin - Amount of margin released from position close
   * @param params.transferAll - (Future) Transfer all available balance instead
   * @param params.skipTransfer - (Future) Skip auto-transfer if disabled
   * @returns Transfer info if successful, null if skipped/failed
   * @private
   */
  private async autoTransferBackAfterClose(params: {
    sourceDex: string;
    freedMargin: number;
    transferAll?: boolean;
    skipTransfer?: boolean;
  }): Promise<{ amount: number; destinationDex: string } | null> {
    const {
      sourceDex,
      freedMargin,
      transferAll = false,
      skipTransfer = false,
    } = params;

    // Future: Check user preference to skip auto-transfer
    if (skipTransfer) {
      this.deps.debugLogger.log(
        'Auto-transfer back skipped (disabled by config)',
      );
      return null;
    }

    try {
      this.deps.debugLogger.log('Attempting auto-transfer back to main DEX', {
        sourceDex,
        freedMargin: freedMargin.toFixed(2),
        transferAll,
      });

      // Get current balance on HIP-3 DEX
      const sourceBalance = await this.getBalanceForDex({ dex: sourceDex });

      if (sourceBalance <= 0) {
        this.deps.debugLogger.log('No balance to transfer back', {
          sourceBalance,
        });
        return null;
      }

      // Determine transfer amount
      const transferAmount = transferAll
        ? sourceBalance
        : Math.min(freedMargin, sourceBalance);

      if (transferAmount <= 0) {
        this.deps.debugLogger.log('Transfer amount too small', {
          transferAmount,
        });
        return null;
      }

      this.deps.debugLogger.log('Transferring back to main DEX', {
        amount: transferAmount.toFixed(USDC_DECIMALS),
        from: sourceDex,
        to: 'main',
      });

      // Execute transfer back to main DEX (empty string '' represents main DEX)
      const result = await this.transferBetweenDexs({
        sourceDex,
        destinationDex: '',
        amount: transferAmount.toFixed(USDC_DECIMALS),
      });

      if (!result.success) {
        this.deps.debugLogger.log('❌ Auto-transfer back failed', {
          error: result.error,
        });
        return null;
      }

      this.deps.debugLogger.log('✅ Auto-transfer back successful', {
        amount: transferAmount.toFixed(USDC_DECIMALS),
        from: sourceDex,
        to: 'main',
      });

      return {
        amount: transferAmount,
        destinationDex: '',
      };
    } catch (error) {
      // Non-blocking: Log error but don't throw
      this.deps.debugLogger.log('❌ Auto-transfer back exception', {
        error,
        sourceDex,
        freedMargin,
      });
      return null;
    }
  }

  /**
   * Calculate required margin for HIP-3 order based on existing position
   * Handles three scenarios:
   * 1. Increasing existing position - requires TOTAL margin (temporary over-funding)
   * 2. Reducing/flipping position - requires margin for new order only
   * 3. New position - requires margin for new order only
   *
   * @private
   */
  private async calculateHip3RequiredMargin(params: {
    symbol: string;
    dexName: string;
    positionSize: number;
    orderPrice: number;
    leverage: number;
    isBuy: boolean;
  }): Promise<number> {
    const { symbol, dexName, positionSize, orderPrice, leverage, isBuy } =
      params;

    // Get existing position to check if we're increasing
    const positions = await this.getPositions();
    const existingPosition = positions.find((p) => p.symbol === symbol);

    let requiredMarginWithBuffer: number;

    // HyperLiquid validates isolated margin by checking if available balance >= TOTAL position margin
    // When increasing a position, we need to ensure enough funds are available for the TOTAL combined size
    if (existingPosition) {
      const existingIsLong = parseFloat(existingPosition.size) > 0;
      const orderIsLong = isBuy;

      if (existingIsLong === orderIsLong) {
        // Increasing position - HyperLiquid validates availableBalance >= totalRequiredMargin
        // BEFORE reallocating existing locked margin. Must transfer TOTAL margin temporarily.
        const existingSize = Math.abs(parseFloat(existingPosition.size));
        const existingMargin = parseFloat(existingPosition.marginUsed);
        const totalSize = existingSize + positionSize;
        const totalNotionalValue = totalSize * orderPrice;
        const totalRequiredMargin = totalNotionalValue / leverage;

        // Accept temporary over-funding - excess will be reclaimed after order succeeds
        requiredMarginWithBuffer =
          totalRequiredMargin * HIP3_MARGIN_CONFIG.BufferMultiplier;

        this.deps.debugLogger.log(
          'HyperLiquidProvider: HIP-3 margin calculation (TOTAL margin - temporary over-funding)',
          {
            symbol,
            dex: dexName,
            existingSize: existingSize.toFixed(4),
            existingMargin: existingMargin.toFixed(2),
            newSize: positionSize.toFixed(4),
            totalSize: totalSize.toFixed(4),
            totalNotionalValue: totalNotionalValue.toFixed(2),
            leverage,
            totalRequiredMargin: totalRequiredMargin.toFixed(2),
            requiredMarginWithBuffer: requiredMarginWithBuffer.toFixed(2),
            note: 'Transferring TOTAL margin (HyperLiquid validates before reallocation). Will auto-rebalance excess after success.',
          },
        );
      } else {
        // Reducing or flipping position - just need margin for new order
        const notionalValue = positionSize * orderPrice;
        const requiredMargin = notionalValue / leverage;
        requiredMarginWithBuffer =
          requiredMargin * HIP3_MARGIN_CONFIG.BufferMultiplier;

        this.deps.debugLogger.log(
          'HyperLiquidProvider: HIP-3 margin calculation (reducing position)',
          {
            symbol,
            dex: dexName,
            notionalValue: notionalValue.toFixed(2),
            leverage,
            requiredMargin: requiredMargin.toFixed(2),
            requiredMarginWithBuffer: requiredMarginWithBuffer.toFixed(2),
          },
        );
      }
    } else {
      // No existing position - just need margin for this order
      const notionalValue = positionSize * orderPrice;
      const requiredMargin = notionalValue / leverage;
      requiredMarginWithBuffer =
        requiredMargin * HIP3_MARGIN_CONFIG.BufferMultiplier;

      this.deps.debugLogger.log(
        'HyperLiquidProvider: HIP-3 margin calculation (new position)',
        {
          symbol,
          dex: dexName,
          notionalValue: notionalValue.toFixed(2),
          leverage,
          requiredMargin: requiredMargin.toFixed(2),
          requiredMarginWithBuffer: requiredMarginWithBuffer.toFixed(2),
        },
      );
    }

    return requiredMarginWithBuffer;
  }

  /**
   * Handle post-order balance check and auto-rebalance for HIP-3 orders
   * After a successful order, checks available balance and transfers excess back to main DEX
   * Does not throw errors - logs them for monitoring
   *
   * @private
   */
  private async handleHip3PostOrderRebalance(params: {
    dexName: string;
    transferInfo: { amount: number; sourceDex: string };
  }): Promise<void> {
    const { dexName, transferInfo } = params;

    try {
      const postOrderBalance = await this.getBalanceForDex({ dex: dexName });
      const transferredAmount = transferInfo.amount;
      const leftoverAmount = postOrderBalance;
      const leftoverPercentage =
        transferredAmount > 0 ? (leftoverAmount / transferredAmount) * 100 : 0;

      this.deps.debugLogger.log(
        '✅ HyperLiquidProvider: Order succeeded - post-order balance',
        {
          dex: dexName,
          transferredAmount: transferredAmount.toFixed(2),
          availableAfterOrder: leftoverAmount.toFixed(2),
          leftoverPercentage: leftoverPercentage.toFixed(2) + '%',
        },
      );

      // Auto-rebalance: Reclaim excess funds back to main DEX
      const desiredBuffer = HIP3_MARGIN_CONFIG.RebalanceDesiredBuffer;
      const excessAmount = postOrderBalance - desiredBuffer;
      const minimumTransferThreshold = HIP3_MARGIN_CONFIG.RebalanceMinThreshold;

      if (excessAmount > minimumTransferThreshold) {
        try {
          this.deps.debugLogger.log(
            '🔄 HyperLiquidProvider: Auto-rebalancing excess margin back to main DEX',
            {
              dex: dexName,
              availableBalance: postOrderBalance.toFixed(2),
              desiredBuffer: desiredBuffer.toFixed(2),
              excessAmount: excessAmount.toFixed(2),
              destinationDex: transferInfo.sourceDex,
            },
          );

          await this.transferBetweenDexs({
            sourceDex: dexName,
            destinationDex: transferInfo.sourceDex,
            amount: excessAmount.toFixed(USDC_DECIMALS),
          });

          this.deps.debugLogger.log(
            '✅ HyperLiquidProvider: Auto-rebalance completed',
            {
              transferredBack: excessAmount.toFixed(2),
              from: dexName,
              to: transferInfo.sourceDex,
            },
          );
        } catch (rebalanceError) {
          // Don't fail the order if rebalance fails (order already succeeded)
          this.deps.logger.error(
            ensureError(rebalanceError),
            this.getErrorContext('placeOrder:autoRebalance', {
              dex: dexName,
              excessAmount: excessAmount.toFixed(2),
              note: 'Auto-rebalance failed - funds remain on HIP-3 DEX',
            }),
          );
        }
      } else {
        this.deps.debugLogger.log(
          'ℹ️ HyperLiquidProvider: No auto-rebalance needed',
          {
            excessAmount: excessAmount.toFixed(2),
            threshold: minimumTransferThreshold.toFixed(2),
            note: 'Excess below minimum transfer threshold',
          },
        );
      }
    } catch (balanceCheckError) {
      // Don't fail the order if balance check fails - log for monitoring
      this.deps.logger.error(
        ensureError(balanceCheckError),
        this.getErrorContext('placeOrder:postOrderBalanceCheck', {
          dex: dexName,
          note: 'Failed to verify post-order balance for auto-rebalance',
        }),
      );
    }
  }

  /**
   * Handle rollback of HIP-3 transfer when order fails
   * Attempts to return funds to source DEX
   * Does not throw errors - logs them for monitoring
   *
   * @private
   */
  private async handleHip3OrderRollback(params: {
    dexName: string;
    transferInfo: { amount: number; sourceDex: string };
  }): Promise<void> {
    const { dexName, transferInfo } = params;

    try {
      this.deps.debugLogger.log(
        'HyperLiquidProvider: Rolling back failed order transfer',
        {
          from: dexName,
          to: transferInfo.sourceDex || 'main',
          amount: transferInfo.amount.toFixed(USDC_DECIMALS),
          reason: 'order_failed',
        },
      );

      const rollbackResult = await this.transferBetweenDexs({
        sourceDex: dexName, // From HIP-3 DEX
        destinationDex: transferInfo.sourceDex, // Back to source
        amount: transferInfo.amount.toFixed(USDC_DECIMALS),
      });

      if (rollbackResult.success) {
        this.deps.debugLogger.log(
          '✅ HyperLiquidProvider: Rollback successful',
          {
            amount: transferInfo.amount.toFixed(USDC_DECIMALS),
            returnedTo: transferInfo.sourceDex || 'main',
          },
        );
      } else {
        this.deps.logger.error(
          new Error(rollbackResult.error || 'Rollback transfer failed'),
          this.getErrorContext('placeOrder:rollback', {
            dex: dexName,
            amount: transferInfo.amount.toFixed(USDC_DECIMALS),
            note: 'Rollback failed - funds remain on HIP-3 DEX',
          }),
        );
      }
    } catch (rollbackError) {
      // Log but don't throw - original order error is more important
      this.deps.logger.error(
        ensureError(rollbackError),
        this.getErrorContext('placeOrder:rollback:exception', {
          dex: dexName,
          amount: transferInfo.amount.toFixed(USDC_DECIMALS),
          note: 'Rollback threw exception - funds remain on HIP-3 DEX',
        }),
      );
    }
  }

  // ============================================================================
  // Helper Methods for placeOrder Refactoring
  // ============================================================================

  /**
   * Validates order parameters before placement using provider-level validation
   * @throws Error if validation fails
   */
  private async validateOrderBeforePlacement(
    params: OrderParams,
  ): Promise<void> {
    this.deps.debugLogger.log(
      'Provider: Validating order before placement:',
      params,
    );

    const validation = await this.validateOrder(params);
    if (!validation.isValid) {
      throw new Error(
        validation.error || 'Order validation failed at provider level',
      );
    }
  }

  /**
   * Gets asset info and current price from the correct DEX
   */
  private async getAssetInfo(
    params: GetAssetInfoParams,
  ): Promise<GetAssetInfoResult> {
    const { symbol, dexName } = params;

    const infoClient = this.clientService.getInfoClient();
    const meta = await this.getCachedMeta({ dexName });

    const assetInfo = meta.universe.find((asset) => asset.name === symbol);
    if (!assetInfo) {
      throw new Error(
        `Asset ${symbol} not found in ${dexName || 'main'} DEX universe`,
      );
    }

    const mids = await infoClient.allMids({ dex: dexName ?? '' });
    const currentPrice = parseFloat(mids[symbol] || '0');
    if (currentPrice === 0) {
      throw new Error(`No price available for ${symbol}`);
    }

    return { assetInfo, currentPrice, meta };
  }

  /**
   * Prepares asset for trading by updating leverage if specified
   */
  private async prepareAssetForTrading(
    params: PrepareAssetForTradingParams,
  ): Promise<void> {
    const { symbol, assetId, leverage } = params;

    if (!leverage) {
      return;
    }

    this.deps.debugLogger.log('Updating leverage before order:', {
      symbol,
      assetId,
      requestedLeverage: leverage,
      leverageType: 'isolated',
    });

    const exchangeClient = this.clientService.getExchangeClient();
    const leverageResult = await exchangeClient.updateLeverage({
      asset: assetId,
      isCross: false,
      leverage,
    });

    if (leverageResult.status !== 'ok') {
      throw new Error(
        `Failed to update leverage: ${JSON.stringify(leverageResult)}`,
      );
    }

    this.deps.debugLogger.log('Leverage updated successfully:', {
      symbol,
      leverage,
    });
  }

  /**
   * Handles HIP-3 pre-order balance management
   */
  private async handleHip3PreOrder(
    params: HandleHip3PreOrderParams,
  ): Promise<HandleHip3PreOrderResult> {
    const { dexName, symbol, orderPrice, positionSize, leverage, isBuy } =
      params;

    // Check if this DEX uses USDH collateral (vs USDC)
    // For USDH DEXs, HyperLiquid automatically pulls from spot balance
    const isUsdhDex = await this.isUsdhCollateralDex(dexName);
    if (isUsdhDex) {
      this.deps.debugLogger.log(
        'HyperLiquidProvider: USDH-collateralized DEX detected',
        {
          dexName,
          symbol,
        },
      );

      // Calculate required margin and ensure USDH is in spot
      const requiredMargin = await this.calculateHip3RequiredMargin({
        symbol,
        dexName,
        positionSize,
        orderPrice,
        leverage,
        isBuy,
      });

      await this.ensureUsdhCollateralForOrder(dexName, requiredMargin);

      // DEX abstraction will pull USDH from spot automatically
      return { transferInfo: null };
    }

    if (this.useDexAbstraction) {
      this.deps.debugLogger.log('Using DEX abstraction (no manual transfer)', {
        symbol,
        dex: dexName,
      });
      return { transferInfo: null };
    }

    this.deps.debugLogger.log('Using manual auto-transfer', {
      symbol,
      dex: dexName,
    });

    const requiredMarginWithBuffer = await this.calculateHip3RequiredMargin({
      symbol,
      dexName,
      positionSize,
      orderPrice,
      leverage,
      isBuy,
    });

    try {
      const transferInfo = await this.autoTransferForHip3Order({
        targetDex: dexName,
        requiredMargin: requiredMarginWithBuffer,
      });
      return { transferInfo };
    } catch (transferError) {
      const errorMsg = (transferError as Error)?.message || '';

      if (errorMsg.includes('Cannot transfer with DEX abstraction enabled')) {
        this.deps.debugLogger.log(
          'Detected DEX abstraction is enabled, switching mode',
        );
        this.useDexAbstraction = true;
        return { transferInfo: null };
      }

      throw transferError;
    }
  }

  /**
   * Submits order with atomic rollback for HIP-3 failures
   */
  private async submitOrderWithRollback(
    params: SubmitOrderWithRollbackParams,
  ): Promise<OrderResult> {
    const { orders, grouping, isHip3Order, dexName, transferInfo, symbol } =
      params;

    const exchangeClient = this.clientService.getExchangeClient();

    // Calculate discounted builder fee
    let builderFee = BUILDER_FEE_CONFIG.MaxFeeTenthsBps;
    if (this.userFeeDiscountBips !== undefined) {
      builderFee = Math.floor(
        builderFee * (1 - this.userFeeDiscountBips / BASIS_POINTS_DIVISOR),
      );
      this.deps.debugLogger.log('Applying builder fee discount', {
        originalFee: BUILDER_FEE_CONFIG.MaxFeeTenthsBps,
        discountBips: this.userFeeDiscountBips,
        discountedFee: builderFee,
      });
    }

    this.deps.debugLogger.log('Submitting order via asset ID routing', {
      symbol,
      assetId: orders[0].a,
      orderCount: orders.length,
      mainOrder: orders[0],
      dexName: dexName || 'main',
      isHip3: !!dexName,
    });

    try {
      const result = await exchangeClient.order({
        orders,
        grouping,
        builder: {
          b: this.getBuilderAddress(this.clientService.isTestnetMode()),
          f: builderFee,
        },
      });

      if (result.status !== 'ok') {
        throw new Error(`Order failed: ${JSON.stringify(result)}`);
      }

      const status = result.response?.data?.statuses?.[0];
      const restingOrder =
        isStatusObject(status) && 'resting' in status ? status.resting : null;
      const filledOrder =
        isStatusObject(status) && 'filled' in status ? status.filled : null;

      // Success - auto-rebalance excess funds
      if (isHip3Order && transferInfo && dexName) {
        await this.handleHip3PostOrderRebalance({ dexName, transferInfo });
      }

      return {
        success: true,
        orderId: restingOrder?.oid?.toString() || filledOrder?.oid?.toString(),
        filledSize: filledOrder?.totalSz,
        averagePrice: filledOrder?.avgPx,
      };
    } catch (orderError) {
      // Failure - rollback transfer
      if (transferInfo && dexName) {
        await this.handleHip3OrderRollback({ dexName, transferInfo });
      }
      throw orderError;
    }
  }

  /**
   * Handles order errors with proper error mapping
   */
  private handleOrderError(params: HandleOrderErrorParams): OrderResult {
    const { error, symbol, orderType, isBuy } = params;

    this.deps.logger.error(
      ensureError(error),
      this.getErrorContext('placeOrder', {
        symbol,
        orderType,
        isBuy,
      }),
    );

    const mappedError = this.mapError(error);
    return createErrorResult(mappedError, { success: false });
  }

  /**
   * Place an order using direct wallet signing
   *
   * Refactored to use helper methods for better maintainability and reduced complexity.
   * Each helper method is focused on a single responsibility.
   *
   * @param params - Order parameters
   * @param retryCount - Internal retry counter to prevent infinite loops (default: 0)
   */
  async placeOrder(params: OrderParams, retryCount = 0): Promise<OrderResult> {
    try {
      this.deps.debugLogger.log('Placing order via HyperLiquid SDK:', params);

      // Basic sync validation (backward compatibility)
      const validation = validateOrderParams({
        coin: params.symbol,
        size: params.size,
        price: params.price,
        orderType: params.orderType,
      });
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Validate order at provider level (enforces USD validation rules)
      await this.validateOrderBeforePlacement(params);

      await this.ensureReady();

      // Explicitly ensure builder fee approval for trading
      // This is critical for orders and will throw if not approved or if account has no deposits
      await this.ensureBuilderFeeApproval();

      // Debug: Log asset map state before order placement
      const allMapKeys = Array.from(this.symbolToAssetId.keys());
      const hip3Keys = allMapKeys.filter((k) => k.includes(':'));
      const assetExists = this.symbolToAssetId.has(params.symbol);
      this.deps.debugLogger.log('Asset map state at order time', {
        requestedCoin: params.symbol,
        assetExistsInMap: assetExists,
        totalAssetsInMap: this.symbolToAssetId.size,
        hip3AssetsCount: hip3Keys.length,
        hip3AssetsSample: hip3Keys.slice(0, 10),
        hip3Enabled: this.hip3Enabled,
        allowlistMarkets: this.allowlistMarkets,
        blocklistMarkets: this.blocklistMarkets,
      });

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(params.symbol);

      // 1. Get asset info and current price
      const { assetInfo, currentPrice } = await this.getAssetInfo({
        symbol: params.symbol,
        dexName,
      });

      // Allow override with UI-provided price (optimization to avoid API call)
      const effectivePrice =
        params.currentPrice && params.currentPrice > 0
          ? params.currentPrice
          : currentPrice;

      if (params.currentPrice && params.currentPrice > 0) {
        this.deps.debugLogger.log('Using provided current price:', {
          coin: params.symbol,
          providedPrice: effectivePrice,
          source: 'UI price feed',
        });
      }

      // 2. Calculate final position size with USD reconciliation
      const { finalPositionSize } = calculateFinalPositionSize({
        usdAmount: params.usdAmount,
        size: params.size,
        currentPrice: effectivePrice,
        priceAtCalculation: params.priceAtCalculation,
        maxSlippageBps: params.maxSlippageBps,
        szDecimals: assetInfo.szDecimals,
        leverage: params.leverage,
      });

      // 3. Calculate order price and formatted size
      const { orderPrice, formattedSize, formattedPrice } =
        calculateOrderPriceAndSize({
          orderType: params.orderType,
          isBuy: params.isBuy,
          finalPositionSize,
          currentPrice: effectivePrice,
          limitPrice: params.price,
          slippage: params.slippage,
          szDecimals: assetInfo.szDecimals,
        });

      // 4. Get asset ID and validate it exists
      const assetId = this.symbolToAssetId.get(params.symbol);
      if (assetId === undefined) {
        this.deps.debugLogger.log('Asset ID lookup failed', {
          requestedCoin: params.symbol,
          dexName: dexName || 'main',
          mapSize: this.symbolToAssetId.size,
          mapContainsAsset: this.symbolToAssetId.has(params.symbol),
          allKeys: Array.from(this.symbolToAssetId.keys()).slice(0, 20),
        });
        throw new Error(`Asset ID not found for ${params.symbol}`);
      }

      this.deps.debugLogger.log('Resolved DEX-specific asset ID', {
        coin: params.symbol,
        dex: dexName || 'main',
        assetId,
      });

      // 5. Update leverage if specified
      await this.prepareAssetForTrading({
        symbol: params.symbol,
        assetId,
        leverage: params.leverage,
      });

      // 6. Handle HIP-3 balance management (if applicable)
      const isHip3Order = dexName !== null;
      let transferInfo: { amount: number; sourceDex: string } | null = null;

      if (isHip3Order && dexName) {
        const effectiveLeverage = params.leverage || assetInfo.maxLeverage || 1;
        const hip3Result = await this.handleHip3PreOrder({
          dexName,
          symbol: params.symbol,
          orderPrice,
          positionSize: parseFloat(formattedSize),
          leverage: effectiveLeverage,
          isBuy: params.isBuy,
          maxLeverage: assetInfo.maxLeverage,
        });
        transferInfo = hip3Result.transferInfo;
      }

      // 7. Build orders array (main + TP/SL if specified)
      const { orders, grouping } = buildOrdersArray({
        assetId,
        isBuy: params.isBuy,
        formattedPrice,
        formattedSize,
        reduceOnly: params.reduceOnly || false,
        orderType: params.orderType,
        clientOrderId: params.clientOrderId,
        takeProfitPrice: params.takeProfitPrice,
        stopLossPrice: params.stopLossPrice,
        szDecimals: assetInfo.szDecimals,
        grouping: params.grouping,
      });

      // 8. Submit order with atomic rollback
      return await this.submitOrderWithRollback({
        orders,
        grouping,
        isHip3Order,
        dexName,
        transferInfo,
        symbol: params.symbol,
        assetId,
      });
    } catch (error) {
      // Retry mechanism for $10 minimum order errors
      // This handles the case where UI price feed slightly differs from HyperLiquid's orderbook price
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isMinimumOrderError =
        errorMessage.includes('Order must have minimum value of $10') ||
        errorMessage.includes('Order 0: Order must have minimum value');

      if (isMinimumOrderError && retryCount === 0) {
        let adjustedUsdAmount: string;
        let originalValue: string | undefined;

        if (params.usdAmount) {
          // USD-based order: adjust the USD amount directly
          originalValue = params.usdAmount;
          adjustedUsdAmount = (parseFloat(params.usdAmount) * 1.015).toFixed(2);
        } else if (params.currentPrice) {
          // Size-based order: calculate USD from size and adjust
          const sizeValue = parseFloat(params.size);
          const estimatedUsd = sizeValue * params.currentPrice;
          originalValue = `${estimatedUsd.toFixed(2)} (calculated from size ${params.size})`;
          adjustedUsdAmount = (estimatedUsd * 1.015).toFixed(2);
        } else {
          // No price information available - cannot retry
          return this.handleOrderError({
            error,
            symbol: params.symbol,
            orderType: params.orderType,
            isBuy: params.isBuy,
          });
        }

        this.deps.debugLogger.log(
          'Retrying order with adjusted size due to minimum value error',
          {
            originalValue,
            adjustedUsdAmount,
            retryCount,
          },
        );

        return this.placeOrder(
          {
            ...params,
            usdAmount: adjustedUsdAmount,
          },
          1, // Retry count = 1, prevents further retries
        );
      }

      return this.handleOrderError({
        error,
        symbol: params.symbol,
        orderType: params.orderType,
        isBuy: params.isBuy,
      });
    }
  }

  /**
   * Edit an existing order (pending/unfilled order)
   *
   * Note: This modifies price/size of a pending order. It CANNOT add TP/SL to an existing order.
   * For adding TP/SL to an existing position, use updatePositionTPSL instead.
   *
   * @param params.orderId - The order ID to modify
   * @param params.newOrder - New order parameters (price, size, etc.)
   */
  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    try {
      this.deps.debugLogger.log('Editing order:', params);

      // Validate size is positive (validateOrderParams no longer validates size)
      const size = parseFloat(params.newOrder.size || '0');
      if (size <= 0) {
        return {
          success: false,
          error: PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE,
        };
      }

      // Validate new order parameters
      const validation = validateOrderParams({
        coin: params.newOrder.symbol,
        size: params.newOrder.size,
        price: params.newOrder.price,
        orderType: params.newOrder.orderType,
      });
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      await this.ensureReady();

      // Explicitly ensure builder fee approval for trading
      await this.ensureBuilderFeeApproval();

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(params.newOrder.symbol);

      // Get asset info and prices (uses cache to avoid redundant API calls)
      const infoClient = this.clientService.getInfoClient();
      const meta = await this.getCachedMeta({ dexName });
      const mids = await infoClient.allMids({ dex: dexName ?? '' });

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find(
        (asset) => asset.name === params.newOrder.symbol,
      );
      if (!assetInfo) {
        throw new Error(
          `Asset ${params.newOrder.symbol} not found in ${
            dexName || 'main'
          } DEX universe`,
        );
      }

      const currentPrice = parseFloat(mids[params.newOrder.symbol] || '0');
      if (currentPrice === 0) {
        throw new Error(`No price available for ${params.newOrder.symbol}`);
      }

      // Calculate order parameters using the same logic as placeOrder
      let orderPrice: number;
      let formattedSize: string;

      if (params.newOrder.orderType === 'market') {
        const positionSize = parseFloat(params.newOrder.size);
        const slippage =
          params.newOrder.slippage ??
          ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps / 10000;
        orderPrice = params.newOrder.isBuy
          ? currentPrice * (1 + slippage)
          : currentPrice * (1 - slippage);
        formattedSize = formatHyperLiquidSize({
          size: positionSize,
          szDecimals: assetInfo.szDecimals,
        });
      } else {
        if (!params.newOrder.price) {
          throw new Error(PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED);
        }
        orderPrice = parseFloat(params.newOrder.price);
        formattedSize = formatHyperLiquidSize({
          size: parseFloat(params.newOrder.size),
          szDecimals: assetInfo.szDecimals,
        });
      }

      const formattedPrice = formatHyperLiquidPrice({
        price: orderPrice,
        szDecimals: assetInfo.szDecimals,
      });
      const assetId = this.symbolToAssetId.get(params.newOrder.symbol);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${params.newOrder.symbol}`);
      }

      // Build new order parameters
      const newOrder: SDKOrderParams = {
        a: assetId,
        b: params.newOrder.isBuy,
        p: formattedPrice,
        s: formattedSize,
        r: params.newOrder.reduceOnly || false,
        // Same TIF logic as placeOrder - see documentation above for details
        t:
          params.newOrder.orderType === 'limit'
            ? { limit: { tif: 'Gtc' } } // Standard limit order
            : { limit: { tif: 'FrontendMarket' } }, // True market order
        c: params.newOrder.clientOrderId
          ? (params.newOrder.clientOrderId as Hex)
          : undefined,
      };

      // Submit modification via SDK
      const exchangeClient = this.clientService.getExchangeClient();
      const result = await exchangeClient.modify({
        oid:
          typeof params.orderId === 'string'
            ? (params.orderId as Hex)
            : params.orderId,
        order: newOrder,
      });

      if (result.status !== 'ok') {
        throw new Error(`Order modification failed: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
        orderId: params.orderId.toString(),
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('editOrder', {
          orderId: params.orderId,
          coin: params.newOrder.symbol,
          orderType: params.newOrder.orderType,
        }),
      );
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    try {
      this.deps.debugLogger.log('Canceling order:', params);

      // Validate coin exists
      const coinValidation = validateCoinExists(
        params.symbol,
        this.symbolToAssetId,
      );
      if (!coinValidation.isValid) {
        throw new Error(coinValidation.error);
      }

      await this.ensureReady();

      // Explicitly ensure builder fee approval for trading
      await this.ensureBuilderFeeApproval();

      const exchangeClient = this.clientService.getExchangeClient();
      const asset = this.symbolToAssetId.get(params.symbol);
      if (asset === undefined) {
        throw new Error(`Asset not found for symbol: ${params.symbol}`);
      }

      const result = await exchangeClient.cancel({
        cancels: [
          {
            a: asset,
            o: parseInt(params.orderId, 10),
          },
        ],
      });

      const success = result.response?.data?.statuses?.[0] === 'success';

      return {
        success,
        orderId: params.orderId,
        error: success ? undefined : 'Order cancellation failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrder', {
          orderId: params.orderId,
          coin: params.symbol,
        }),
      );
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Cancel multiple orders in a single batch API call
   * Optimized implementation that uses HyperLiquid's batch cancel endpoint
   */
  async cancelOrders(
    params: BatchCancelOrdersParams,
  ): Promise<CancelOrdersResult> {
    try {
      this.deps.debugLogger.log('Batch canceling orders:', {
        count: params.length,
      });

      if (params.length === 0) {
        return {
          success: false,
          successCount: 0,
          failureCount: 0,
          results: [],
        };
      }

      await this.ensureReady();

      // Explicitly ensure builder fee approval for trading
      await this.ensureBuilderFeeApproval();

      const exchangeClient = this.clientService.getExchangeClient();

      // Map orders to SDK format and validate coins
      const cancelRequests = params.map((order) => {
        const asset = this.symbolToAssetId.get(order.symbol);
        if (asset === undefined) {
          throw new Error(`Asset not found for symbol: ${order.symbol}`);
        }
        return {
          a: asset,
          o: parseInt(order.orderId, 10),
        };
      });

      // Single batch API call
      const result = await exchangeClient.cancel({
        cancels: cancelRequests,
      });

      // Parse response statuses (one per order)
      const statuses = result.response.data.statuses;
      const successCount = statuses.filter((s) => s === 'success').length;
      const failureCount = statuses.length - successCount;

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results: statuses.map((status, index) => ({
          orderId: params[index].orderId,
          symbol: params[index].symbol,
          success: status === 'success',
          error:
            status !== 'success'
              ? (status as { error: string }).error
              : undefined,
        })),
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrders', {
          orderCount: params.length,
        }),
      );
      // Return all orders as failed
      return {
        success: false,
        successCount: 0,
        failureCount: params.length,
        results: params.map((order) => ({
          orderId: order.orderId,
          symbol: order.symbol,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : PERPS_ERROR_CODES.BATCH_CANCEL_FAILED,
        })),
      };
    }
  }

  async closePositions(
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    // Declare outside try block so it's accessible in catch block
    let positionsToClose: Position[] = [];

    try {
      await this.ensureReady();

      // Explicitly ensure builder fee approval for trading
      await this.ensureBuilderFeeApproval();

      // Get all current positions
      // Force fresh API data (not WebSocket cache) since we're about to mutate positions
      const positions = await this.getPositions({ skipCache: true });

      // Filter positions based on params
      positionsToClose =
        params.closeAll || !params.symbols || params.symbols.length === 0
          ? positions
          : positions.filter((p) => params.symbols?.includes(p.symbol));

      this.deps.debugLogger.log('Batch closing positions:', {
        count: positionsToClose.length,
        closeAll: params.closeAll,
        coins: params.symbols,
      });

      if (positionsToClose.length === 0) {
        return {
          success: false,
          successCount: 0,
          failureCount: 0,
          results: [],
        };
      }

      // Get exchange client and meta for price/size formatting
      const exchangeClient = this.clientService.getExchangeClient();
      const infoClient = this.clientService.getInfoClient();

      // Pre-fetch meta for all unique DEXs to avoid N API calls in loop
      const uniqueDexs = [
        ...new Set(
          positionsToClose.map((p) => parseAssetName(p.symbol).dex || 'main'),
        ),
      ];
      await Promise.all(
        uniqueDexs.map((dex) =>
          this.getCachedMeta({ dexName: dex === 'main' ? null : dex }),
        ),
      );

      // Track HIP-3 positions and freed margins for post-close transfers
      const hip3Transfers: {
        sourceDex: string;
        freedMargin: number;
      }[] = [];

      // Build orders array
      const orders: SDKOrderParams[] = [];

      for (const position of positionsToClose) {
        // Extract DEX name for HIP-3 positions
        const { dex: dexName } = parseAssetName(position.symbol);
        const isHip3Position = position.symbol.includes(':');

        // Get asset info for formatting (uses cache populated above)
        const meta = await this.getCachedMeta({ dexName });

        const assetInfo = meta.universe.find(
          (asset) => asset.name === position.symbol,
        );
        if (!assetInfo) {
          throw new Error(
            `Asset ${position.symbol} not found in ${
              dexName || 'main'
            } DEX universe`,
          );
        }

        // Get asset ID
        const assetId = this.symbolToAssetId.get(position.symbol);
        if (assetId === undefined) {
          throw new Error(`Asset ID not found for ${position.symbol}`);
        }

        // Calculate position details (always full close)
        const positionSize = parseFloat(position.size);
        const isBuy = positionSize < 0; // Close opposite side
        const closeSize = Math.abs(positionSize);
        const totalMarginUsed = parseFloat(position.marginUsed);

        // Track HIP-3 transfers (full position close means all margin is freed)
        if (isHip3Position && dexName && !this.useDexAbstraction) {
          hip3Transfers.push({
            sourceDex: dexName,
            freedMargin: totalMarginUsed,
          });
        }

        // Get current price for market order slippage
        const mids = await infoClient.allMids({ dex: dexName ?? '' });
        const currentPrice = parseFloat(mids[position.symbol] || '0');
        if (currentPrice === 0) {
          throw new Error(`No price available for ${position.symbol}`);
        }

        // Calculate order price with slippage
        const slippage = ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps / 10000;
        const orderPrice = isBuy
          ? currentPrice * (1 + slippage)
          : currentPrice * (1 - slippage);

        // Format size and price
        const formattedSize = formatHyperLiquidSize({
          size: closeSize,
          szDecimals: assetInfo.szDecimals,
        });

        const formattedPrice = formatHyperLiquidPrice({
          price: orderPrice,
          szDecimals: assetInfo.szDecimals,
        });

        // Build reduce-only order
        orders.push({
          a: assetId,
          b: isBuy,
          p: formattedPrice,
          s: formattedSize,
          r: true, // reduceOnly
          t: { limit: { tif: 'Ioc' } }, // Immediate or cancel for market-like execution
        });
      }

      // Calculate discounted builder fee if reward discount is active
      let builderFee = BUILDER_FEE_CONFIG.MaxFeeTenthsBps;
      if (this.userFeeDiscountBips !== undefined) {
        builderFee = Math.floor(
          builderFee * (1 - this.userFeeDiscountBips / BASIS_POINTS_DIVISOR),
        );
      }

      // Single batch API call
      const result = await exchangeClient.order({
        orders,
        grouping: 'na',
        builder: {
          b: this.getBuilderAddress(this.clientService.isTestnetMode()),
          f: builderFee,
        },
      });

      // Parse response statuses (one per order)
      const statuses = result.response.data.statuses;
      const successCount = statuses.filter(
        (s) => isStatusObject(s) && ('filled' in s || 'resting' in s),
      ).length;
      const failureCount = statuses.length - successCount;

      // Handle HIP-3 margin transfers for successful closes
      if (!this.useDexAbstraction) {
        for (let i = 0; i < statuses.length; i++) {
          const status = statuses[i];
          const isSuccess =
            isStatusObject(status) &&
            ('filled' in status || 'resting' in status);

          if (isSuccess && hip3Transfers[i]) {
            const { sourceDex, freedMargin } = hip3Transfers[i];
            this.deps.debugLogger.log(
              'Position closed successfully, initiating manual auto-transfer back',
              { symbol: positionsToClose[i].symbol, freedMargin },
            );

            // Non-blocking: Transfer freed margin back to main DEX
            await this.autoTransferBackAfterClose({
              sourceDex,
              freedMargin,
            });
          }
        }
      }

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results: statuses.map((status, index) => ({
          symbol: positionsToClose[index].symbol,
          success:
            isStatusObject(status) &&
            ('filled' in status || 'resting' in status),
          error:
            isStatusObject(status) && 'error' in status
              ? String(status.error)
              : undefined,
        })),
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('closePositions', {
          positionCount: positionsToClose.length,
        }),
      );
      // Return all positions as failed
      return {
        success: false,
        successCount: 0,
        failureCount: positionsToClose.length,
        results: positionsToClose.map((position) => ({
          symbol: position.symbol,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : PERPS_ERROR_CODES.BATCH_CLOSE_FAILED,
        })),
      };
    }
  }

  /**
   * Update TP/SL for an existing position
   *
   * This creates new TP/SL orders for the position using 'positionTpsl' grouping.
   * These are separate orders that will close the position when triggered.
   *
   * Key differences from editOrder:
   * - editOrder: Modifies pending orders (before fill)
   * - updatePositionTPSL: Creates TP/SL orders for filled positions
   *
   * HyperLiquid supports two TP/SL types:
   * 1. 'normalTpsl' - Tied to a parent order (set when placing the order)
   * 2. 'positionTpsl' - Tied to a position (can be set/modified after fill)
   *
   * @param params.symbol - Asset symbol of the position
   * @param params.takeProfitPrice - TP price (undefined to remove)
   * @param params.stopLossPrice - SL price (undefined to remove)
   */
  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    try {
      this.deps.debugLogger.log('Updating position TP/SL:', params);

      const { symbol, takeProfitPrice, stopLossPrice } = params;

      // Explicitly ensure builder fee approval for trading
      await this.ensureReady();
      await this.ensureBuilderFeeApproval();

      // Get current position to validate it exists
      // Force fresh API data (not WebSocket cache) since we're about to mutate the position
      let positions: Position[];
      try {
        positions = await this.getPositions({ skipCache: true });
      } catch (error) {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('updatePositionTPSL > getPositions', {
            symbol,
          }),
        );
        throw error;
      }

      const position = positions.find((p) => p.symbol === symbol);

      if (!position) {
        throw new Error(`No position found for ${symbol}`);
      }

      const positionSize = Math.abs(parseFloat(position.size));
      const isLong = parseFloat(position.size) > 0;

      await this.ensureReady();

      // See ensureReady() - builder fee and referral are session-cached

      // Get current price for the asset
      const infoClient = this.clientService.getInfoClient();
      const exchangeClient = this.clientService.getExchangeClient();
      const userAddress = await this.walletService.getUserAddressWithDefault();

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(symbol);

      // Fetch current price for this asset's DEX
      const mids = await infoClient.allMids(
        dexName ? { dex: dexName } : undefined,
      );
      const currentPrice = parseFloat(mids[symbol] || '0');

      if (currentPrice === 0) {
        throw new Error(`No price available for ${symbol}`);
      }

      // Cancel existing TP/SL orders for this position across all DEXs
      this.deps.debugLogger.log(
        'Fetching open orders to cancel existing TP/SL...',
      );
      const orderResults = await this.queryUserDataAcrossDexs(
        { user: userAddress },
        (p) => infoClient.frontendOpenOrders(p),
      );

      // Combine orders from all DEXs
      const allOrders = orderResults.flatMap((result) => result.data);

      const tpslOrdersToCancel = allOrders.filter(
        (order) =>
          order.coin === symbol &&
          order.reduceOnly === true &&
          order.isPositionTpsl === !!TP_SL_CONFIG.UsePositionBoundTpsl &&
          order.isTrigger === true &&
          (order.orderType.includes('Take Profit') ||
            order.orderType.includes('Stop')),
      );

      if (tpslOrdersToCancel.length > 0) {
        this.deps.debugLogger.log(
          `Canceling ${tpslOrdersToCancel.length} existing TP/SL orders for ${symbol}`,
        );
        const assetId = this.symbolToAssetId.get(symbol);
        if (assetId === undefined) {
          throw new Error(`Asset ID not found for ${symbol}`);
        }
        const cancelRequests = tpslOrdersToCancel.map((order) => ({
          a: assetId,
          o: order.oid,
        }));

        const cancelResult = await exchangeClient.cancel({
          cancels: cancelRequests,
        });
        this.deps.debugLogger.log('Cancel result:', cancelResult);
      }

      // Get asset info (dexName already extracted above) - uses cache
      const meta = await this.getCachedMeta({ dexName });

      // Check if meta is an error response (string) or doesn't have universe property
      if (
        !meta ||
        typeof meta === 'string' ||
        !meta.universe ||
        !Array.isArray(meta.universe)
      ) {
        this.deps.debugLogger.log(
          'Failed to fetch metadata for asset mapping',
          {
            meta,
            dex: dexName || 'main',
          },
        );
        throw new Error(
          `Failed to fetch market metadata for DEX ${dexName || 'main'}`,
        );
      }

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find((asset) => asset.name === symbol);
      if (!assetInfo) {
        throw new Error(
          `Asset ${symbol} not found in ${dexName || 'main'} DEX universe`,
        );
      }

      const assetId = this.symbolToAssetId.get(symbol);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${symbol}`);
      }

      // Build orders array for TP/SL
      const orders: SDKOrderParams[] = [];

      const size = TP_SL_CONFIG.UsePositionBoundTpsl
        ? '0'
        : formatHyperLiquidSize({
            size: positionSize,
            szDecimals: assetInfo.szDecimals,
          });
      // Take Profit order
      if (takeProfitPrice) {
        const tpOrder: SDKOrderParams = {
          a: assetId,
          b: !isLong, // Opposite side to close position
          p: formatHyperLiquidPrice({
            price: parseFloat(takeProfitPrice),
            szDecimals: assetInfo.szDecimals,
          }),
          s: size,
          r: true, // Always reduce-only for position TP
          t: {
            trigger: {
              isMarket: false, // Limit order when triggered
              triggerPx: formatHyperLiquidPrice({
                price: parseFloat(takeProfitPrice),
                szDecimals: assetInfo.szDecimals,
              }),
              tpsl: 'tp',
            },
          },
        };
        orders.push(tpOrder);
      }

      // Stop Loss order
      if (stopLossPrice) {
        const slOrder: SDKOrderParams = {
          a: assetId,
          b: !isLong, // Opposite side to close position
          p: formatHyperLiquidPrice({
            price: parseFloat(stopLossPrice),
            szDecimals: assetInfo.szDecimals,
          }),
          s: size,
          r: true, // Always reduce-only for position SL
          t: {
            trigger: {
              isMarket: true, // Market order when triggered for faster execution
              triggerPx: formatHyperLiquidPrice({
                price: parseFloat(stopLossPrice),
                szDecimals: assetInfo.szDecimals,
              }),
              tpsl: 'sl',
            },
          },
        };
        orders.push(slOrder);
      }

      // If no new orders, we've just cancelled existing ones (clearing TP/SL)
      if (orders.length === 0) {
        this.deps.debugLogger.log(
          'No new TP/SL orders to place - existing ones cancelled',
        );
        return {
          success: true,
          // No orderId since we only cancelled orders, didn't place new ones
        };
      }

      // Calculate discounted builder fee if reward discount is active
      let builderFee = BUILDER_FEE_CONFIG.MaxFeeTenthsBps;
      if (this.userFeeDiscountBips !== undefined) {
        builderFee = Math.floor(
          builderFee * (1 - this.userFeeDiscountBips / BASIS_POINTS_DIVISOR),
        );
        this.deps.debugLogger.log(
          'HyperLiquid: Applying builder fee discount to TP/SL',
          {
            originalFee: BUILDER_FEE_CONFIG.MaxFeeTenthsBps,
            discountBips: this.userFeeDiscountBips,
            discountedFee: builderFee,
          },
        );
      }

      // Submit via SDK exchange client with positionTpsl grouping
      const result = await exchangeClient.order({
        orders,
        grouping: 'positionTpsl',
        builder: {
          b: this.getBuilderAddress(this.clientService.isTestnetMode()),
          f: builderFee,
        },
      });

      if (result.status !== 'ok') {
        throw new Error(`TP/SL update failed: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
        orderId: 'TP/SL orders placed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updatePositionTPSL', {
          symbol: params.symbol,
          hasTakeProfit: params.takeProfitPrice !== undefined,
          hasStopLoss: params.stopLossPrice !== undefined,
        }),
      );
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Close a position
   *
   * For HIP-3 positions, this method automatically transfers freed margin
   * back to the main DEX after successfully closing the position.
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    try {
      this.deps.debugLogger.log('Closing position:', params);

      // Explicitly ensure builder fee approval for trading
      await this.ensureReady();
      await this.ensureBuilderFeeApproval();

      // Force fresh API data (not WebSocket cache) since we're about to mutate the position
      const positions = await this.getPositions({ skipCache: true });
      const position = positions.find((p) => p.symbol === params.symbol);

      if (!position) {
        throw new Error(`No position found for ${params.symbol}`);
      }

      const positionSize = parseFloat(position.size);
      const isBuy = positionSize < 0;
      const closeSize = params.size || Math.abs(positionSize).toString();

      // Capture position details BEFORE closing for freed margin calculation
      const totalMarginUsed = parseFloat(position.marginUsed);
      const totalPositionSize = Math.abs(positionSize);
      const closeSizeNum = parseFloat(closeSize);
      const isHip3Position = position.symbol.includes(':');
      const hip3Dex = isHip3Position ? position.symbol.split(':')[0] : null;

      // Calculate freed margin proportionally
      const freedMarginRatio = closeSizeNum / totalPositionSize;
      const freedMargin = totalMarginUsed * freedMarginRatio;

      // Get current price for validation if not provided (and not a full close)
      // Full closes don't need price for validation
      let currentPrice = params.currentPrice;
      if (!currentPrice && params.size && !params.usdAmount) {
        // Partial close without USD or price: use limit price as fallback for validation
        // For limit orders, the limit price is a reasonable proxy for validation purposes
        if (params.price && params.orderType === 'limit') {
          currentPrice = parseFloat(params.price);
          this.deps.debugLogger.log(
            'Using limit price for close position validation (limit order)',
            {
              coin: params.symbol,
              currentPrice,
            },
          );
        }
        // Note: For market orders without usdAmount/currentPrice, validation will fail
        // with "price_required" error, which is correct behavior (prevents invalid orders)
      }

      this.deps.debugLogger.log('Position close details', {
        coin: position.symbol,
        isHip3Position,
        hip3Dex,
        totalMarginUsed,
        closedSize: closeSize,
        freedMargin: freedMargin.toFixed(2),
      });

      // Execute position close with consistent slippage handling
      const result = await this.placeOrder({
        symbol: params.symbol,
        isBuy,
        size: closeSize,
        orderType: params.orderType || 'market',
        price: params.price,
        reduceOnly: true,
        isFullClose: !params.size, // True if closing 100% (size not provided)
        // Pass through price and slippage parameters for consistent validation
        currentPrice,
        usdAmount: params.usdAmount,
        priceAtCalculation: params.priceAtCalculation,
        maxSlippageBps: params.maxSlippageBps,
      });

      // Return freed margin using native abstraction or programmatic transfer
      if (
        result.success &&
        isHip3Position &&
        hip3Dex &&
        !this.useDexAbstraction
      ) {
        this.deps.debugLogger.log(
          'Position closed successfully, initiating manual auto-transfer back',
        );

        // Non-blocking: Transfer freed margin back to main DEX
        await this.autoTransferBackAfterClose({
          sourceDex: hip3Dex,
          freedMargin,
        });
      } else if (
        result.success &&
        isHip3Position &&
        hip3Dex &&
        this.useDexAbstraction
      ) {
        this.deps.debugLogger.log(
          'Position closed - DEX abstraction will auto-return freed margin',
          {
            coin: params.symbol,
            dex: hip3Dex,
            note: 'HyperLiquid handles return automatically',
          },
        );
      }

      return result;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('closePosition', {
          coin: params.symbol,
          orderType: params.orderType,
        }),
      );
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Update margin for an existing position (add or remove)
   *
   * @param params - Margin adjustment parameters
   * @param params.symbol - Asset symbol (e.g., 'BTC', 'ETH')
   * @param params.amount - Amount to adjust as string (positive = add, negative = remove)
   * @returns Promise resolving to margin adjustment result
   *
   * Note: HyperLiquid uses micro-units (multiply by 1e6) for the ntli parameter.
   * The SDK's updateIsolatedMargin requires:
   * - asset: Asset ID (number)
   * - isBuy: Position direction (true for long, false for short)
   * - ntli: Amount in micro-units (amount * 1e6)
   */
  async updateMargin(params: {
    symbol: string;
    amount: string;
  }): Promise<MarginResult> {
    try {
      this.deps.debugLogger.log('Updating position margin:', params);

      const { symbol, amount } = params;

      // Ensure provider is ready
      await this.ensureReady();

      // Get current position to determine direction
      // Force fresh API data since we're about to mutate the position
      const positions = await this.getPositions({ skipCache: true });
      const position = positions.find((p) => p.symbol === symbol);

      if (!position) {
        throw new Error(`No position found for ${symbol}`);
      }

      // Determine position direction
      const isBuy = parseFloat(position.size) > 0; // true for long, false for short

      // Get asset ID for the symbol
      const assetId = this.symbolToAssetId.get(symbol);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${symbol}`);
      }

      // Convert amount to micro-units (HyperLiquid SDK requirement)
      const amountFloat = parseFloat(amount);
      const ntli = Math.floor(amountFloat * 1e6);

      this.deps.debugLogger.log('Margin adjustment details', {
        symbol,
        assetId,
        isBuy,
        amount: amountFloat,
        ntli,
      });

      // Call SDK to update isolated margin
      const exchangeClient = this.clientService.getExchangeClient();
      const result = await exchangeClient.updateIsolatedMargin({
        asset: assetId,
        isBuy,
        ntli,
      });

      this.deps.debugLogger.log('Margin update result:', result);

      if (result.status !== 'ok') {
        throw new Error(`Margin adjustment failed: ${JSON.stringify(result)}`);
      }

      return {
        success: true,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updateMargin', {
          symbol: params.symbol,
          amount: params.amount,
        }),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current positions with TP/SL prices
   *
   * Note on TP/SL orders:
   * - normalTpsl: TP/SL tied to parent order, only placed after parent fills
   * - positionTpsl: TP/SL tied to position, placed immediately
   *
   * This means TP/SL prices may not appear immediately after placing an order
   * with TP/SL. They will only show up once the parent order is filled and
   * the child TP/SL orders are actually placed on the order book.
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    try {
      // Try WebSocket cache first (unless explicitly bypassed)
      if (
        !params?.skipCache &&
        this.subscriptionService.isPositionsCacheInitialized()
      ) {
        const cachedPositions =
          this.subscriptionService.getCachedPositions() || [];
        this.deps.debugLogger.log('Using cached positions from WebSocket', {
          count: cachedPositions.length,
        });
        return cachedPositions;
      }

      // Fallback to API call
      this.deps.debugLogger.log(
        'Fetching positions via API',
        params?.skipCache ? '(skipCache requested)' : '(cache not initialized)',
      );

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Query positions and orders across all enabled DEXs in parallel
      const [stateResults, orderResults] = await Promise.all([
        this.queryUserDataAcrossDexs({ user: userAddress }, (p) =>
          infoClient.clearinghouseState(p),
        ),
        this.queryUserDataAcrossDexs({ user: userAddress }, (p) =>
          infoClient.frontendOpenOrders(p),
        ),
      ]);

      // Combine all orders from all DEXs for TP/SL lookup
      const allOrders = orderResults.flatMap((result) => result.data);

      this.deps.debugLogger.log('Frontend open orders (all DEXs):', {
        count: allOrders.length,
        orders: allOrders.map((o) => ({
          coin: o.coin,
          oid: o.oid,
          orderType: o.orderType,
          reduceOnly: o.reduceOnly,
          isTrigger: o.isTrigger,
          triggerPx: o.triggerPx,
          isPositionTpsl: o.isPositionTpsl,
          side: o.side,
          sz: o.sz,
        })),
      });

      // Combine and process positions from all DEXs
      const allPositions = stateResults.flatMap((result) =>
        result.data.assetPositions
          .filter((assetPos) => assetPos.position.szi !== '0')
          .map((assetPos) => {
            const position = adaptPositionFromSDK(assetPos);

            // Find TP/SL orders for this position
            // First check direct trigger orders (raw SDK uses 'coin', adapted position uses 'symbol')
            const positionOrders = allOrders.filter(
              (order) =>
                order.coin === position.symbol &&
                order.isTrigger &&
                order.reduceOnly,
            );

            // Also check for parent orders that might have TP/SL children
            const parentOrdersWithChildren = allOrders.filter(
              (order) =>
                order.coin === position.symbol &&
                order.children &&
                order.children.length > 0,
            );

            // Look for TP and SL trigger orders
            let takeProfitPrice: string | undefined;
            let stopLossPrice: string | undefined;

            // Check direct trigger orders
            positionOrders.forEach((order) => {
              // Frontend orders have explicit orderType field
              if (
                order.orderType === 'Take Profit Market' ||
                order.orderType === 'Take Profit Limit'
              ) {
                takeProfitPrice = order.triggerPx;
                this.deps.debugLogger.log(
                  `Found TP order for ${position.symbol}:`,
                  {
                    triggerPrice: order.triggerPx,
                    orderId: order.oid,
                    orderType: order.orderType,
                    isPositionTpsl: order.isPositionTpsl,
                  },
                );
              } else if (
                order.orderType === 'Stop Market' ||
                order.orderType === 'Stop Limit'
              ) {
                stopLossPrice = order.triggerPx;
                this.deps.debugLogger.log(
                  `Found SL order for ${position.symbol}:`,
                  {
                    triggerPrice: order.triggerPx,
                    orderId: order.oid,
                    orderType: order.orderType,
                    isPositionTpsl: order.isPositionTpsl,
                  },
                );
              }
            });

            // Check child orders (for normalTpsl grouping)
            parentOrdersWithChildren.forEach((parentOrder) => {
              this.deps.debugLogger.log(
                `Parent order with children for ${position.symbol}:`,
                {
                  parentOid: parentOrder.oid,
                  childrenCount: parentOrder.children.length,
                },
              );

              parentOrder.children.forEach((childOrderUnknown) => {
                const childOrder = childOrderUnknown as FrontendOrder;
                if (childOrder.isTrigger && childOrder.reduceOnly) {
                  if (
                    childOrder.orderType === 'Take Profit Market' ||
                    childOrder.orderType === 'Take Profit Limit'
                  ) {
                    takeProfitPrice = childOrder.triggerPx;
                    this.deps.debugLogger.log(
                      `Found TP child order for ${position.symbol}:`,
                      {
                        triggerPrice: childOrder.triggerPx,
                        orderId: childOrder.oid,
                        orderType: childOrder.orderType,
                      },
                    );
                  } else if (
                    childOrder.orderType === 'Stop Market' ||
                    childOrder.orderType === 'Stop Limit'
                  ) {
                    stopLossPrice = childOrder.triggerPx;
                    this.deps.debugLogger.log(
                      `Found SL child order for ${position.symbol}:`,
                      {
                        triggerPrice: childOrder.triggerPx,
                        orderId: childOrder.oid,
                        orderType: childOrder.orderType,
                      },
                    );
                  }
                }
              });
            });

            return {
              ...position,
              takeProfitPrice,
              stopLossPrice,
            };
          }),
      );

      return allPositions;
    } catch (error) {
      this.deps.debugLogger.log('Error getting positions:', error);
      return [];
    }
  }

  /**
   * Get historical user fills (trade executions)
   */
  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    try {
      this.deps.debugLogger.log(
        'Getting user fills via HyperLiquid SDK:',
        params,
      );

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Use userFillsByTime when startTime is provided for time-filtered queries,
      // otherwise use userFills for backward compatibility
      const rawFills = params?.startTime
        ? await infoClient.userFillsByTime({
            user: userAddress,
            startTime: params.startTime,
            endTime: params.endTime,
            aggregateByTime: params?.aggregateByTime || false,
          })
        : await infoClient.userFills({
            user: userAddress,
            aggregateByTime: params?.aggregateByTime || false,
          });

      this.deps.debugLogger.log('User fills received:', rawFills);

      // Transform HyperLiquid fills to abstract OrderFill type
      const fills = (rawFills || []).reduce((acc: OrderFill[], fill) => {
        // Perps only, no Spots
        if (!['Buy', 'Sell'].includes(fill.dir)) {
          acc.push({
            orderId: fill.oid?.toString() || '',
            symbol: fill.coin,
            side: fill.side === 'A' ? 'sell' : 'buy',
            startPosition: fill.startPosition,
            size: fill.sz,
            price: fill.px,
            fee: fill.fee,
            feeToken: fill.feeToken,
            timestamp: fill.time,
            pnl: fill.closedPnl,
            direction: fill.dir,
            success: true,
            liquidation: fill.liquidation
              ? {
                  liquidatedUser: fill.liquidation.liquidatedUser,
                  markPx: fill.liquidation.markPx,
                  method: fill.liquidation.method,
                }
              : undefined,
          });
        }

        return acc;
      }, []);

      return fills;
    } catch (error) {
      this.deps.debugLogger.log('Error getting user fills:', error);
      return [];
    }
  }

  /**
   * Get historical orders (order lifecycle)
   */
  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    try {
      this.deps.debugLogger.log(
        'Getting user orders via HyperLiquid SDK:',
        params,
      );

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      const rawOrders = await infoClient.historicalOrders({
        user: userAddress,
      });

      this.deps.debugLogger.log('User orders received:', rawOrders);

      // Transform HyperLiquid orders to abstract Order type
      const orders: Order[] = (rawOrders || []).map((rawOrder) => {
        const { order, status, statusTimestamp } = rawOrder;
        // Normalize side: HyperLiquid uses 'A' (Ask/Sell) and 'B' (Bid/Buy)
        const normalizedSide = order.side === 'B' ? 'buy' : 'sell';

        // Normalize status
        let normalizedStatus: Order['status'];
        switch (status) {
          case 'open':
            normalizedStatus = 'open';
            break;
          case 'filled':
            normalizedStatus = 'filled';
            break;
          case 'canceled':
          case 'marginCanceled':
          case 'vaultWithdrawalCanceled':
          case 'openInterestCapCanceled':
          case 'selfTradeCanceled':
          case 'reduceOnlyCanceled':
          case 'siblingFilledCanceled':
          case 'delistedCanceled':
          case 'liquidatedCanceled':
          case 'scheduledCancel':
          case 'reduceOnlyRejected':
            normalizedStatus = 'canceled';
            break;
          case 'rejected':
            // case 'minTradeNtlRejected':
            normalizedStatus = 'rejected';
            break;
          case 'triggered':
            normalizedStatus = 'triggered';
            break;
          default:
            normalizedStatus = 'queued';
        }

        // Calculate filled and remaining size
        const originalSize = parseFloat(order.origSz || order.sz);
        const currentSize = parseFloat(order.sz);
        const filledSize = originalSize - currentSize;

        return {
          orderId: order.oid?.toString() || '',
          symbol: order.coin,
          side: normalizedSide,
          orderType: order.orderType?.toLowerCase().includes('limit')
            ? 'limit'
            : 'market',
          size: order.sz,
          originalSize: order.origSz || order.sz,
          price: order.limitPx || '0',
          filledSize: filledSize.toString(),
          remainingSize: currentSize.toString(),
          status: normalizedStatus,
          timestamp: statusTimestamp,
          lastUpdated: statusTimestamp,
          detailedOrderType: order.orderType, // Full order type from exchange (e.g., 'Take Profit Limit', 'Stop Market')
          isTrigger: order.isTrigger,
          reduceOnly: order.reduceOnly,
        };
      });

      return orders;
    } catch (error) {
      this.deps.debugLogger.log('Error getting user orders:', error);
      return [];
    }
  }

  /**
   * Get currently open orders (real-time status)
   * Uses frontendOpenOrders API to get only currently active orders
   * Aggregates orders from all enabled DEXs (main + HIP-3)
   */
  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    try {
      // Try WebSocket cache first (unless explicitly bypassed)
      if (
        !params?.skipCache &&
        this.subscriptionService.isOrdersCacheInitialized()
      ) {
        const cachedOrders = this.subscriptionService.getCachedOrders() || [];
        this.deps.debugLogger.log('Using cached open orders from WebSocket', {
          count: cachedOrders.length,
        });
        return cachedOrders;
      }

      // Fallback to API call
      this.deps.debugLogger.log(
        'Fetching open orders via API',
        params?.skipCache ? '(skipCache requested)' : '(cache not initialized)',
      );

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Query orders across all enabled DEXs in parallel
      const orderResults = await this.queryUserDataAcrossDexs(
        { user: userAddress },
        (p) => infoClient.frontendOpenOrders(p),
      );

      // Combine all orders from all DEXs
      const rawOrders = orderResults.flatMap((result) => result.data);

      // Get positions for order context (already multi-DEX aware)
      const positions = await this.getPositions();

      this.deps.debugLogger.log('Currently open orders received (all DEXs):', {
        count: rawOrders.length,
      });

      // Transform HyperLiquid open orders to abstract Order type using adapter
      // Raw SDK orders use 'coin', adapted positions use 'symbol'
      const orders: Order[] = (rawOrders || []).map((order) => {
        const position = positions.find((p) => p.symbol === order.coin);
        return adaptOrderFromSDK(order, position);
      });

      return orders;
    } catch (error) {
      this.deps.debugLogger.log('Error getting currently open orders:', error);
      return [];
    }
  }

  /**
   * Get user funding history
   */
  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    try {
      this.deps.debugLogger.log(
        'Getting user funding via HyperLiquid SDK:',
        params,
      );

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // HyperLiquid API requires startTime to be a number (not undefined)
      // Default to configured days ago to get recent funding payments
      // Using 0 (epoch) would return oldest 500 records, missing latest payments
      const defaultStartTime =
        Date.now() -
        PERPS_TRANSACTIONS_HISTORY_CONSTANTS.DEFAULT_FUNDING_HISTORY_DAYS *
          24 *
          60 *
          60 *
          1000;
      const rawFunding = await infoClient.userFunding({
        user: userAddress,
        startTime: params?.startTime ?? defaultStartTime,
        endTime: params?.endTime,
      });

      this.deps.debugLogger.log('User funding received:', rawFunding);

      // Transform HyperLiquid funding to abstract Funding type
      const funding: Funding[] = (rawFunding || []).map((rawFundingItem) => {
        const { delta, hash, time } = rawFundingItem;

        return {
          symbol: delta.coin,
          amountUsd: delta.usdc,
          rate: delta.fundingRate,
          timestamp: time,
          transactionHash: hash,
        };
      });

      return funding;
    } catch (error) {
      this.deps.debugLogger.log('Error getting user funding:', error);
      return [];
    }
  }

  /**
   * Get user non-funding ledger updates (deposits, transfers, withdrawals)
   */
  async getUserNonFundingLedgerUpdates(params?: {
    accountId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<RawHyperLiquidLedgerUpdate[]> {
    try {
      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId as CaipAccountId | undefined,
      );

      const rawLedgerUpdates = await infoClient.userNonFundingLedgerUpdates({
        user: userAddress as `0x${string}`,
        startTime: params?.startTime || 0,
        endTime: params?.endTime,
      });

      return rawLedgerUpdates || [];
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getUserNonFundingLedgerUpdates', params),
      );
      return [];
    }
  }

  /**
   * Get user history (deposits, withdrawals, transfers)
   */
  async getUserHistory(params?: {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
  }): Promise<UserHistoryItem[]> {
    try {
      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      const rawLedgerUpdates = await infoClient.userNonFundingLedgerUpdates({
        user: userAddress,
        startTime: params?.startTime || 0,
        endTime: params?.endTime,
      });

      // Transform the raw ledger updates to UserHistoryItem format
      return adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawLedgerUpdates);
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getUserHistory'),
      );
      return [];
    }
  }

  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    try {
      this.deps.debugLogger.log(
        'Getting historical portfolio via HyperLiquid SDK:',
        params,
      );

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Get portfolio data
      const portfolioData = await infoClient.portfolio({
        user: userAddress,
      });

      // Calculate target time (default to 24 hours ago)
      const targetTime = Date.now() - 24 * 60 * 60 * 1000;

      // Get UTC 00:00 of the target day
      const targetDate = new Date(targetTime);
      const targetTimestamp = targetDate.getTime();

      // Get the account value history from the last week's data
      const weeklyPeriod = portfolioData?.[1];
      const weekData = weeklyPeriod?.[1];
      const accountValueHistory = weekData?.accountValueHistory || [];

      // Find entries that are before the target timestamp, then get the closest one
      const entriesBeforeTarget = accountValueHistory.filter(
        ([timestamp]) => timestamp < targetTimestamp,
      );

      let closestEntry = null;
      let smallestDiff = Infinity;
      for (const entry of entriesBeforeTarget) {
        const [timestamp] = entry;
        const diff = targetTimestamp - timestamp;
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closestEntry = entry;
        }
      }

      const result: HistoricalPortfolioResult = closestEntry
        ? {
            accountValue1dAgo: closestEntry[1] || '0',
            timestamp: closestEntry[0] || 0,
          }
        : {
            accountValue1dAgo:
              accountValueHistory?.[accountValueHistory.length - 1]?.[1] || '0',
            timestamp: 0,
          };

      this.deps.debugLogger.log('Historical portfolio result:', result);
      return result;
    } catch (error) {
      this.deps.debugLogger.log('Error getting historical portfolio:', error);
      return {
        accountValue1dAgo: '0',
        timestamp: 0,
      };
    }
  }

  /**
   * Get account state
   * Aggregates balances across all enabled DEXs (main + HIP-3)
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    try {
      this.deps.debugLogger.log('Getting account state via HyperLiquid SDK');

      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      this.deps.debugLogger.log('User address for account state:', userAddress);
      this.deps.debugLogger.log(
        'Network mode:',
        this.clientService.isTestnetMode() ? 'TESTNET' : 'MAINNET',
      );

      // Get Spot balance (global, not DEX-specific) and Perps states across all DEXs
      const [spotState, perpsStateResults] = await Promise.all([
        infoClient.spotClearinghouseState({ user: userAddress }),
        this.queryUserDataAcrossDexs({ user: userAddress }, (p) =>
          infoClient.clearinghouseState(p),
        ),
      ]);

      this.deps.debugLogger.log('Spot state:', spotState);
      this.deps.debugLogger.log('Perps states (all DEXs):', {
        dexCount: perpsStateResults.length,
      });

      // Aggregate account states from all DEXs
      // Each DEX has independent positions and margin, we sum them
      const aggregatedAccountState = perpsStateResults.reduce(
        (acc, result, index) => {
          const { dex, data: perpsState } = result;

          // Adapt this DEX's state (without spot - we'll add spot once at the end)
          const dexAccountState = adaptAccountStateFromSDK(perpsState);

          // Log each DEX contribution
          this.deps.debugLogger.log(`DEX ${dex || 'main'} account state:`, {
            totalBalance: dexAccountState.totalBalance,
            availableBalance: dexAccountState.availableBalance,
            marginUsed: dexAccountState.marginUsed,
            unrealizedPnl: dexAccountState.unrealizedPnl,
          });

          // Sum up numeric values across all DEXs
          if (index === 0) {
            // First DEX - initialize with its values
            return dexAccountState;
          }

          // Subsequent DEXs - aggregate
          return {
            availableBalance: (
              parseFloat(acc.availableBalance) +
              parseFloat(dexAccountState.availableBalance)
            ).toString(),
            totalBalance: (
              parseFloat(acc.totalBalance) +
              parseFloat(dexAccountState.totalBalance)
            ).toString(),
            marginUsed: (
              parseFloat(acc.marginUsed) +
              parseFloat(dexAccountState.marginUsed)
            ).toString(),
            unrealizedPnl: (
              parseFloat(acc.unrealizedPnl) +
              parseFloat(dexAccountState.unrealizedPnl)
            ).toString(),
            // Return on equity is weighted average, but for simplicity we'll recalculate
            // ROE = (unrealizedPnl / marginUsed) * 100
            returnOnEquity: '0', // Will recalculate below
          };
        },
        {
          availableBalance: '0',
          totalBalance: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
        } as AccountState,
      );

      // Recalculate return on equity across all DEXs
      const totalMarginUsed = parseFloat(aggregatedAccountState.marginUsed);
      const totalUnrealizedPnl = parseFloat(
        aggregatedAccountState.unrealizedPnl,
      );
      if (totalMarginUsed > 0) {
        aggregatedAccountState.returnOnEquity = (
          (totalUnrealizedPnl / totalMarginUsed) *
          100
        ).toFixed(1);
      } else {
        aggregatedAccountState.returnOnEquity = '0';
      }

      // Add spot balance to totalBalance (spot is global, not per-DEX)
      let spotBalance = 0;
      if (spotState?.balances && Array.isArray(spotState.balances)) {
        spotBalance = spotState.balances.reduce(
          (sum, balance) => sum + parseFloat(balance.total || '0'),
          0,
        );
      }
      aggregatedAccountState.totalBalance = (
        parseFloat(aggregatedAccountState.totalBalance) + spotBalance
      ).toString();

      // Build per-sub-account breakdown (HIP-3 DEXs map to sub-accounts)
      const subAccountBreakdown: Record<
        string,
        { availableBalance: string; totalBalance: string }
      > = {};
      perpsStateResults.forEach((result) => {
        const { dex, data: perpsState } = result;
        const dexAccountState = adaptAccountStateFromSDK(perpsState);
        const subAccountKey = dex || ''; // Empty string for main DEX

        subAccountBreakdown[subAccountKey] = {
          availableBalance: dexAccountState.availableBalance,
          totalBalance: dexAccountState.totalBalance,
        };
      });

      // Add sub-account breakdown to result
      aggregatedAccountState.subAccountBreakdown = subAccountBreakdown;

      this.deps.debugLogger.log(
        'Aggregated account state:',
        aggregatedAccountState,
      );

      return aggregatedAccountState;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getAccountState', {
          accountId: params?.accountId,
        }),
      );
      // Re-throw the error so the controller can handle it properly
      // This allows the UI to show proper error messages instead of zeros
      throw error;
    }
  }

  /**
   * Get available markets with multi-DEX aggregation support (HIP-3)
   * Handles three query patterns:
   * 1. Symbol filtering: Groups symbols by DEX, fetches in parallel
   * 2. Multi-DEX aggregation: Fetches from all enabled DEXs when no specific DEX requested
   * 3. Single DEX query: Fetches from main or specific DEX
   * @param params - Optional parameters for filtering
   */
  async getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]> {
    try {
      // Path 0: Read-only mode for lightweight discovery queries
      // Creates a standalone InfoClient without requiring full initialization
      // No wallet, WebSocket, or account setup needed - just HTTP API call
      // Use for discovery use cases like checking if a perps market exists
      if (params?.readOnly) {
        this.deps.debugLogger.log(
          'HyperLiquidProvider: Getting markets in readOnly mode (standalone client)',
          { symbolCount: params?.symbols?.length },
        );

        // Create standalone client - bypasses all initialization (wallet, WebSocket, etc.)
        const standaloneInfoClient = createStandaloneInfoClient({
          isTestnet: this.clientService.isTestnetMode(),
        });

        // Simple path: fetch main DEX markets only (no HIP-3 multi-DEX)
        const meta = await standaloneInfoClient.meta();

        if (!meta?.universe || !Array.isArray(meta.universe)) {
          throw new Error(
            'Invalid universe data received from HyperLiquid API',
          );
        }

        // Transform to MarketInfo format
        const markets = meta.universe.map((asset) => adaptMarketFromSDK(asset));

        // Filter by symbols if provided
        if (params?.symbols?.length) {
          return markets.filter((market) =>
            params.symbols?.some(
              (symbol) => market.name.toUpperCase() === symbol.toUpperCase(),
            ),
          );
        }

        return markets;
      }

      // Ensure full initialization including asset mapping
      // This is deduplicated - concurrent calls wait for the same promise
      await this.ensureReady();

      // Path 1: Symbol filtering - group by DEX and fetch in parallel
      if (params?.symbols && params.symbols.length > 0) {
        this.deps.debugLogger.log(
          'HyperLiquidProvider: Getting markets with symbol filter',
          {
            symbolCount: params.symbols.length,
          },
        );

        // Group symbols by DEX
        const symbolsByDex = new Map<string | null, string[]>();
        params.symbols.forEach((symbol) => {
          const { dex } = parseAssetName(symbol);
          const existing = symbolsByDex.get(dex);
          if (existing) {
            existing.push(symbol);
          } else {
            symbolsByDex.set(dex, [symbol]);
          }
        });

        // Query each unique DEX in parallel (with caching)
        const marketArrays = await Promise.all(
          Array.from(symbolsByDex.keys()).map(async (dex) =>
            this.fetchMarketsForDex({
              dex,
              skipFilters: params?.skipFilters,
            }),
          ),
        );

        // Combine and filter by requested symbols
        const allMarkets = marketArrays.flat();
        return allMarkets.filter((market) =>
          params.symbols?.some(
            (symbol) => market.name.toLowerCase() === symbol.toLowerCase(),
          ),
        );
      }

      // Path 2: Multi-DEX aggregation - fetch from all enabled DEXs
      if (!params?.dex && this.hip3Enabled) {
        // Determine which DEXs to query based on skipFilters flag
        const dexsToQuery = params?.skipFilters
          ? await this.getAllAvailableDexs()
          : await this.getValidatedDexs();

        if (dexsToQuery.length > 1) {
          // More than just main DEX
          this.deps.debugLogger.log(
            'HyperLiquidProvider: Fetching markets from DEXs',
            {
              dexCount: dexsToQuery.length,
              skipFilters: params?.skipFilters || false,
            },
          );

          const marketArrays = await Promise.all(
            dexsToQuery.map(async (dex) => {
              try {
                return await this.fetchMarketsForDex({
                  dex,
                  skipFilters: params?.skipFilters,
                });
              } catch (error) {
                this.deps.logger.error(
                  ensureError(error),
                  this.getErrorContext('getMarkets.multiDex', {
                    dex: dex ?? 'main',
                  }),
                );
                return []; // Continue with other DEXs on error
              }
            }),
          );

          return marketArrays.flat();
        }
      }

      // Path 3: Single DEX query (main DEX or specific DEX) - with caching
      this.deps.debugLogger.log(
        'HyperLiquidProvider: Getting markets for single DEX',
        {
          dex: params?.dex || 'main',
        },
      );

      return await this.fetchMarketsForDex({
        dex: params?.dex ?? null,
        skipFilters: params?.skipFilters,
      });
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getMarkets', {
          dex: params?.dex,
          symbolCount: params?.symbols?.length,
        }),
      );
      return [];
    }
  }

  /**
   * Get list of available HIP-3 DEXs that have markets
   * Useful for debugging and manual DEX selection
   * @returns Array of DEX names (excluding main DEX)
   */
  async getAvailableHip3Dexs(): Promise<string[]> {
    try {
      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      if (!this.hip3Enabled) {
        this.deps.debugLogger.log('HIP-3 disabled, no DEXs available');
        return [];
      }

      const infoClient = this.clientService.getInfoClient();

      // Get all DEXs from API
      const allDexs = await infoClient.perpDexs();

      if (!allDexs || !Array.isArray(allDexs)) {
        this.deps.debugLogger.log('perpDexs() returned invalid data');
        return [];
      }

      // Extract HIP-3 DEX names (filter out null which is main DEX)
      const hip3DexNames: string[] = [];
      allDexs.forEach((dex) => {
        if (dex !== null && 'name' in dex) {
          hip3DexNames.push(dex.name);
        }
      });

      this.deps.debugLogger.log(
        `Found ${hip3DexNames.length} HIP-3 DEXs from perpDexs() API`,
      );

      // Filter to only DEXs that have markets
      const dexsWithMarkets: string[] = [];
      await Promise.all(
        hip3DexNames.map(async (dexName) => {
          try {
            const meta = await this.getCachedMeta({ dexName });
            if (
              meta.universe &&
              Array.isArray(meta.universe) &&
              meta.universe.length > 0
            ) {
              dexsWithMarkets.push(dexName);
              this.deps.debugLogger.log(
                `  ✅ ${dexName}: ${meta.universe.length} markets`,
              );
            } else {
              this.deps.debugLogger.log(`  ⚠️ ${dexName}: no markets`);
            }
          } catch (error) {
            this.deps.debugLogger.log(`  ❌ ${dexName}: error querying`, error);
          }
        }),
      );

      this.deps.debugLogger.log(
        `${dexsWithMarkets.length} DEXs have markets:`,
        dexsWithMarkets,
      );
      return dexsWithMarkets.sort((a, b) => a.localeCompare(b));
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getAvailableHip3Dexs'),
      );
      return [];
    }
  }

  /**
   * Get market data with prices, volumes, and 24h changes
   * Aggregates data from all enabled DEXs (main + HIP-3) when equity is enabled
   *
   * Note: This is called once during initialization and cached by PerpsStreamManager.
   * Real-time price updates come from WebSocket subscriptions, not this method.
   */
  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    this.deps.debugLogger.log(
      'Getting market data with prices via HyperLiquid SDK',
    );

    // Ensure asset mapping is built first (populates meta cache)
    // This guarantees buildAssetMapping has run before we check cache,
    // eliminating duplicate metaAndAssetCtxs API calls from race conditions
    await this.ensureReady();

    const infoClient = this.clientService.getInfoClient();

    // Get enabled DEXs respecting feature flags (uses cached perpDexs)
    const enabledDexs = await this.getValidatedDexs();

    // Fetch meta, assetCtxs, and allMids for each enabled DEX in parallel
    // Optimization: Check cache first to avoid redundant API calls when buildAssetMapping
    // has already fetched, or populate cache for buildAssetMapping to reuse
    const dexDataResults = await Promise.all(
      enabledDexs.map(async (dex) => {
        const dexKey = dex ?? '';
        const dexParam = dex ?? '';
        try {
          let meta: MetaResponse | null = null;
          let assetCtxs: PerpsAssetCtx[] = [];

          // Check if meta is already cached (e.g., from previous fetch or buildAssetMapping)
          const cachedMeta = this.cachedMetaByDex.get(dexKey);
          if (cachedMeta) {
            this.deps.debugLogger.log(
              `[getMarketDataWithPrices] Using cached meta for ${dex || 'main'}`,
              { universeSize: cachedMeta.universe.length },
            );
            meta = cachedMeta;
            // Try to get cached assetCtxs from subscription service
            const cachedCtxs =
              this.subscriptionService.getDexAssetCtxsCache(dexKey);
            if (cachedCtxs) {
              assetCtxs = cachedCtxs;
            } else {
              // Need fresh assetCtxs, fetch via metaAndAssetCtxs (meta will be same)
              const metaAndCtxs = await infoClient.metaAndAssetCtxs(
                dexParam ? { dex: dexParam } : undefined,
              );
              assetCtxs = metaAndCtxs?.[1] || [];
              // Cache assetCtxs for future calls
              this.subscriptionService.setDexAssetCtxsCache(dexKey, assetCtxs);
            }
          } else {
            // Cache miss - fetch and populate cache for buildAssetMapping to reuse
            this.deps.debugLogger.log(
              `[getMarketDataWithPrices] Cache miss for ${dex || 'main'}, fetching`,
            );
            const metaAndCtxs = await infoClient.metaAndAssetCtxs(
              dexParam ? { dex: dexParam } : undefined,
            );
            meta = metaAndCtxs?.[0] || null;
            assetCtxs = metaAndCtxs?.[1] || [];

            // IMPORTANT: Populate cache for buildAssetMapping and other methods to reuse
            if (meta?.universe) {
              this.cachedMetaByDex.set(dexKey, meta);
              this.subscriptionService.setDexMetaCache(dexKey, meta);
              // Also cache assetCtxs for consistency with buildAssetMapping
              this.subscriptionService.setDexAssetCtxsCache(dexKey, assetCtxs);
              this.deps.debugLogger.log(
                `[getMarketDataWithPrices] Cached meta for ${dex || 'main'}`,
                { universeSize: meta.universe.length },
              );
            }
          }

          // Always fetch fresh allMids for current prices
          const dexAllMids = await infoClient.allMids(
            dexParam ? { dex: dexParam } : undefined,
          );

          return {
            dex,
            meta,
            assetCtxs,
            allMids: dexAllMids || {},
            success: true,
          };
        } catch (error) {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('getMarketDataWithPrices.fetchDex', {
              dex: dex ?? 'main',
            }),
          );
          return {
            dex,
            meta: null,
            assetCtxs: [],
            allMids: {},
            success: false,
          };
        }
      }),
    );

    // Combine universe, assetCtxs, and allMids from all DEXs
    const combinedUniverse: MetaResponse['universe'] = [];
    const combinedAssetCtxs: PerpsAssetCtx[] = [];
    const combinedAllMids: Record<string, string> = {};

    dexDataResults.forEach((result) => {
      if (result.success && result.meta?.universe) {
        // Apply market filtering for HIP-3 DEXs only (main DEX returns all markets)
        const marketsFromDex = result.meta.universe;
        const filteredMarkets =
          result.dex === null
            ? marketsFromDex // Main DEX: no filtering
            : marketsFromDex.filter((asset) =>
                shouldIncludeMarket(
                  asset.name,
                  result.dex,
                  this.hip3Enabled,
                  this.compiledAllowlistPatterns,
                  this.compiledBlocklistPatterns,
                ),
              );

        combinedUniverse.push(...filteredMarkets);
        combinedAssetCtxs.push(...result.assetCtxs);
        // Merge price data from this DEX into combined prices
        Object.assign(combinedAllMids, result.allMids);
      }
    });

    if (combinedUniverse.length === 0) {
      throw new Error('Failed to fetch market data - no markets available');
    }

    this.deps.debugLogger.log(
      'HyperLiquidProvider: Aggregated market data from all DEXs',
      {
        dexCount: enabledDexs.length,
        totalMarkets: combinedUniverse.length,
        mainDexMarkets: dexDataResults[0]?.meta?.universe?.length || 0,
        hip3Markets:
          combinedUniverse.length -
          (dexDataResults[0]?.meta?.universe?.length || 0),
      },
    );

    // Debug: Log combinedAllMids to diagnose price lookup issues
    const hip3Keys = Object.keys(combinedAllMids).filter((k) =>
      k.includes(':'),
    );
    this.deps.debugLogger.log('Combined allMids price data:', {
      totalKeys: Object.keys(combinedAllMids).length,
      allKeys: Object.keys(combinedAllMids),
      hip3Keys,
      hip3Prices: Object.fromEntries(
        hip3Keys.map((key) => [key, combinedAllMids[key]]),
      ),
      samplePrices: Object.fromEntries(
        Object.entries(combinedAllMids).slice(0, 5),
      ),
    });

    // Transform to UI-friendly format using standalone utility
    return transformMarketData(
      {
        universe: combinedUniverse,
        assetCtxs: combinedAssetCtxs,
        allMids: combinedAllMids,
      },
      HIP3_ASSET_MARKET_TYPES,
    );
  }

  /**
   * Validate deposit parameters according to HyperLiquid-specific rules
   * This method enforces protocol-specific requirements like minimum amounts
   */
  async validateDeposit(
    params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return validateDepositParams({
      amount: params.amount,
      assetId: params.assetId,
      isTestnet: this.clientService.isTestnetMode(),
    });
  }

  /**
   * Validate order parameters according to HyperLiquid-specific rules
   * This includes minimum order sizes, leverage limits, and other protocol requirements
   */
  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Basic parameter validation
      const basicValidation = validateOrderParams({
        coin: params.symbol,
        size: params.size,
        price: params.price,
        orderType: params.orderType,
      });
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Check minimum order size using consistent defaults (matching useMinimumOrderAmount hook)
      // Note: For full validation with market-specific limits, use async methods
      const minimumOrderSize = this.clientService.isTestnetMode()
        ? TRADING_DEFAULTS.amount.testnet
        : TRADING_DEFAULTS.amount.mainnet;

      // Skip USD validation and minimum check for full closes (100% position close)
      if (params.reduceOnly && params.isFullClose) {
        this.deps.debugLogger.log(
          'Full close detected: skipping USD validation and $10 minimum',
        );
      } else {
        // Calculate order value in USD for minimum validation
        let orderValueUSD: number;

        if (params.usdAmount) {
          // Preferred: Use provided USD amount (source of truth, no rounding loss)
          orderValueUSD = parseFloat(params.usdAmount);

          this.deps.debugLogger.log(
            'Validating USD amount (source of truth):',
            {
              usdAmount: orderValueUSD,
              minimumRequired: minimumOrderSize,
            },
          );
        } else {
          // Fallback: Calculate from size × price
          const size = parseFloat(params.size || '0');
          let priceForValidation = params.currentPrice;

          // For limit orders without currentPrice, use limit price as fallback
          if (
            !priceForValidation &&
            params.price &&
            params.orderType === 'limit'
          ) {
            priceForValidation = parseFloat(params.price);
            this.deps.debugLogger.log(
              'Using limit price for order validation (limit order):',
              {
                size,
                limitPrice: priceForValidation,
              },
            );
          }

          if (!priceForValidation) {
            return {
              isValid: false,
              error: PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED,
            };
          }

          orderValueUSD = size * priceForValidation;

          this.deps.debugLogger.log('Validating calculated USD from size:', {
            size,
            price: priceForValidation,
            calculatedUsd: orderValueUSD,
            minimumRequired: minimumOrderSize,
          });
        }

        // Validate minimum order size
        if (orderValueUSD < minimumOrderSize) {
          return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SIZE_MIN,
          };
        }
      }

      // Asset-specific leverage validation
      if (params.leverage && params.symbol) {
        try {
          const maxLeverage = await this.getMaxLeverage(params.symbol);
          if (params.leverage < 1 || params.leverage > maxLeverage) {
            return {
              isValid: false,
              error: PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID,
            };
          }
        } catch (error) {
          // Log the error before falling back
          this.deps.debugLogger.log(
            'Failed to get max leverage for symbol',
            error,
          );
          // If we can't get max leverage, use the default as fallback
          const defaultMaxLeverage = PERPS_CONSTANTS.DefaultMaxLeverage;
          if (params.leverage < 1 || params.leverage > defaultMaxLeverage) {
            return {
              isValid: false,
              error: PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID,
            };
          }
        }
      }

      // Check if order leverage meets existing position requirement (HyperLiquid protocol constraint)
      if (
        params.leverage &&
        params.existingPositionLeverage &&
        params.leverage < params.existingPositionLeverage
      ) {
        return {
          isValid: false,
          error: PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION,
        };
      }

      // Validate order value against max limits
      if (params.currentPrice && params.leverage) {
        try {
          const maxLeverage = await this.getMaxLeverage(params.symbol);

          const maxOrderValue = getMaxOrderValue(maxLeverage, params.orderType);
          const orderValue = parseFloat(params.size) * params.currentPrice;

          if (orderValue > maxOrderValue) {
            return {
              isValid: false,
              error: PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED,
            };
          }
        } catch (error) {
          this.deps.debugLogger.log(
            'Failed to validate max order value',
            error,
          );
          // Continue without max order validation if we can't get leverage
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Validate close position parameters according to HyperLiquid-specific rules
   * Note: Full validation including remaining position size requires position data
   * which should be passed from the UI layer
   */
  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Basic validation
      if (!params.symbol) {
        return {
          isValid: false,
          error: PERPS_ERROR_CODES.ORDER_COIN_REQUIRED,
        };
      }

      // If closing with limit order, must have price
      if (params.orderType === 'limit' && !params.price) {
        return {
          isValid: false,
          error: PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
        };
      }

      // Determine minimum order size (needed for precedence logic)
      const minimumOrderSize = this.clientService.isTestnetMode()
        ? TRADING_DEFAULTS.amount.testnet
        : TRADING_DEFAULTS.amount.mainnet;

      // Validate close size & minimum only if size provided (partial close)
      if (params.size) {
        const closeSize = parseFloat(params.size);
        const price = params.currentPrice
          ? parseFloat(params.currentPrice.toString())
          : undefined;
        const orderValueUSD =
          price && !isNaN(closeSize) ? closeSize * price : undefined;

        // Precedence rule: if size <= 0 treat as minimum_amount failure (more actionable)
        if (isNaN(closeSize) || closeSize <= 0) {
          return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SIZE_MIN,
          };
        }

        // Enforce minimum order value for partial closes when price known
        if (orderValueUSD !== undefined && orderValueUSD < minimumOrderSize) {
          return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SIZE_MIN,
          };
        }

        // Note: Remaining position validation stays in UI layer.
      }
      // Full closes (size undefined) bypass minimum check by design
      // Note: For full closes (when size is undefined), there is no minimum
      // This allows users to close positions worth less than $10 completely

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Validate withdrawal parameters - placeholder for future implementation
   */
  async validateWithdrawal(
    _params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    // Placeholder - to be implemented when needed
    return { isValid: true };
  }

  /**
   * Withdraw funds from HyperLiquid trading account
   *
   * This initiates a withdrawal request via HyperLiquid's API (withdraw3 endpoint).
   *
   * HyperLiquid Bridge Process:
   * - Funds are immediately deducted from L1 balance on HyperLiquid
   * - Validators sign the withdrawal (2/3 of staking power required)
   * - Bridge contract on destination chain processes the withdrawal
   * - After dispute period, USDC is sent to destination address
   * - Total time: ~5 minutes
   * - Fee: 1 USDC (covers Arbitrum gas costs)
   * - No ETH required from user
   *
   * Note: Withdrawals won't appear as incoming transactions until the
   * finalization phase completes (~5 minutes after initiation)
   *
   * @param params Withdrawal parameters
   * @returns Result with txHash (HyperLiquid internal) and withdrawal ID
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    try {
      this.deps.debugLogger.log('HyperLiquidProvider: STARTING WITHDRAWAL', {
        params,
        timestamp: new Date().toISOString(),
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination,
        isTestnet: this.clientService.isTestnetMode(),
      });

      // Step 1: Validate withdrawal parameters
      this.deps.debugLogger.log('HyperLiquidProvider: VALIDATING PARAMETERS');
      const validation = validateWithdrawalParams(params);
      if (!validation.isValid) {
        this.deps.debugLogger.log(
          '❌ HyperLiquidProvider: PARAMETER VALIDATION FAILED',
          {
            error: validation.error,
            params,
            validationResult: validation,
          },
        );
        throw new Error(validation.error);
      }
      this.deps.debugLogger.log('HyperLiquidProvider: PARAMETERS VALIDATED');

      // Step 2: Get supported withdrawal routes and validate asset
      this.deps.debugLogger.log('HyperLiquidProvider: CHECKING ASSET SUPPORT');
      const supportedRoutes = this.getWithdrawalRoutes();
      this.deps.debugLogger.log(
        'HyperLiquidProvider: SUPPORTED WITHDRAWAL ROUTES',
        {
          routeCount: supportedRoutes.length,
          routes: supportedRoutes.map((route) => ({
            assetId: route.assetId,
            chainId: route.chainId,
            contractAddress: route.contractAddress,
          })),
        },
      );

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.assetId) {
        this.deps.debugLogger.log('HyperLiquidProvider: MISSING ASSET ID', {
          error: PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
          params,
        });
        throw new Error(PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED);
      }

      const assetValidation = validateAssetSupport(
        params.assetId,
        supportedRoutes,
      );
      if (!assetValidation.isValid) {
        this.deps.debugLogger.log(
          '❌ HyperLiquidProvider: ASSET NOT SUPPORTED',
          {
            error: assetValidation.error,
            assetId: params.assetId,
            supportedAssets: supportedRoutes.map((r) => r.assetId),
          },
        );
        throw new Error(assetValidation.error);
      }
      this.deps.debugLogger.log('HyperLiquidProvider: ASSET SUPPORTED', {
        assetId: params.assetId,
      });

      // Step 3: Determine destination address
      this.deps.debugLogger.log(
        'HyperLiquidProvider: DETERMINING DESTINATION ADDRESS',
      );
      let destination: Hex;
      if (params.destination) {
        destination = params.destination;
        this.deps.debugLogger.log(
          'HyperLiquidProvider: USING PROVIDED DESTINATION',
          {
            destination,
          },
        );
      } else {
        destination = await this.walletService.getUserAddressWithDefault();
        this.deps.debugLogger.log(
          'HyperLiquidProvider: USING USER WALLET ADDRESS',
          {
            destination,
          },
        );
      }

      // Step 4: Ensure client is ready
      this.deps.debugLogger.log('HyperLiquidProvider: ENSURING CLIENT READY');
      await this.ensureReady();
      const exchangeClient = this.clientService.getExchangeClient();
      this.deps.debugLogger.log('HyperLiquidProvider: CLIENT READY');

      // Step 5: Validate amount against account balance
      this.deps.debugLogger.log(
        'HyperLiquidProvider: CHECKING ACCOUNT BALANCE',
      );
      const accountState = await this.getAccountState();
      const availableBalance = parseFloat(accountState.availableBalance);
      this.deps.debugLogger.log('HyperLiquidProvider: ACCOUNT BALANCE', {
        availableBalance,
        totalBalance: accountState.totalBalance,
        marginUsed: accountState.marginUsed,
        unrealizedPnl: accountState.unrealizedPnl,
      });

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.amount) {
        this.deps.debugLogger.log('HyperLiquidProvider: MISSING AMOUNT', {
          error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
          params,
        });
        throw new Error(PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED);
      }

      const withdrawAmount = parseFloat(params.amount);
      this.deps.debugLogger.log('HyperLiquidProvider: WITHDRAWAL AMOUNT', {
        requestedAmount: withdrawAmount,
        availableBalance,
        sufficientBalance: withdrawAmount <= availableBalance,
      });

      const balanceValidation = validateBalance(
        withdrawAmount,
        availableBalance,
      );
      if (!balanceValidation.isValid) {
        this.deps.debugLogger.log('HyperLiquidProvider: INSUFFICIENT BALANCE', {
          error: balanceValidation.error,
          requestedAmount: withdrawAmount,
          availableBalance,
          difference: withdrawAmount - availableBalance,
        });
        throw new Error(balanceValidation.error);
      }
      this.deps.debugLogger.log('✅ HyperLiquidProvider: BALANCE SUFFICIENT');

      // Step 6: Execute withdrawal via HyperLiquid SDK (API call)
      this.deps.debugLogger.log('HyperLiquidProvider: CALLING WITHDRAW3 API', {
        destination,
        amount: params.amount,
        endpoint: 'withdraw3',
        timestamp: new Date().toISOString(),
      });

      const result = await exchangeClient.withdraw3({
        destination,
        amount: params.amount,
      });

      this.deps.debugLogger.log('HyperLiquidProvider: WITHDRAW3 API RESPONSE', {
        status: result.status,
        response: result,
        timestamp: new Date().toISOString(),
      });

      if (result.status === 'ok') {
        this.deps.debugLogger.log(
          'HyperLiquidProvider: WITHDRAWAL SUBMITTED SUCCESSFULLY',
          {
            destination,
            amount: params.amount,
            assetId: params.assetId,
            status: result.status,
          },
        );

        const now = Date.now();
        const withdrawalId = `hl_${uuidv4()}`;

        return {
          success: true,
          withdrawalId,
          estimatedArrivalTime: now + 5 * 60 * 1000, // HyperLiquid typically takes ~5 minutes
          // Don't set txHash if we don't have a real transaction hash
          // HyperLiquid's withdraw3 API doesn't return a transaction hash immediately
        };
      }

      const errorMessage = `Withdrawal failed: ${result.status}`;
      this.deps.debugLogger.log('HyperLiquidProvider: WITHDRAWAL FAILED', {
        error: errorMessage,
        status: result.status,
        response: result,
        params,
      });
      return {
        success: false,
        error: errorMessage,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.deps.debugLogger.log('HyperLiquidProvider: WITHDRAWAL EXCEPTION', {
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        params,
        timestamp: new Date().toISOString(),
      });
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('withdraw', {
          assetId: params.assetId,
          amount: params.amount,
          destination: params.destination,
        }),
      );
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Transfer USDC collateral between DEXs (main ↔ HIP-3)
   *
   * Verified working on mainnet via Phantom wallet testing (10/15/2025).
   * See docs/perps/HIP-3-IMPLEMENTATION.md for complete transaction flow.
   *
   * @param params - Transfer parameters
   * @param params.sourceDex - Source DEX name ('' = main, 'xyz' = HIP-3)
   * @param params.destinationDex - Destination DEX name ('' = main, 'xyz' = HIP-3)
   * @param params.amount - USDC amount to transfer
   * @returns Transfer result with success status and transaction hash
   *
   * @example
   * // Transfer 10 USDC from main DEX to xyz HIP-3 DEX
   * await transferBetweenDexs({
   *   sourceDex: '',
   *   destinationDex: 'xyz',
   *   amount: '10'
   * });
   */
  async transferBetweenDexs(
    params: TransferBetweenDexsParams,
  ): Promise<TransferBetweenDexsResult> {
    try {
      this.deps.debugLogger.log('HyperLiquidProvider: STARTING DEX TRANSFER', {
        params,
        timestamp: new Date().toISOString(),
      });

      // Validate parameters
      if (!params.amount || parseFloat(params.amount) <= 0) {
        throw new Error('Transfer amount must be greater than 0');
      }

      if (params.sourceDex === params.destinationDex) {
        throw new Error('Source and destination DEX must be different');
      }

      // Get user address
      const userAddress = await this.walletService.getUserAddressWithDefault();
      this.deps.debugLogger.log('HyperLiquidProvider: USER ADDRESS', {
        userAddress,
      });

      // Ensure client ready
      await this.ensureReady();
      const exchangeClient = this.clientService.getExchangeClient();

      // Execute transfer using SDK sendAsset()
      // Note: SDK docs say "testnet-only" but it works on mainnet (verified via Phantom)
      this.deps.debugLogger.log('HyperLiquidProvider: CALLING SEND_ASSET API', {
        sourceDex: params.sourceDex || '(main)',
        destinationDex: params.destinationDex || '(main)',
        amount: params.amount,
      });

      const result = await exchangeClient.sendAsset({
        destination: userAddress,
        sourceDex: params.sourceDex,
        destinationDex: params.destinationDex,
        token: await this.getUsdcTokenId(), // Query correct USDC token ID dynamically
        amount: params.amount,
      });

      this.deps.debugLogger.log('HyperLiquidProvider: SEND_ASSET RESPONSE', {
        status: result.status,
        timestamp: new Date().toISOString(),
      });

      if (result.status === 'ok') {
        this.deps.debugLogger.log(
          '✅ HyperLiquidProvider: TRANSFER SUCCESSFUL',
        );
        return {
          success: true,
          // Note: sendAsset doesn't return txHash in response
          // User can verify transfer in explorer by timestamp
        };
      }

      throw new Error(PERPS_ERROR_CODES.TRANSFER_FAILED);
    } catch (error) {
      this.deps.debugLogger.log('❌ HyperLiquidProvider: TRANSFER FAILED', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('transferBetweenDexs', { ...params }),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Subscribe to live price updates
   */
  subscribeToPrices(params: SubscribePricesParams): () => void {
    // Handle async subscription service by immediately returning cleanup function
    // The subscription service will load correct funding rates before any callbacks
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    this.subscriptionService
      .subscribeToPrices(params)
      .then((unsub) => {
        // If cleanup was called before subscription completed, immediately unsubscribe
        if (cancelled) {
          unsub();
        } else {
          unsubscribe = unsub;
        }
      })
      .catch((error) => {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('subscribeToPrices', {
            symbols: params.symbols,
          }),
        );
      });

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }

  /**
   * Subscribe to live position updates
   */
  subscribeToPositions(params: SubscribePositionsParams): () => void {
    return this.subscriptionService.subscribeToPositions(params);
  }

  /**
   * Subscribe to live order fill updates
   */
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    return this.subscriptionService.subscribeToOrderFills(params);
  }

  /**
   * Subscribe to live order updates
   */
  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    return this.subscriptionService.subscribeToOrders(params);
  }

  /**
   * Subscribe to live account updates
   */
  subscribeToAccount(params: SubscribeAccountParams): () => void {
    return this.subscriptionService.subscribeToAccount(params);
  }

  /**
   * Subscribe to open interest cap updates
   * Zero additional overhead - data extracted from existing webData2 subscription
   */
  subscribeToOICaps(params: SubscribeOICapsParams): () => void {
    return this.subscriptionService.subscribeToOICaps(params);
  }

  /**
   * Subscribe to full order book updates with multiple depth levels
   * Creates a dedicated L2Book subscription for real-time order book data
   */
  subscribeToOrderBook(params: SubscribeOrderBookParams): () => void {
    return this.subscriptionService.subscribeToOrderBook(params);
  }

  /**
   * Subscribe to live candle updates
   */
  subscribeToCandles(params: SubscribeCandlesParams): () => void {
    return this.clientService.subscribeToCandles(params);
  }

  /**
   * Configure live data settings
   */
  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    this.deps.debugLogger.log('Live data config updated:', config);
  }

  /**
   * Toggle testnet mode
   */
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    try {
      const newIsTestnet = !this.clientService.isTestnetMode();

      // Await pending initialization to prevent race condition where
      // the IIFE sets clientsInitialized = true after we reset it
      const pendingInit = this.initializationPromise;
      this.initializationPromise = null;

      if (pendingInit) {
        try {
          await pendingInit;
        } catch {
          // Ignore - we're switching networks anyway
        }
      }

      // Update all services
      this.clientService.setTestnetMode(newIsTestnet);
      this.walletService.setTestnetMode(newIsTestnet);

      // Reset initialization flag so clients will be recreated on next use
      this.clientsInitialized = false;

      return {
        success: true,
        isTestnet: newIsTestnet,
      };
    } catch (error) {
      return createErrorResult(error, {
        success: false,
        isTestnet: this.clientService.isTestnetMode(),
      });
    }
  }

  /**
   * Initialize provider (ensures clients are ready)
   */
  async initialize(): Promise<InitializeResult> {
    try {
      // Ensure clients are initialized (lazy initialization)
      await this.ensureClientsInitialized();
      return {
        success: true,
        chainId: getChainId(this.clientService.isTestnetMode()),
      };
    } catch (error) {
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Check if ready to trade
   */
  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    try {
      const exchangeClient = this.clientService.getExchangeClient();
      const infoClient = this.clientService.getInfoClient();
      const walletConnected = !!exchangeClient && !!infoClient;

      let accountConnected = false;
      try {
        await this.walletService.getCurrentAccountId();
        accountConnected = true;
      } catch (error) {
        this.deps.debugLogger.log('Account not connected:', error);
        accountConnected = false;
      }

      const ready = walletConnected && accountConnected;

      return {
        ready,
        walletConnected,
        networkSupported: true,
      };
    } catch (error) {
      return {
        ready: false,
        walletConnected: false,
        networkSupported: false,
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Calculate liquidation price using HyperLiquid's formula
   * Formula: liq_price = price - side * margin_available / position_size / (1 - l * side)
   * where l = 1 / MAINTENANCE_LEVERAGE = 1 / (2 * max_leverage)
   */
  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const { entryPrice, leverage, direction, asset } = params;

    // Validate inputs
    if (
      !isFinite(entryPrice) ||
      !isFinite(leverage) ||
      entryPrice <= 0 ||
      leverage <= 0
    ) {
      return '0.00';
    }

    // Get asset's max leverage to calculate maintenance margin
    let maxLeverage = PERPS_CONSTANTS.DefaultMaxLeverage; // Default fallback
    if (asset) {
      try {
        maxLeverage = await this.getMaxLeverage(asset);
      } catch (error) {
        this.deps.debugLogger.log(
          'Failed to get max leverage for asset, using default',
          {
            asset,
            error,
          },
        );
        // Use default if we can't fetch the asset's max leverage
      }
    }

    // Calculate maintenance leverage and margin according to HyperLiquid docs
    const maintenanceLeverage = 2 * maxLeverage;
    const l = 1 / maintenanceLeverage;
    const side = direction === 'long' ? 1 : -1;

    // For isolated margin, we use the standard formula
    // margin_available = initial_margin - maintenance_margin_required
    const initialMargin = 1 / leverage;
    const maintenanceMargin = 1 / maintenanceLeverage;

    // Check if position can be opened
    if (initialMargin < maintenanceMargin) {
      // Position cannot be opened - leverage exceeds maximum allowed (2 * maxLeverage)
      throw new Error(
        `Invalid leverage: ${leverage}x exceeds maximum allowed leverage of ${maintenanceLeverage}x`,
      );
    }

    try {
      // HyperLiquid liquidation formula
      // For isolated margin: margin_available = isolated_margin - maintenance_margin_required
      const marginAvailable = initialMargin - maintenanceMargin;

      // Simplified calculation when position size is 1 unit
      // liq_price = price - side * margin_available * price / (1 - l * side)
      const denominator = 1 - l * side;
      if (Math.abs(denominator) < 0.0001) {
        // Avoid division by very small numbers
        return String(entryPrice);
      }

      const liquidationPrice =
        entryPrice - (side * marginAvailable * entryPrice) / denominator;

      // Ensure liquidation price is non-negative
      return String(Math.max(0, liquidationPrice));
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('calculateLiquidationPrice', {
          asset: params.asset,
          entryPrice: params.entryPrice,
          leverage: params.leverage,
          direction: params.direction,
        }),
      );
      return '0.00';
    }
  }

  /**
   * Calculate maintenance margin for a specific asset
   * According to HyperLiquid docs: maintenance_margin = 1 / (2 * max_leverage)
   */
  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    const { asset } = params;

    // Get asset's max leverage
    const maxLeverage = await this.getMaxLeverage(asset);

    // Maintenance margin = 1 / (2 * max_leverage)
    // This varies from 1.25% (for 40x) to 16.7% (for 3x) depending on the asset
    return 1 / (2 * maxLeverage);
  }

  /**
   * Get maximum leverage allowed for an asset
   */
  async getMaxLeverage(asset: string): Promise<number> {
    try {
      // Check cache first
      const cached = this.maxLeverageCache.get(asset);
      const now = Date.now();

      if (
        cached &&
        now - cached.timestamp < PERFORMANCE_CONFIG.MaxLeverageCacheDurationMs
      ) {
        return cached.value;
      }

      // Read-only operation: only need client initialization, not full ensureReady()
      // (no DEX abstraction, referral, or builder fee needed for metadata)
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(asset);

      // Get asset info (uses cache to avoid redundant API calls)
      const meta = await this.getCachedMeta({ dexName });

      // Check if meta and universe exist and is valid
      // This should never happen since getCachedMeta validates, but defensive check
      if (!meta?.universe || !Array.isArray(meta.universe)) {
        this.deps.logger.error(
          new Error(
            '[HyperLiquidProvider] Invalid meta response in getMaxLeverage',
          ),
          this.getErrorContext('getMaxLeverage', {
            asset,
            dexName: dexName || 'main',
            note: 'Meta or universe not available, using default max leverage',
          }),
        );
        return PERPS_CONSTANTS.DefaultMaxLeverage;
      }

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find((a) => a.name === asset);
      if (!assetInfo) {
        this.deps.debugLogger.log(
          `Asset ${asset} not found in universe, using default max leverage`,
        );
        return PERPS_CONSTANTS.DefaultMaxLeverage;
      }

      // Cache the result
      this.maxLeverageCache.set(asset, {
        value: assetInfo.maxLeverage,
        timestamp: now,
      });

      return assetInfo.maxLeverage;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getMaxLeverage', {
          asset,
        }),
      );
      return PERPS_CONSTANTS.DefaultMaxLeverage;
    }
  }

  /**
   * Calculate fees based on HyperLiquid's fee structure
   * Returns fee rate as decimal (e.g., 0.00045 for 0.045%)
   *
   * Uses the SDK's userFees API to get actual discounted rates when available,
   * falling back to base rates if the API is unavailable or user not connected.
   */
  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    const { orderType, isMaker = false, amount, symbol } = params;

    // Start with base rates from config
    let feeRate =
      orderType === 'market' || !isMaker ? FEE_RATES.taker : FEE_RATES.maker;

    // Parse symbol to detect HIP-3 DEX (e.g., "xyz:TSLA" → dex="xyz", parsedSymbol="TSLA")
    const { dex, symbol: parsedSymbol } = parseAssetName(symbol);
    const isHip3Asset = dex !== null;

    // Calculate HIP-3 fee multiplier dynamically (handles Growth Mode)
    let hip3Multiplier = 1;
    if (isHip3Asset && dex && parsedSymbol) {
      hip3Multiplier = await this.calculateHip3FeeMultiplier({
        dexName: dex,
        assetSymbol: parsedSymbol,
      });
      const originalRate = feeRate;
      feeRate *= hip3Multiplier;

      this.deps.debugLogger.log('HIP-3 Dynamic Fee Multiplier Applied', {
        symbol,
        dex,
        parsedSymbol,
        originalBaseRate: originalRate,
        hip3BaseRate: feeRate,
        hip3Multiplier,
      });
    }

    this.deps.debugLogger.log('HyperLiquid Fee Calculation Started', {
      orderType,
      isMaker,
      amount,
      symbol,
      isHip3Asset,
      hip3Multiplier,
      baseFeeRate: feeRate,
      baseTakerRate: FEE_RATES.taker,
      baseMakerRate: FEE_RATES.maker,
    });

    // Try to get user-specific rates if wallet is connected
    try {
      const userAddress = await this.walletService.getUserAddressWithDefault();

      this.deps.debugLogger.log('User Address Retrieved', {
        userAddress,
        network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      });

      // Check cache first
      if (this.isFeeCacheValid(userAddress)) {
        const cached = this.userFeeCache.get(userAddress);
        if (cached) {
          // Market orders always use taker rate, limit orders check isMaker
          let userFeeRate =
            orderType === 'market' || !isMaker
              ? cached.perpsTakerRate
              : cached.perpsMakerRate;

          // Apply HIP-3 dynamic multiplier to user-specific rates (includes Growth Mode)
          if (isHip3Asset && hip3Multiplier > 0) {
            userFeeRate *= hip3Multiplier;
          }

          feeRate = userFeeRate;

          this.deps.debugLogger.log('📦 Using Cached Fee Rates', {
            cacheHit: true,
            perpsTakerRate: cached.perpsTakerRate,
            perpsMakerRate: cached.perpsMakerRate,
            spotTakerRate: cached.spotTakerRate,
            spotMakerRate: cached.spotMakerRate,
            selectedRate: feeRate,
            isHip3Asset,
            hip3Multiplier,
            cacheExpiry: new Date(cached.timestamp + cached.ttl).toISOString(),
            cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
          });
        }
      } else {
        this.deps.debugLogger.log(
          'Fetching Fresh Fee Rates from HyperLiquid API',
          {
            cacheHit: false,
            userAddress,
          },
        );

        // Fetch fresh rates from SDK
        // Read-only operation: only need client initialization
        await this.ensureClientsInitialized();
        this.clientService.ensureInitialized();
        const infoClient = this.clientService.getInfoClient();
        const userFees = await infoClient.userFees({
          user: userAddress as `0x${string}`,
        });

        this.deps.debugLogger.log('HyperLiquid userFees API Response', {
          userCrossRate: userFees.userCrossRate,
          userAddRate: userFees.userAddRate,
          activeReferralDiscount: userFees.activeReferralDiscount,
          activeStakingDiscount: userFees.activeStakingDiscount,
        });

        // Parse base user rates (these don't include discounts as expected)
        const baseUserTakerRate = parseFloat(userFees.userCrossRate);
        const baseUserMakerRate = parseFloat(userFees.userAddRate);
        const baseUserSpotTakerRate = parseFloat(userFees.userSpotCrossRate);
        const baseUserSpotMakerRate = parseFloat(userFees.userSpotAddRate);

        // Apply discounts manually since HyperLiquid API doesn't apply them
        const referralDiscount = parseFloat(
          userFees.activeReferralDiscount || '0',
        );
        const stakingDiscount = parseFloat(
          userFees.activeStakingDiscount?.discount || '0',
        );

        // Calculate total discount (referral + staking, but not compounding)
        const totalDiscount = Math.min(referralDiscount + stakingDiscount, 0.4); // Cap at 40%

        // Apply discount to rates
        const perpsTakerRate = baseUserTakerRate * (1 - totalDiscount);
        const perpsMakerRate = baseUserMakerRate * (1 - totalDiscount);
        const spotTakerRate = baseUserSpotTakerRate * (1 - totalDiscount);
        const spotMakerRate = baseUserSpotMakerRate * (1 - totalDiscount);

        this.deps.debugLogger.log('Fee Discount Calculation', {
          discounts: {
            referral: `${(referralDiscount * 100).toFixed(1)}%`,
            staking: `${(stakingDiscount * 100).toFixed(1)}%`,
            total: `${(totalDiscount * 100).toFixed(1)}%`,
          },
          rates: {
            before: {
              taker: `${(baseUserTakerRate * 100).toFixed(4)}%`,
              maker: `${(baseUserMakerRate * 100).toFixed(4)}%`,
            },
            after: {
              taker: `${(perpsTakerRate * 100).toFixed(4)}%`,
              maker: `${(perpsMakerRate * 100).toFixed(4)}%`,
            },
          },
        });

        // Validate all rates are valid numbers before caching
        if (
          isNaN(perpsTakerRate) ||
          isNaN(perpsMakerRate) ||
          isNaN(spotTakerRate) ||
          isNaN(spotMakerRate) ||
          perpsTakerRate < 0 ||
          perpsMakerRate < 0 ||
          spotTakerRate < 0 ||
          spotMakerRate < 0
        ) {
          this.deps.debugLogger.log('Fee Rate Validation Failed', {
            validation: {
              perpsTakerValid: !isNaN(perpsTakerRate) && perpsTakerRate >= 0,
              perpsMakerValid: !isNaN(perpsMakerRate) && perpsMakerRate >= 0,
              spotTakerValid: !isNaN(spotTakerRate) && spotTakerRate >= 0,
              spotMakerValid: !isNaN(spotMakerRate) && spotMakerRate >= 0,
            },
            rawValues: {
              perpsTakerRate,
              perpsMakerRate,
              spotTakerRate,
              spotMakerRate,
            },
          });
          throw new Error('Invalid fee rates received from API');
        }

        const rates = {
          perpsTakerRate,
          perpsMakerRate,
          spotTakerRate,
          spotMakerRate,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000, // 5 minutes
        };

        this.userFeeCache.set(userAddress, rates);
        // Market orders always use taker rate, limit orders check isMaker
        let userFeeRate =
          orderType === 'market' || !isMaker
            ? rates.perpsTakerRate
            : rates.perpsMakerRate;

        // Apply HIP-3 dynamic multiplier to API-fetched rates (includes Growth Mode)
        if (isHip3Asset && hip3Multiplier > 0) {
          userFeeRate *= hip3Multiplier;
        }

        feeRate = userFeeRate;

        this.deps.debugLogger.log('Fee Rates Validated and Cached', {
          selectedRate: feeRate,
          selectedRatePercentage: `${(feeRate * 100).toFixed(4)}%`,
          discountApplied: perpsTakerRate < FEE_RATES.taker,
          isHip3Asset,
          hip3Multiplier,
          cacheExpiry: new Date(rates.timestamp + rates.ttl).toISOString(),
        });
      }
    } catch (error) {
      // Silently fall back to base rates
      this.deps.debugLogger.log(
        'Fee API Call Failed - Falling Back to Base Rates',
        {
          error: error instanceof Error ? error.message : String(error),
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
          fallbackTakerRate: FEE_RATES.taker,
          fallbackMakerRate: FEE_RATES.maker,
          userAddress: 'unknown',
        },
      );
    }

    const parsedAmount = amount ? parseFloat(amount) : 0;

    // Protocol base fee (HyperLiquid's fee)
    const protocolFeeRate = feeRate;
    const protocolFeeAmount =
      amount !== undefined
        ? isNaN(parsedAmount)
          ? 0
          : parsedAmount * protocolFeeRate
        : undefined;

    // MetaMask builder fee (0.1% = 0.001) with optional reward discount
    let metamaskFeeRate = BUILDER_FEE_CONFIG.MaxFeeDecimal;

    // Apply MetaMask reward discount if active
    if (this.userFeeDiscountBips !== undefined) {
      const discount = this.userFeeDiscountBips / BASIS_POINTS_DIVISOR; // Convert basis points to decimal
      metamaskFeeRate = BUILDER_FEE_CONFIG.MaxFeeDecimal * (1 - discount);

      this.deps.debugLogger.log('HyperLiquid: Applied MetaMask fee discount', {
        originalRate: BUILDER_FEE_CONFIG.MaxFeeDecimal,
        discountBips: this.userFeeDiscountBips,
        discountPercentage: this.userFeeDiscountBips / 100,
        adjustedRate: metamaskFeeRate,
        discountAmount: BUILDER_FEE_CONFIG.MaxFeeDecimal * discount,
      });
    }

    const validAmountForMetamaskFee = isNaN(parsedAmount)
      ? 0
      : parsedAmount * metamaskFeeRate;
    const metamaskFeeAmount =
      amount === undefined ? undefined : validAmountForMetamaskFee;

    // Total fees
    const totalFeeRate = protocolFeeRate + metamaskFeeRate;
    const validAmountForTotalFee = isNaN(parsedAmount)
      ? 0
      : parsedAmount * totalFeeRate;
    const totalFeeAmount =
      amount === undefined ? undefined : validAmountForTotalFee;

    const result = {
      // Total fees
      feeRate: totalFeeRate,
      feeAmount: totalFeeAmount,

      // Protocol fees
      protocolFeeRate,
      protocolFeeAmount,

      // MetaMask fees
      metamaskFeeRate,
      metamaskFeeAmount,
    };

    this.deps.debugLogger.log('Final Fee Calculation Result', {
      orderType,
      amount,
      fees: {
        protocolRate: `${(protocolFeeRate * 100).toFixed(4)}%`,
        metamaskRate: `${(metamaskFeeRate * 100).toFixed(4)}%`,
        totalRate: `${(totalFeeRate * 100).toFixed(4)}%`,
        totalAmount: totalFeeAmount,
      },
      usingFallbackRates:
        protocolFeeRate === FEE_RATES.taker ||
        protocolFeeRate === FEE_RATES.maker,
    });

    return result;
  }

  /**
   * Check if the fee cache is valid for a user
   * @private
   */
  private isFeeCacheValid(userAddress: string): boolean {
    const cached = this.userFeeCache.get(userAddress);
    if (!cached) return false;
    return Date.now() - cached.timestamp < cached.ttl;
  }

  /**
   * Clear fee cache for a specific user or all users
   * @param userAddress - Optional address to clear cache for
   */
  public clearFeeCache(userAddress?: string): void {
    if (userAddress) {
      this.userFeeCache.delete(userAddress);
      this.deps.debugLogger.log('Cleared fee cache for user', { userAddress });
    } else {
      this.userFeeCache.clear();
      this.deps.debugLogger.log('Cleared all fee cache');
    }
  }

  /**
   * Disconnect provider
   */
  async disconnect(): Promise<DisconnectResult> {
    try {
      this.deps.debugLogger.log('HyperLiquid: Disconnecting provider', {
        isTestnet: this.clientService.isTestnetMode(),
        timestamp: new Date().toISOString(),
      });

      // Clear subscriptions through subscription service
      this.subscriptionService.clearAll();

      // Clear fee cache
      this.clearFeeCache();

      // Clear session caches (ensures fresh state on reconnect/account switch)
      this.referralCheckCache.clear();
      this.builderFeeCheckCache.clear();
      this.cachedMetaByDex.clear();
      this.perpDexsCache = { data: null, timestamp: 0 };

      // Await pending initialization before clearing to prevent the IIFE from
      // setting clientsInitialized = true after disconnect completes
      const pendingInit = this.initializationPromise;
      const pendingReady = this.ensureReadyPromise;

      // Clear references first to prevent new callers from reusing
      this.initializationPromise = null;
      this.ensureReadyPromise = null;
      this.pendingBuilderFeeApprovals.clear();

      // Wait for pending operations to complete (ignore errors)
      if (pendingInit) {
        try {
          await pendingInit;
        } catch {
          // Ignore - we're disconnecting anyway
        }
      }
      if (pendingReady) {
        try {
          await pendingReady;
        } catch {
          // Ignore - we're disconnecting anyway
        }
      }

      // Reset client initialization flag so wallet adapter will be recreated with new account
      // This fixes account synchronization issue where old account's address persists in wallet adapter
      this.clientsInitialized = false;

      // Disconnect client service
      await this.clientService.disconnect();

      this.deps.debugLogger.log('HyperLiquid: Provider fully disconnected', {
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Lightweight WebSocket health check using SDK's built-in ready() method
   * Checks if WebSocket connection is open without making expensive API calls
   *
   * @param timeoutMs - Optional timeout in milliseconds (defaults to WEBSOCKET_PING_TIMEOUT_MS)
   * @throws {Error} If WebSocket connection times out or fails
   */
  async ping(timeoutMs?: number): Promise<void> {
    // Read-only operation: only need client initialization
    await this.ensureClientsInitialized();
    this.clientService.ensureInitialized();

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const timeout = timeoutMs ?? PERPS_CONSTANTS.WebsocketPingTimeoutMs;

    this.deps.debugLogger.log(
      `HyperLiquid: WebSocket health check ping starting (timeout: ${timeout}ms)`,
    );

    const controller = new AbortController();
    let didTimeout = false;

    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeout);

    try {
      // Use SDK's built-in ready() method which checks socket.readyState === OPEN
      // This is much more efficient than creating a subscription just for health check
      await subscriptionClient.config_.transport.ready(controller.signal);

      this.deps.debugLogger.log(
        'HyperLiquid: WebSocket health check ping succeeded',
      );
    } catch (error) {
      // Check if we timed out first
      if (didTimeout) {
        this.deps.debugLogger.log(
          `HyperLiquid: WebSocket health check ping timed out after ${timeout}ms`,
        );
        throw new Error(PERPS_ERROR_CODES.CONNECTION_TIMEOUT);
      }

      // Otherwise throw the actual error
      this.deps.debugLogger.log(
        'HyperLiquid: WebSocket health check ping failed',
        error,
      );
      throw ensureError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get the current WebSocket connection state from the client service.
   * Used by the UI to monitor connection health and show notifications.
   *
   * @returns The current WebSocket connection state
   */
  getWebSocketConnectionState(): WebSocketConnectionState {
    return this.clientService.getConnectionState();
  }

  /**
   * Subscribe to WebSocket connection state changes.
   * The listener will be called immediately with the current state and whenever the state changes.
   *
   * @param listener - Callback function that receives the new connection state and reconnection attempt
   * @returns Unsubscribe function to remove the listener
   */
  subscribeToConnectionState(
    listener: (
      state: WebSocketConnectionState,
      reconnectionAttempt: number,
    ) => void,
  ): () => void {
    return this.clientService.subscribeToConnectionState(listener);
  }

  /**
   * Manually trigger a WebSocket reconnection attempt.
   * Used by the UI retry button when connection is lost.
   */
  async reconnect(): Promise<void> {
    return this.clientService.reconnect();
  }

  /**
   * Get list of available HIP-3 builder-deployed DEXs
   * @param _params - Optional parameters (reserved for future filters/pagination)
   * @returns Array of DEX names (empty string '' represents main DEX)
   */
  async getAvailableDexs(_params?: GetAvailableDexsParams): Promise<string[]> {
    try {
      // Read-only operation: only need client initialization
      await this.ensureClientsInitialized();
      this.clientService.ensureInitialized();

      const infoClient = this.clientService.getInfoClient();
      const dexs = await infoClient.perpDexs();

      // Map DEX objects to names: null -> '' (main DEX), object -> object.name
      return dexs.map((dex) => (dex === null ? '' : dex.name));
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'HyperLiquidProvider.getAvailableDexs',
          data: { action: 'fetch_available_dexs' },
        },
      });
      throw error;
    }
  }

  /**
   * Get block explorer URL for an address or just the base URL
   * @param address - Optional address to append to the base URL
   * @returns Block explorer URL
   */
  getBlockExplorerUrl(address?: string): string {
    const network = this.clientService.isTestnetMode() ? 'testnet' : 'mainnet';
    const baseUrl =
      network === 'testnet'
        ? 'https://app.hyperliquid-testnet.xyz'
        : 'https://app.hyperliquid.xyz';

    if (address) {
      return `${baseUrl}/explorer/address/${address}`;
    }

    return `${baseUrl}/explorer`;
  }

  private getBuilderAddress(isTestnet: boolean) {
    return isTestnet
      ? BUILDER_FEE_CONFIG.TestnetBuilder
      : BUILDER_FEE_CONFIG.MainnetBuilder;
  }

  private getReferralCode(isTestnet: boolean): string {
    return isTestnet
      ? REFERRAL_CONFIG.TestnetCode
      : REFERRAL_CONFIG.MainnetCode;
  }

  /**
   * Ensure user has a MetaMask referral code set
   * Called once during initialization (ensureReady) to set up referral for the session
   * Uses session cache to avoid redundant API calls until disconnect/reconnect
   *
   * Cache semantics: Only caches successful referral sets (never caches "not set" state)
   * This allows detection of external referral changes between retries while avoiding redundant checks
   *
   * Note: This is network-specific - testnet and mainnet have separate referral states
   * Note: Non-blocking - failures are logged to Sentry but don't prevent trading
   * Note: Will automatically retry on next session if failed (cache cleared on disconnect)
   */
  private async ensureReferralSet(): Promise<void> {
    try {
      const isTestnet = this.clientService.isTestnetMode();
      const network = isTestnet ? 'testnet' : 'mainnet';
      const expectedReferralCode = this.getReferralCode(isTestnet);
      const referrerAddress = this.getBuilderAddress(isTestnet);
      const userAddress = await this.walletService.getUserAddressWithDefault();

      if (userAddress.toLowerCase() === referrerAddress.toLowerCase()) {
        this.deps.debugLogger.log(
          '[ensureReferralSet] User is builder, skipping',
          {
            network,
          },
        );
        return;
      }

      // Check session cache first to avoid redundant API calls
      // Cache only stores true (referral confirmed), never false
      const cacheKey = this.getCacheKey(network, userAddress);
      const cached = this.referralCheckCache.get(cacheKey);

      if (cached === true) {
        this.deps.debugLogger.log('[ensureReferralSet] Using session cache', {
          network,
        });
        return; // Already has referral set this session, skip
      }

      const isReady = await this.isReferralCodeReady();
      if (!isReady) {
        this.deps.debugLogger.log(
          '[ensureReferralSet] Builder referral not ready yet, skipping',
          { network },
        );
        return;
      }

      // Check if user already has a referral set on this network
      const hasReferral = await this.checkReferralSet();

      if (!hasReferral) {
        this.deps.debugLogger.log(
          '[ensureReferralSet] No referral set - setting MetaMask',
          {
            network,
            referralCode: expectedReferralCode,
          },
        );
        const result = await this.setReferralCode();
        if (result === true) {
          this.deps.debugLogger.log(
            '[ensureReferralSet] Referral code set successfully',
            {
              network,
              referralCode: expectedReferralCode,
            },
          );
          // Update cache to reflect successful set
          this.referralCheckCache.set(cacheKey, true);
        } else {
          this.deps.debugLogger.log(
            '[ensureReferralSet] Failed to set referral code (will retry next session)',
            { network },
          );
        }
      } else {
        // User already has referral set (possibly from external setup or previous session)
        // Cache success to avoid redundant checks
        this.referralCheckCache.set(cacheKey, true);

        this.deps.debugLogger.log(
          '[ensureReferralSet] User already has referral set',
          {
            network,
          },
        );
      }
    } catch (error) {
      // Non-blocking: Log to Sentry but don't throw
      // Will retry automatically on next session (cache cleared on disconnect)
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('ensureReferralSet', {
          note: 'Referral setup failed (non-blocking, will retry next session)',
        }),
      );
    }
  }

  /**
   * Check if the referral code is ready to be used
   * @returns Promise resolving to true if referral code is ready
   */
  private async isReferralCodeReady(): Promise<boolean> {
    try {
      const infoClient = this.clientService.getInfoClient();
      const isTestnet = this.clientService.isTestnetMode();
      const code = this.getReferralCode(isTestnet);
      const referrerAddr = this.getBuilderAddress(isTestnet);

      const referral = await infoClient.referral({ user: referrerAddr });

      const stage = referral.referrerState?.stage;

      if (stage === 'ready') {
        const onFile = referral.referrerState?.data?.code || '';
        if (onFile.toUpperCase() !== code.toUpperCase()) {
          throw new Error(
            `Ready for referrals but there is a config code mismatch ${onFile} vs ${code}`,
          );
        }
        return true;
      }

      // Not ready yet - log as debugLogger since this is expected during setup phase
      this.deps.debugLogger.log(
        '[isReferralCodeReady] Referral code not ready',
        {
          stage,
          code,
          referrerAddr,
        },
      );
      return false;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('isReferralCodeReady', {
          code: this.getReferralCode(this.clientService.isTestnetMode()),
          referrerAddress: this.getBuilderAddress(
            this.clientService.isTestnetMode(),
          ),
        }),
      );
      return false;
    }
  }

  /**
   * Check if user has a referral code set with HyperLiquid
   * @returns Promise resolving to true if referral is set, false otherwise
   */
  private async checkReferralSet(): Promise<boolean> {
    try {
      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault();

      // Call HyperLiquid API to check if user has a referral set
      const referralData = await infoClient.referral({
        user: userAddress,
      });

      this.deps.debugLogger.log('Referral check result:', {
        userAddress,
        referralData,
      });

      return !!referralData?.referredBy?.code;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('checkReferralSet', {
          note: 'Error checking referral status, will retry',
        }),
      );
      // do not throw here, return false as we can try to set it again
      return false;
    }
  }

  /**
   * Set MetaMask as the user's referrer on HyperLiquid
   */
  private async setReferralCode(): Promise<boolean> {
    try {
      const exchangeClient = this.clientService.getExchangeClient();
      const referralCode = this.getReferralCode(
        this.clientService.isTestnetMode(),
      );

      this.deps.debugLogger.log('[setReferralCode] Setting referral code', {
        code: referralCode,
        network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      });

      // set the referral code
      const result = await exchangeClient.setReferrer({
        code: referralCode,
      });

      this.deps.debugLogger.log(
        '[setReferralCode] Referral code set result',
        result,
      );

      return result?.status === 'ok';
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('setReferralCode', {
          code: this.getReferralCode(this.clientService.isTestnetMode()),
        }),
      );
      // Rethrow to be caught by retry logic in ensureReferralSet
      throw error;
    }
  }
}
