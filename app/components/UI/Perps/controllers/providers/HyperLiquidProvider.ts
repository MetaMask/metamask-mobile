import { CaipAccountId, type Hex } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import { ensureError } from '../../utils/perpsErrorHandler';
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
  TRADING_DEFAULTS,
  USDC_DECIMALS,
} from '../../constants/hyperLiquidConfig';
import {
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  TP_SL_CONFIG,
  WITHDRAWAL_CONSTANTS,
} from '../../constants/perpsConfig';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
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
import { formatPerpsFiat } from '../../utils/formatUtils';
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
  GetMarketsParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  InitializeResult,
  IPerpsProvider,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsMarketData,
  Position,
  ReadyToTradeResult,
  SubscribeAccountParams,
  SubscribeOICapsParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  ToggleTestnetResult,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
  TransferBetweenDexsParams,
  TransferBetweenDexsResult,
  UserHistoryItem,
} from '../types';
import { PERPS_ERROR_CODES } from '../PerpsController';

/**
 * HyperLiquid provider implementation
 *
 * Implements the IPerpsProvider interface for HyperLiquid protocol.
 * Uses the @nktkas/hyperliquid SDK for all operations.
 * Delegates to service classes for client management, wallet integration, and subscriptions.
 *
 * HIP-3 Balance Management:
 * Attempts to use HyperLiquid's native DEX abstraction for automatic collateral transfers.
 * If not supported, falls back to programmatic balance management using SDK's sendAsset.
 */
export class HyperLiquidProvider implements IPerpsProvider {
  readonly protocolId = 'hyperliquid';

  // Service instances
  private clientService: HyperLiquidClientService;
  private walletService: HyperLiquidWalletService;
  private subscriptionService: HyperLiquidSubscriptionService;

  // Asset mapping
  private coinToAssetId = new Map<string, number>();

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

  // Cache for market data (meta() API responses) to reduce redundant calls
  private marketCache = new Map<
    string, // DEX name (empty string for main DEX)
    { data: MarketInfo[]; timestamp: number }
  >();

  // Cache for raw meta responses (shared across methods to avoid redundant API calls)
  private cachedMetaByDex = new Map<string, MetaResponse>();

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

  // Cache for USDC token ID from spot metadata
  private cachedUsdcTokenId?: string;

  // Error mappings from HyperLiquid API errors to standardized PERPS_ERROR_CODES
  private readonly ERROR_MAPPINGS = {
    'isolated position does not have sufficient margin available to decrease leverage':
      PERPS_ERROR_CODES.ORDER_LEVERAGE_REDUCTION_FAILED,
  };

  // Track whether clients have been initialized (lazy initialization)
  private clientsInitialized = false;

  constructor(
    options: {
      isTestnet?: boolean;
      hip3Enabled?: boolean;
      allowlistMarkets?: string[];
      blocklistMarkets?: string[];
      useDexAbstraction?: boolean;
    } = {},
  ) {
    const isTestnet = options.isTestnet || false;

    // Dev-friendly defaults: Enable all markets by default for easier testing (discovery mode)
    this.hip3Enabled = options.hip3Enabled ?? __DEV__;
    this.allowlistMarkets = options.allowlistMarkets ?? [];
    this.blocklistMarkets = options.blocklistMarkets ?? [];

    // Attempt native balance abstraction, fallback to programmatic transfer if unsupported
    this.useDexAbstraction = options.useDexAbstraction ?? true;

    // Initialize services
    this.clientService = new HyperLiquidClientService({ isTestnet });
    this.walletService = new HyperLiquidWalletService({ isTestnet });
    this.subscriptionService = new HyperLiquidSubscriptionService(
      this.clientService,
      this.walletService,
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
    DevLogger.log('[HyperLiquidProvider] Constructor complete', {
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
   */
  private ensureClientsInitialized(): void {
    if (this.clientsInitialized) {
      return; // Already initialized
    }

    const wallet = this.walletService.createWalletAdapter();
    this.clientService.initialize(wallet);

    // Only set flag AFTER successful initialization
    this.clientsInitialized = true;

    DevLogger.log('[HyperLiquidProvider] Clients initialized lazily');
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
        DevLogger.log('HyperLiquidProvider: DEX abstraction already enabled', {
          user: userAddress,
        });
        return;
      }

      // Enable DEX abstraction (one-time, irreversible)
      DevLogger.log('HyperLiquidProvider: Enabling DEX abstraction', {
        user: userAddress,
        note: 'HyperLiquid will auto-manage collateral for HIP-3 orders',
      });

      const exchangeClient = this.clientService.getExchangeClient();
      await exchangeClient.agentEnableDexAbstraction();

      DevLogger.log(
        '✅ HyperLiquidProvider: DEX abstraction enabled successfully',
      );
    } catch (error) {
      // Don't blindly disable the flag on any error
      // Network errors or unknown issues shouldn't trigger fallback to manual transfer
      Logger.error(
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
    // Lazy initialization: ensure clients are created (safe after Engine.context is ready)
    this.ensureClientsInitialized();

    // Verify clients are properly initialized
    this.clientService.ensureInitialized();

    // Build asset mapping on first call only (flags are immutable)
    if (this.coinToAssetId.size === 0) {
      DevLogger.log('HyperLiquidProvider: Building asset mapping', {
        hip3Enabled: this.hip3Enabled,
        allowlistMarkets: this.allowlistMarkets,
        blocklistMarkets: this.blocklistMarkets,
      });
      await this.buildAssetMapping();
    }

    // Attempt to enable native balance abstraction
    await this.ensureDexAbstractionEnabled();
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
      Logger.error(
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
   * Invalid DEX names are silently filtered with DevLogger warning.
   *
   * @returns Array of DEX names to use (null = main DEX, strings = HIP-3 DEXs)
   */
  private async getValidatedDexs(): Promise<(string | null)[]> {
    // Return cached result if available
    if (this.cachedValidatedDexs !== null) {
      return this.cachedValidatedDexs;
    }

    // Kill switch: HIP-3 disabled, return main DEX only
    if (!this.hip3Enabled) {
      DevLogger.log('HyperLiquidProvider: HIP-3 disabled via hip3Enabled flag');
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
      Logger.error(
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
      DevLogger.log(
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

    DevLogger.log(
      'HyperLiquidProvider: Available DEXs (market filtering applied at data layer)',
      {
        count: availableHip3Dexs.length,
        dexNames: availableHip3Dexs,
      },
    );

    // Return all DEXs - market filtering is applied at subscription data layer
    // webData3 automatically connects to ALL DEXs
    DevLogger.log(
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
   * Clear market cache (called when feature flags change)
   */
  private clearMarketCache(): void {
    this.marketCache.clear();
    DevLogger.log('HyperLiquidProvider: Market cache cleared');
  }

  /**
   * Check if cached market data is still valid (not expired)
   * @param dex - DEX name (empty string for main DEX)
   * @returns true if cache exists and is not expired
   */
  private isCachedMarketDataValid(dex: string): boolean {
    const cached = this.marketCache.get(dex);
    if (!cached) {
      return false;
    }

    const age = Date.now() - cached.timestamp;
    const isValid = age < PERFORMANCE_CONFIG.MARKET_DATA_CACHE_DURATION_MS;

    if (!isValid) {
      DevLogger.log('HyperLiquidProvider: Market cache expired', {
        dex: dex || 'main',
        ageMs: age,
        ttlMs: PERFORMANCE_CONFIG.MARKET_DATA_CACHE_DURATION_MS,
      });
    }

    return isValid;
  }

  /**
   * Fetch markets for a specific DEX with caching
   * @param dex - DEX name (null for main DEX)
   * @param skipFilters - If true, skip market filtering (default: false)
   * @returns Array of market info
   */
  private async fetchMarketsForDex(
    dex: string | null,
    skipFilters = false,
  ): Promise<MarketInfo[]> {
    // Cache key includes skipFilters flag to separate filtered/unfiltered data
    const cacheKey = `${dex ?? ''}_${skipFilters ? 'raw' : 'filtered'}`;

    // Check marketCache first (processed data with filtering)
    if (this.isCachedMarketDataValid(cacheKey)) {
      const cached = this.marketCache.get(cacheKey);
      if (cached) {
        DevLogger.log('HyperLiquidProvider: Using cached market data', {
          dex: dex || 'main',
          marketCount: cached.data.length,
        });
        return cached.data;
      }
    }

    // Check cachedMetaByDex for raw meta response (optimization to avoid redundant API calls)
    const dexKey = dex || 'main';
    let meta = this.cachedMetaByDex.get(dexKey);

    if (!meta) {
      // Fetch from API if not in cache
      const infoClient = this.clientService.getInfoClient();
      const dexParam = dex ?? '';
      meta = await infoClient.meta(dexParam ? { dex: dexParam } : undefined);

      // Store raw meta response for reuse
      this.cachedMetaByDex.set(dexKey, meta);

      DevLogger.log('[MarketData] Fetched and cached meta response', {
        dex: dexKey,
        universeSize: meta.universe?.length ?? 0,
      });
    } else {
      DevLogger.log('[MarketData] Using cached meta response', {
        dex: dexKey,
        universeSize: meta.universe?.length ?? 0,
      });
    }

    // Defensive validation - throw error to trigger retry on empty/invalid universe
    // This prevents downstream "not tradeable" messages by failing fast
    if (!meta.universe || !Array.isArray(meta.universe)) {
      const errorMsg = `Invalid universe data for DEX ${dex || 'main'} - API returned empty or invalid data`;
      DevLogger.log(`HyperLiquidProvider: ${errorMsg}`, {
        hasUniverse: !!meta.universe,
        isArray: Array.isArray(meta.universe),
        note: 'Throwing error to prevent downstream issues',
      });
      throw new Error(errorMsg);
    }

    // Special ASTER tracking for debugging
    const asterAsset = meta.universe.find(
      (asset) => asset.name === 'ASTER' || asset.name.includes('ASTER'),
    );
    if (asterAsset) {
      DevLogger.log('[MarketData] ⚠️ ASTER found in fetchMarketsForDex', {
        szDecimals: asterAsset.szDecimals,
        dex: dex || 'main',
      });
    }

    const markets = meta.universe.map((asset) => adaptMarketFromSDK(asset));

    // Apply market filtering for HIP-3 DEXs only (main DEX or skipFilters returns all markets)
    const filteredMarkets =
      skipFilters || dex === null
        ? markets // Skip filtering if requested or for main DEX
        : markets.filter((market) =>
            shouldIncludeMarket(
              market.name,
              dex,
              this.hip3Enabled,
              this.compiledAllowlistPatterns,
              this.compiledBlocklistPatterns,
            ),
          );

    // Store filtered markets in cache
    this.marketCache.set(cacheKey, {
      data: filteredMarkets,
      timestamp: Date.now(),
    });

    DevLogger.log('HyperLiquidProvider: Cached market data', {
      dex: dex || 'main',
      marketCount: filteredMarkets.length,
      filteredFrom: markets.length,
      ttlMs: PERFORMANCE_CONFIG.MARKET_DATA_CACHE_DURATION_MS,
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
    DevLogger.log('HyperLiquidProvider: USDC token ID cached', {
      tokenId: this.cachedUsdcTokenId,
    });

    return this.cachedUsdcTokenId;
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
   * This enables proper order routing - when placeOrder({ coin: "xyz:XYZ100" }) is called,
   * the asset ID lookup succeeds and the order routes to the correct DEX.
   */
  private async buildAssetMapping(): Promise<void> {
    const infoClient = this.clientService.getInfoClient();

    // Get feature-flag-validated DEXs to map (respects hip3Enabled and enabledDexs)
    const dexsToMap = await this.getValidatedDexs();

    // Use cached perpDexs array (populated by getValidatedDexs)
    const allPerpDexs = this.cachedAllPerpDexs;
    if (!allPerpDexs) {
      throw new Error(
        'perpDexs not cached - getValidatedDexs must be called first',
      );
    }

    DevLogger.log('HyperLiquidProvider: Starting asset mapping rebuild', {
      dexs: dexsToMap,
      previousMapSize: this.coinToAssetId.size,
      hip3Enabled: this.hip3Enabled,
      allowlistMarkets: this.allowlistMarkets,
      blocklistMarkets: this.blocklistMarkets,
      timestamp: new Date().toISOString(),
    });

    // Update subscription service with current feature flags
    // Extract HIP-3 DEX names (filter out null which represents main DEX)
    const enabledDexs = dexsToMap.filter((dex): dex is string => dex !== null);

    await this.subscriptionService.updateFeatureFlags(
      this.hip3Enabled,
      enabledDexs,
      this.allowlistMarkets,
      this.blocklistMarkets,
    );

    // Clear market cache when rebuilding asset mapping (feature flags changed)
    this.clearMarketCache();

    // Fetch metadata for each DEX in parallel
    const allMetas = await Promise.allSettled(
      dexsToMap.map((dex) =>
        infoClient
          .meta({ dex: dex ?? '' })
          .then((meta) => ({ dex, meta, success: true as const }))
          .catch((error) => {
            DevLogger.log(
              `HyperLiquidProvider: Failed to fetch meta for DEX ${
                dex || 'main'
              }`,
              { error },
            );
            return { dex, meta: null, success: false as const };
          }),
      ),
    );

    // Build mapping with DEX prefixes for HIP-3 DEXs using the utility function
    this.coinToAssetId.clear();

    allMetas.forEach((result) => {
      if (
        result.status === 'fulfilled' &&
        result.value.success &&
        result.value.meta
      ) {
        const { dex, meta } = result.value;

        // Validate that meta.universe exists and is an array
        if (!meta.universe || !Array.isArray(meta.universe)) {
          DevLogger.log(
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
          DevLogger.log(
            `HyperLiquidProvider: Could not find perpDexIndex for DEX ${
              dex || 'main'
            }`,
          );
          return;
        }

        // Use the utility function to build mapping for this DEX
        const { coinToAssetId } = buildAssetMapping({
          metaUniverse: meta.universe,
          dex,
          perpDexIndex,
        });

        // Merge into provider's map
        coinToAssetId.forEach((assetId, coin) => {
          this.coinToAssetId.set(coin, assetId);
        });
      }
    });

    const allKeys = Array.from(this.coinToAssetId.keys());
    const mainDexKeys = allKeys.filter((k) => !k.includes(':')).slice(0, 5);
    const hip3Keys = allKeys.filter((k) => k.includes(':')).slice(0, 10);

    DevLogger.log('HyperLiquidProvider: Asset mapping built', {
      totalAssets: this.coinToAssetId.size,
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

    DevLogger.log('HyperLiquid: Fee discount context updated', {
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
   * Logger.error(error, this.getErrorContext('placeOrder', { coin: 'BTC', orderType: 'limit' }));
   * // Creates searchable tags: feature:perps, provider:hyperliquid, network:mainnet
   * // Creates searchable context: perps_provider.method:placeOrder, perps_provider.coin:BTC, perps_provider.orderType:limit
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
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

    const estimatedTimeString =
      HYPERLIQUID_WITHDRAWAL_MINUTES > 1
        ? strings('time.minutes_format_plural', {
            count: HYPERLIQUID_WITHDRAWAL_MINUTES,
          })
        : strings('time.minutes_format', {
            count: HYPERLIQUID_WITHDRAWAL_MINUTES,
          });

    return supportedAssets.map((assetId) => ({
      assetId,
      chainId: bridgeInfo.chainId,
      contractAddress: bridgeInfo.contractAddress,
      constraints: {
        minAmount: WITHDRAWAL_CONSTANTS.DEFAULT_MIN_AMOUNT,
        estimatedTime: estimatedTimeString,
        fees: {
          fixed: WITHDRAWAL_CONSTANTS.DEFAULT_FEE_AMOUNT,
          token: WITHDRAWAL_CONSTANTS.DEFAULT_FEE_TOKEN,
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
   * Ensure builder fee approval before placing orders
   */
  private async ensureBuilderFeeApproval(): Promise<void> {
    const { isApproved, requiredDecimal } = await this.checkBuilderFeeStatus();
    const builderAddress = this.getBuilderAddress(
      this.clientService.isTestnetMode(),
    );

    if (!isApproved) {
      DevLogger.log('Builder fee approval required', {
        builder: builderAddress,
        currentApproval: isApproved,
        requiredDecimal,
      });

      const exchangeClient = this.clientService.getExchangeClient();
      const maxFeeRate = BUILDER_FEE_CONFIG.maxFeeRate;

      await exchangeClient.approveBuilderFee({
        builder: builderAddress,
        maxFeeRate,
      });

      // Verify approval was successful
      const afterApprovalDecimal = await this.checkBuilderFeeApproval();

      // this throw will block the order from being placed
      // this should ideally never happen
      if (
        afterApprovalDecimal === null ||
        afterApprovalDecimal < requiredDecimal
      ) {
        throw new Error('Builder fee approval failed or insufficient');
      }

      DevLogger.log('Builder fee approval successful', {
        builder: builderAddress,
        approvedDecimal: afterApprovalDecimal,
        maxFeeRate,
      });
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
    const requiredDecimal = BUILDER_FEE_CONFIG.maxFeeDecimal;

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
      DevLogger.log('Could not fetch main DEX balance', { error });
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
        DevLogger.log(`Could not fetch balance for DEX ${dex}`, { error });
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

    DevLogger.log('HyperLiquidProvider: HIP-3 balance check', {
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

    DevLogger.log('HyperLiquidProvider: Executing HIP-3 auto-transfer', {
      from: source.sourceDex || 'main',
      to: targetDex,
      amount: transferAmount,
    });

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

    DevLogger.log('✅ HyperLiquidProvider: HIP-3 auto-transfer complete', {
      amount: transferAmount,
      from: source.sourceDex || 'main',
      to: targetDex,
    });

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
      DevLogger.log('Auto-transfer back skipped (disabled by config)');
      return null;
    }

    try {
      DevLogger.log('Attempting auto-transfer back to main DEX', {
        sourceDex,
        freedMargin: freedMargin.toFixed(2),
        transferAll,
      });

      // Get current balance on HIP-3 DEX
      const sourceBalance = await this.getBalanceForDex({ dex: sourceDex });

      if (sourceBalance <= 0) {
        DevLogger.log('No balance to transfer back', { sourceBalance });
        return null;
      }

      // Determine transfer amount
      const transferAmount = transferAll
        ? sourceBalance
        : Math.min(freedMargin, sourceBalance);

      if (transferAmount <= 0) {
        DevLogger.log('Transfer amount too small', { transferAmount });
        return null;
      }

      DevLogger.log('Transferring back to main DEX', {
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
        DevLogger.log('❌ Auto-transfer back failed', {
          error: result.error,
        });
        return null;
      }

      DevLogger.log('✅ Auto-transfer back successful', {
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
      DevLogger.log('❌ Auto-transfer back exception', {
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
    coin: string;
    dexName: string;
    positionSize: number;
    orderPrice: number;
    leverage: number;
    isBuy: boolean;
  }): Promise<number> {
    const { coin, dexName, positionSize, orderPrice, leverage, isBuy } = params;

    // Get existing position to check if we're increasing
    const positions = await this.getPositions();
    const existingPosition = positions.find((p) => p.coin === coin);

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
          totalRequiredMargin * HIP3_MARGIN_CONFIG.BUFFER_MULTIPLIER;

        DevLogger.log(
          'HyperLiquidProvider: HIP-3 margin calculation (TOTAL margin - temporary over-funding)',
          {
            coin,
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
          requiredMargin * HIP3_MARGIN_CONFIG.BUFFER_MULTIPLIER;

        DevLogger.log(
          'HyperLiquidProvider: HIP-3 margin calculation (reducing position)',
          {
            coin,
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
        requiredMargin * HIP3_MARGIN_CONFIG.BUFFER_MULTIPLIER;

      DevLogger.log(
        'HyperLiquidProvider: HIP-3 margin calculation (new position)',
        {
          coin,
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

      DevLogger.log(
        '✅ HyperLiquidProvider: Order succeeded - post-order balance',
        {
          dex: dexName,
          transferredAmount: transferredAmount.toFixed(2),
          availableAfterOrder: leftoverAmount.toFixed(2),
          leftoverPercentage: leftoverPercentage.toFixed(2) + '%',
        },
      );

      // Auto-rebalance: Reclaim excess funds back to main DEX
      const desiredBuffer = HIP3_MARGIN_CONFIG.REBALANCE_DESIRED_BUFFER;
      const excessAmount = postOrderBalance - desiredBuffer;
      const minimumTransferThreshold =
        HIP3_MARGIN_CONFIG.REBALANCE_MIN_THRESHOLD;

      if (excessAmount > minimumTransferThreshold) {
        try {
          DevLogger.log(
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

          DevLogger.log('✅ HyperLiquidProvider: Auto-rebalance completed', {
            transferredBack: excessAmount.toFixed(2),
            from: dexName,
            to: transferInfo.sourceDex,
          });
        } catch (rebalanceError) {
          // Don't fail the order if rebalance fails (order already succeeded)
          Logger.error(
            ensureError(rebalanceError),
            this.getErrorContext('placeOrder:autoRebalance', {
              dex: dexName,
              excessAmount: excessAmount.toFixed(2),
              note: 'Auto-rebalance failed - funds remain on HIP-3 DEX',
            }),
          );
        }
      } else {
        DevLogger.log('ℹ️ HyperLiquidProvider: No auto-rebalance needed', {
          excessAmount: excessAmount.toFixed(2),
          threshold: minimumTransferThreshold.toFixed(2),
          note: 'Excess below minimum transfer threshold',
        });
      }
    } catch (balanceCheckError) {
      // Don't fail the order if balance check fails - log for monitoring
      Logger.error(
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
      DevLogger.log('HyperLiquidProvider: Rolling back failed order transfer', {
        from: dexName,
        to: transferInfo.sourceDex || 'main',
        amount: transferInfo.amount.toFixed(USDC_DECIMALS),
        reason: 'order_failed',
      });

      const rollbackResult = await this.transferBetweenDexs({
        sourceDex: dexName, // From HIP-3 DEX
        destinationDex: transferInfo.sourceDex, // Back to source
        amount: transferInfo.amount.toFixed(USDC_DECIMALS),
      });

      if (rollbackResult.success) {
        DevLogger.log('✅ HyperLiquidProvider: Rollback successful', {
          amount: transferInfo.amount.toFixed(USDC_DECIMALS),
          returnedTo: transferInfo.sourceDex || 'main',
        });
      } else {
        Logger.error(
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
      Logger.error(
        ensureError(rollbackError),
        this.getErrorContext('placeOrder:rollback:exception', {
          dex: dexName,
          amount: transferInfo.amount.toFixed(USDC_DECIMALS),
          note: 'Rollback threw exception - funds remain on HIP-3 DEX',
        }),
      );
    }
  }

  /**
   * Place an order using direct wallet signing (same as working debug test)
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      DevLogger.log('Placing order via HyperLiquid SDK:', params);

      // Validate order parameters
      const validation = validateOrderParams(params);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      await this.ensureReady();

      // Debug: Log asset map state before order placement
      const allMapKeys = Array.from(this.coinToAssetId.keys());
      const hip3Keys = allMapKeys.filter((k) => k.includes(':'));
      const assetExists = this.coinToAssetId.has(params.coin);
      DevLogger.log('HyperLiquidProvider: Asset map state at order time', {
        requestedCoin: params.coin,
        assetExistsInMap: assetExists,
        totalAssetsInMap: this.coinToAssetId.size,
        hip3AssetsCount: hip3Keys.length,
        hip3AssetsSample: hip3Keys.slice(0, 10),
        hip3Enabled: this.hip3Enabled,
        allowlistMarkets: this.allowlistMarkets,
        blocklistMarkets: this.blocklistMarkets,
      });

      // Ensure builder fee approval and referral code are set before placing any order
      await Promise.all([
        this.ensureBuilderFeeApproval(),
        this.ensureReferralSet(),
      ]);

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(params.coin);

      // Get asset info from the correct DEX
      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta({ dex: dexName ?? '' });

      if (!meta.universe || !Array.isArray(meta.universe)) {
        throw new Error(
          `Invalid universe data for DEX ${
            dexName || 'main'
          } when placing order for ${params.coin}`,
        );
      }

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find(
        (asset) => asset.name === params.coin,
      );
      if (!assetInfo) {
        throw new Error(
          `Asset ${params.coin} not found in ${dexName || 'main'} DEX universe`,
        );
      }

      // Use provided current price or fetch if not provided
      let currentPrice: number;
      if (params.currentPrice && params.currentPrice > 0) {
        currentPrice = params.currentPrice;
        DevLogger.log('Using provided current price:', {
          coin: params.coin,
          providedPrice: currentPrice,
          source: 'UI price feed',
        });
      } else {
        DevLogger.log('Fetching current price via API (fallback)');
        const mids = await infoClient.allMids({ dex: dexName ?? '' });
        // allMids returns prices keyed by asset name ("BTC" or "xyz:XYZ100")
        currentPrice = parseFloat(mids[params.coin] || '0');
        if (currentPrice === 0) {
          throw new Error(`No price available for ${params.coin}`);
        }
      }

      // Calculate order parameters using the same logic as debug test
      let orderPrice: number;
      let formattedSize: string;

      if (params.orderType === 'market') {
        // For market orders, calculate position size and add slippage
        const positionSize = parseFloat(params.size);
        const slippage = params.slippage ?? 0.01; // Default to 1% slippage if not specified
        orderPrice = params.isBuy
          ? currentPrice * (1 + slippage) // Buy above market
          : currentPrice * (1 - slippage); // Sell below market
        formattedSize = formatHyperLiquidSize({
          size: positionSize,
          szDecimals: assetInfo.szDecimals,
        });
      } else {
        // For limit orders, use provided price and size
        orderPrice = parseFloat(params.price || '0');
        formattedSize = formatHyperLiquidSize({
          size: parseFloat(params.size),
          szDecimals: assetInfo.szDecimals,
        });
      }

      const formattedPrice = formatHyperLiquidPrice({
        price: orderPrice,
        szDecimals: assetInfo.szDecimals,
      });

      // Get the asset ID for this DEX
      // Each DEX has its own universe with indices starting from 0
      // e.g., xyz:XYZ100 is at index 0 in xyz DEX, BTC is at index 0 in main DEX
      const assetId = this.coinToAssetId.get(params.coin);
      if (assetId === undefined) {
        DevLogger.log('HyperLiquidProvider: Asset ID lookup failed', {
          requestedCoin: params.coin,
          dexName: dexName || 'main',
          mapSize: this.coinToAssetId.size,
          mapContainsAsset: this.coinToAssetId.has(params.coin),
          allKeys: Array.from(this.coinToAssetId.keys()).slice(0, 20),
        });
        throw new Error(`Asset ID not found for ${params.coin}`);
      }

      DevLogger.log('HyperLiquidProvider: Resolved DEX-specific asset ID', {
        coin: params.coin,
        dex: dexName || 'main',
        assetId,
        note: `Asset ID ${assetId} is correct for ${params.coin} in ${
          dexName || 'main'
        } DEX`,
      });

      // Update leverage if specified
      if (params.leverage) {
        DevLogger.log('Updating leverage before order:', {
          coin: params.coin,
          assetId,
          requestedLeverage: params.leverage,
          leverageType: 'isolated', // Default to isolated leverage
        });

        const exchangeClient = this.clientService.getExchangeClient();
        const leverageResult = await exchangeClient.updateLeverage({
          asset: assetId,
          isCross: false, // Default to isolated leverage for now
          leverage: params.leverage,
        });

        if (leverageResult.status !== 'ok') {
          throw new Error(
            `Failed to update leverage: ${JSON.stringify(leverageResult)}`,
          );
        }

        DevLogger.log('Leverage updated successfully:', {
          coin: params.coin,
          leverage: params.leverage,
        });
      }

      // HIP-3 balance management: native abstraction or programmatic transfer
      const isHip3Order = dexName !== null;
      let transferInfo: { amount: number; sourceDex: string } | null = null;

      if (isHip3Order && !this.useDexAbstraction) {
        // Manual auto-transfer logic (when DEX abstraction is disabled)
        DevLogger.log('HyperLiquidProvider: Using manual auto-transfer', {
          coin: params.coin,
          dex: dexName,
        });

        // Calculate required margin based on existing position
        const positionSize = parseFloat(formattedSize);
        const effectiveLeverage = params.leverage || assetInfo.maxLeverage || 1;

        const requiredMarginWithBuffer = await this.calculateHip3RequiredMargin(
          {
            coin: params.coin,
            dexName,
            positionSize,
            orderPrice,
            leverage: effectiveLeverage,
            isBuy: params.isBuy,
          },
        );

        // Transfer funds to reach required TOTAL margin in available balance
        // autoTransferForHip3Order checks current balance and only transfers shortfall
        try {
          transferInfo = await this.autoTransferForHip3Order({
            targetDex: dexName,
            requiredMargin: requiredMarginWithBuffer,
          });
        } catch (transferError) {
          // Reactive fix: Check if transfer failed because DEX abstraction is actually enabled
          const errorMsg = (transferError as Error)?.message || '';

          if (
            errorMsg.includes('Cannot transfer with DEX abstraction enabled')
          ) {
            DevLogger.log(
              'HyperLiquidProvider: Detected DEX abstraction is enabled, switching to abstraction mode',
            );

            // Update flag to prevent this issue on future orders
            this.useDexAbstraction = true;

            // Continue without manual transfer - let DEX abstraction handle it
            transferInfo = null;
          } else {
            // Different error - rethrow
            throw transferError;
          }
        }
      } else if (isHip3Order && this.useDexAbstraction) {
        DevLogger.log(
          'HyperLiquidProvider: Using DEX abstraction (no manual transfer)',
          {
            coin: params.coin,
            dex: dexName,
            note: 'HyperLiquid will auto-manage collateral',
          },
        );
      }

      // Build orders array - main order plus optional TP/SL orders
      const orders: SDKOrderParams[] = [];

      // 1. Main order (always present)
      const mainOrder: SDKOrderParams = {
        a: assetId,
        b: params.isBuy,
        p: formattedPrice,
        s: formattedSize,
        r: params.reduceOnly || false,
        /**
         * HyperLiquid Time-In-Force (TIF) options:
         * - 'Gtc' (Good Till Canceled): Standard limit orders that remain active until filled or canceled
         * - 'Ioc' (Immediate or Cancel): Limit orders that fill immediately or cancel unfilled portion
         * - 'FrontendMarket': True market orders as used in HyperLiquid UI - USE THIS FOR MARKET ORDERS
         * - 'Alo' (Add Liquidity Only): Maker-only orders that add liquidity to order book
         * - 'LiquidationMarket': Similar to IoC, used for liquidation orders
         *
         * IMPORTANT: Use 'FrontendMarket' for market orders, NOT 'Ioc'
         * HyperLiquid treats 'Ioc' as limit orders, causing incorrect order type display
         */
        t:
          params.orderType === 'limit'
            ? { limit: { tif: 'Gtc' } } // Standard limit order
            : { limit: { tif: 'FrontendMarket' } }, // True market order
        c: params.clientOrderId ? (params.clientOrderId as Hex) : undefined,
      };
      orders.push(mainOrder);

      // 2. Take Profit order (if specified)
      if (params.takeProfitPrice) {
        const tpOrder: SDKOrderParams = {
          a: assetId,
          b: !params.isBuy, // Opposite side to close position
          p: formatHyperLiquidPrice({
            price: parseFloat(params.takeProfitPrice),
            szDecimals: assetInfo.szDecimals,
          }),
          s: formattedSize, // Same size as main order
          r: true, // Always reduce-only for TP
          t: {
            trigger: {
              isMarket: false, // Limit order when triggered
              triggerPx: formatHyperLiquidPrice({
                price: parseFloat(params.takeProfitPrice),
                szDecimals: assetInfo.szDecimals,
              }),
              tpsl: 'tp',
            },
          },
        };
        orders.push(tpOrder);
      }

      // 3. Stop Loss order (if specified)
      if (params.stopLossPrice) {
        const slOrder: SDKOrderParams = {
          a: assetId,
          b: !params.isBuy, // Opposite side to close position
          p: formatHyperLiquidPrice({
            price: parseFloat(params.stopLossPrice),
            szDecimals: assetInfo.szDecimals,
          }),
          s: formattedSize, // Same size as main order
          r: true, // Always reduce-only for SL
          t: {
            trigger: {
              isMarket: true, // Market order when triggered for faster execution
              triggerPx: formatHyperLiquidPrice({
                price: parseFloat(params.stopLossPrice),
                szDecimals: assetInfo.szDecimals,
              }),
              tpsl: 'sl',
            },
          },
        };
        orders.push(slOrder);
      }

      // 4. Determine grouping - use explicit override or smart defaults
      const grouping =
        params.grouping ||
        (params.takeProfitPrice || params.stopLossPrice ? 'normalTpsl' : 'na');

      // 5. Calculate discounted builder fee if reward discount is active
      let builderFee = BUILDER_FEE_CONFIG.maxFeeTenthsBps;
      if (this.userFeeDiscountBips !== undefined) {
        builderFee = Math.floor(
          builderFee * (1 - this.userFeeDiscountBips / BASIS_POINTS_DIVISOR),
        );
        DevLogger.log('HyperLiquid: Applying builder fee discount', {
          originalFee: BUILDER_FEE_CONFIG.maxFeeTenthsBps,
          discountBips: this.userFeeDiscountBips,
          discountedFee: builderFee,
        });
      }

      // 6. Submit order with atomic rollback for HIP-3 failures
      // Asset ID determines routing (main DEX: direct index, HIP-3: BASE_ASSET_ID + dexIndex*DEX_MULTIPLIER + coinIndex)
      // The exchange client handles all DEXs through a single instance
      const exchangeClient = this.clientService.getExchangeClient();

      DevLogger.log(
        'HyperLiquidProvider: Submitting order via asset ID routing',
        {
          coin: params.coin,
          assetId: orders[0].a,
          orderCount: orders.length,
          mainOrder: orders[0],
          dexName: dexName || 'main',
          isHip3: !!dexName,
        },
      );

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
          status && 'resting' in status ? status.resting : null;
        const filledOrder = status && 'filled' in status ? status.filled : null;

        // Order succeeded - auto-rebalance excess funds back to main DEX
        if (isHip3Order && transferInfo && dexName) {
          await this.handleHip3PostOrderRebalance({ dexName, transferInfo });
        }

        return {
          success: true,
          orderId:
            restingOrder?.oid?.toString() || filledOrder?.oid?.toString(),
          filledSize: filledOrder?.totalSz,
          averagePrice: filledOrder?.avgPx,
        };
      } catch (orderError) {
        // Order failed - rollback HIP-3 transfer if funds were moved
        if (transferInfo && dexName) {
          await this.handleHip3OrderRollback({ dexName, transferInfo });
        }
        throw orderError;
      }
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('placeOrder', {
          coin: params.coin,
          orderType: params.orderType,
          isBuy: params.isBuy,
        }),
      );
      const mappedError = this.mapError(error);
      return createErrorResult(mappedError, { success: false });
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
      DevLogger.log('Editing order:', params);

      await this.ensureReady();

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(params.newOrder.coin);

      // Get asset info and prices
      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta({ dex: dexName ?? '' });
      const mids = await infoClient.allMids({ dex: dexName ?? '' });

      if (!meta.universe || !Array.isArray(meta.universe)) {
        throw new Error(
          `Invalid universe data for DEX ${
            dexName || 'main'
          } when editing order for ${params.newOrder.coin}`,
        );
      }

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find(
        (asset) => asset.name === params.newOrder.coin,
      );
      if (!assetInfo) {
        throw new Error(
          `Asset ${params.newOrder.coin} not found in ${
            dexName || 'main'
          } DEX universe`,
        );
      }

      const currentPrice = parseFloat(mids[params.newOrder.coin] || '0');
      if (currentPrice === 0) {
        throw new Error(`No price available for ${params.newOrder.coin}`);
      }

      // Calculate order parameters using the same logic as placeOrder
      let orderPrice: number;
      let formattedSize: string;

      if (params.newOrder.orderType === 'market') {
        const positionSize = parseFloat(params.newOrder.size);
        const slippage = params.newOrder.slippage ?? 0.01; // Default to 1% slippage if not specified
        orderPrice = params.newOrder.isBuy
          ? currentPrice * (1 + slippage)
          : currentPrice * (1 - slippage);
        formattedSize = formatHyperLiquidSize({
          size: positionSize,
          szDecimals: assetInfo.szDecimals,
        });
      } else {
        orderPrice = parseFloat(params.newOrder.price || '0');
        formattedSize = formatHyperLiquidSize({
          size: parseFloat(params.newOrder.size),
          szDecimals: assetInfo.szDecimals,
        });
      }

      const formattedPrice = formatHyperLiquidPrice({
        price: orderPrice,
        szDecimals: assetInfo.szDecimals,
      });
      const assetId = this.coinToAssetId.get(params.newOrder.coin);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${params.newOrder.coin}`);
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('editOrder', {
          orderId: params.orderId,
          coin: params.newOrder.coin,
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
      DevLogger.log('Canceling order:', params);

      // Validate coin exists
      const coinValidation = validateCoinExists(
        params.coin,
        this.coinToAssetId,
      );
      if (!coinValidation.isValid) {
        throw new Error(coinValidation.error);
      }

      await this.ensureReady();

      const exchangeClient = this.clientService.getExchangeClient();
      const asset = this.coinToAssetId.get(params.coin);
      if (asset === undefined) {
        throw new Error(`Asset not found for coin: ${params.coin}`);
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrder', {
          orderId: params.orderId,
          coin: params.coin,
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
      DevLogger.log('Batch canceling orders:', {
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

      const exchangeClient = this.clientService.getExchangeClient();

      // Map orders to SDK format and validate coins
      const cancelRequests = params.map((order) => {
        const asset = this.coinToAssetId.get(order.coin);
        if (asset === undefined) {
          throw new Error(`Asset not found for coin: ${order.coin}`);
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
          coin: params[index].coin,
          success: status === 'success',
          error:
            status !== 'success'
              ? (status as { error: string }).error
              : undefined,
        })),
      };
    } catch (error) {
      Logger.error(
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
          coin: order.coin,
          success: false,
          error: error instanceof Error ? error.message : 'Batch cancel failed',
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

      // Get all current positions
      // Force fresh API data (not WebSocket cache) since we're about to mutate positions
      const positions = await this.getPositions({ skipCache: true });

      // Filter positions based on params
      positionsToClose =
        params.closeAll || !params.coins || params.coins.length === 0
          ? positions
          : positions.filter((p) => params.coins?.includes(p.coin));

      DevLogger.log('Batch closing positions:', {
        count: positionsToClose.length,
        closeAll: params.closeAll,
        coins: params.coins,
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

      // Track HIP-3 positions and freed margins for post-close transfers
      const hip3Transfers: {
        sourceDex: string;
        freedMargin: number;
      }[] = [];

      // Build orders array
      const orders: SDKOrderParams[] = [];

      for (const position of positionsToClose) {
        // Extract DEX name for HIP-3 positions
        const { dex: dexName } = parseAssetName(position.coin);
        const isHip3Position = position.coin.includes(':');

        // Get asset info for formatting
        const meta = await infoClient.meta({ dex: dexName ?? '' });
        if (!meta.universe || !Array.isArray(meta.universe)) {
          throw new Error(`Invalid universe data for ${position.coin}`);
        }

        const assetInfo = meta.universe.find(
          (asset) => asset.name === position.coin,
        );
        if (!assetInfo) {
          throw new Error(
            `Asset ${position.coin} not found in ${
              dexName || 'main'
            } DEX universe`,
          );
        }

        // Get asset ID
        const assetId = this.coinToAssetId.get(position.coin);
        if (assetId === undefined) {
          throw new Error(`Asset ID not found for ${position.coin}`);
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
        const currentPrice = parseFloat(mids[position.coin] || '0');
        if (currentPrice === 0) {
          throw new Error(`No price available for ${position.coin}`);
        }

        // Calculate order price with slippage
        const slippage = TRADING_DEFAULTS.slippage;
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
      let builderFee = BUILDER_FEE_CONFIG.maxFeeTenthsBps;
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
        (s) => 'filled' in s || 'resting' in s,
      ).length;
      const failureCount = statuses.length - successCount;

      // Handle HIP-3 margin transfers for successful closes
      if (!this.useDexAbstraction) {
        for (let i = 0; i < statuses.length; i++) {
          const status = statuses[i];
          const isSuccess = 'filled' in status || 'resting' in status;

          if (isSuccess && hip3Transfers[i]) {
            const { sourceDex, freedMargin } = hip3Transfers[i];
            DevLogger.log(
              'Position closed successfully, initiating manual auto-transfer back',
              { coin: positionsToClose[i].coin, freedMargin },
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
          coin: positionsToClose[index].coin,
          success: 'filled' in status || 'resting' in status,
          error:
            'error' in status ? (status as { error: string }).error : undefined,
        })),
      };
    } catch (error) {
      Logger.error(
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
          coin: position.coin,
          success: false,
          error: error instanceof Error ? error.message : 'Batch close failed',
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
   * @param params.coin - Asset symbol of the position
   * @param params.takeProfitPrice - TP price (undefined to remove)
   * @param params.stopLossPrice - SL price (undefined to remove)
   */
  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    try {
      DevLogger.log('Updating position TP/SL:', params);

      const { coin, takeProfitPrice, stopLossPrice } = params;

      // Get current position to validate it exists
      // Force fresh API data (not WebSocket cache) since we're about to mutate the position
      let positions: Position[];
      try {
        positions = await this.getPositions({ skipCache: true });
      } catch (error) {
        Logger.error(
          ensureError(error),
          this.getErrorContext('updatePositionTPSL > getPositions', {
            coin,
          }),
        );
        throw error;
      }

      const position = positions.find((p) => p.coin === coin);

      if (!position) {
        throw new Error(`No position found for ${coin}`);
      }

      const positionSize = Math.abs(parseFloat(position.size));
      const isLong = parseFloat(position.size) > 0;

      await this.ensureReady();

      await Promise.all([
        this.ensureBuilderFeeApproval(),
        this.ensureReferralSet(),
      ]);

      // Get current price for the asset
      const infoClient = this.clientService.getInfoClient();
      const exchangeClient = this.clientService.getExchangeClient();
      const userAddress = await this.walletService.getUserAddressWithDefault();

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(coin);

      // Fetch current price for this asset's DEX
      const mids = await infoClient.allMids(
        dexName ? { dex: dexName } : undefined,
      );
      const currentPrice = parseFloat(mids[coin] || '0');

      if (currentPrice === 0) {
        throw new Error(`No price available for ${coin}`);
      }

      // Cancel existing TP/SL orders for this position across all DEXs
      DevLogger.log('Fetching open orders to cancel existing TP/SL...');
      const orderResults = await this.queryUserDataAcrossDexs(
        { user: userAddress },
        (p) => infoClient.frontendOpenOrders(p),
      );

      // Combine orders from all DEXs
      const allOrders = orderResults.flatMap((result) => result.data);

      const tpslOrdersToCancel = allOrders.filter(
        (order) =>
          order.coin === coin &&
          order.reduceOnly === true &&
          order.isPositionTpsl === !!TP_SL_CONFIG.USE_POSITION_BOUND_TPSL &&
          order.isTrigger === true &&
          (order.orderType.includes('Take Profit') ||
            order.orderType.includes('Stop')),
      );

      if (tpslOrdersToCancel.length > 0) {
        DevLogger.log(
          `Canceling ${tpslOrdersToCancel.length} existing TP/SL orders for ${coin}`,
        );
        const assetId = this.coinToAssetId.get(coin);
        if (assetId === undefined) {
          throw new Error(`Asset ID not found for ${coin}`);
        }
        const cancelRequests = tpslOrdersToCancel.map((order) => ({
          a: assetId,
          o: order.oid,
        }));

        const cancelResult = await exchangeClient.cancel({
          cancels: cancelRequests,
        });
        DevLogger.log('Cancel result:', cancelResult);
      }

      // Get asset info (dexName already extracted above)
      const meta = await infoClient.meta({ dex: dexName ?? '' });

      // Check if meta is an error response (string) or doesn't have universe property
      if (
        !meta ||
        typeof meta === 'string' ||
        !meta.universe ||
        !Array.isArray(meta.universe)
      ) {
        DevLogger.log('Failed to fetch metadata for asset mapping', {
          meta,
          dex: dexName || 'main',
        });
        throw new Error(
          `Failed to fetch market metadata for DEX ${dexName || 'main'}`,
        );
      }

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find((asset) => asset.name === coin);
      if (!assetInfo) {
        throw new Error(
          `Asset ${coin} not found in ${dexName || 'main'} DEX universe`,
        );
      }

      const assetId = this.coinToAssetId.get(coin);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${coin}`);
      }

      // Build orders array for TP/SL
      const orders: SDKOrderParams[] = [];

      const size = TP_SL_CONFIG.USE_POSITION_BOUND_TPSL
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
        DevLogger.log('No new TP/SL orders to place - existing ones cancelled');
        return {
          success: true,
          // No orderId since we only cancelled orders, didn't place new ones
        };
      }

      // Calculate discounted builder fee if reward discount is active
      let builderFee = BUILDER_FEE_CONFIG.maxFeeTenthsBps;
      if (this.userFeeDiscountBips !== undefined) {
        builderFee = Math.floor(
          builderFee * (1 - this.userFeeDiscountBips / BASIS_POINTS_DIVISOR),
        );
        DevLogger.log('HyperLiquid: Applying builder fee discount to TP/SL', {
          originalFee: BUILDER_FEE_CONFIG.maxFeeTenthsBps,
          discountBips: this.userFeeDiscountBips,
          discountedFee: builderFee,
        });
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('updatePositionTPSL', {
          coin: params.coin,
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
      DevLogger.log('Closing position:', params);

      // Force fresh API data (not WebSocket cache) since we're about to mutate the position
      const positions = await this.getPositions({ skipCache: true });
      const position = positions.find((p) => p.coin === params.coin);

      if (!position) {
        throw new Error(`No position found for ${params.coin}`);
      }

      const positionSize = parseFloat(position.size);
      const isBuy = positionSize < 0;
      const closeSize = params.size || Math.abs(positionSize).toString();

      // Capture position details BEFORE closing for freed margin calculation
      const totalMarginUsed = parseFloat(position.marginUsed);
      const totalPositionSize = Math.abs(positionSize);
      const closeSizeNum = parseFloat(closeSize);
      const isHip3Position = position.coin.includes(':');
      const hip3Dex = isHip3Position ? position.coin.split(':')[0] : null;

      // Calculate freed margin proportionally
      const freedMarginRatio = closeSizeNum / totalPositionSize;
      const freedMargin = totalMarginUsed * freedMarginRatio;

      DevLogger.log('Position close details', {
        coin: position.coin,
        isHip3Position,
        hip3Dex,
        totalMarginUsed,
        closedSize: closeSize,
        freedMargin: freedMargin.toFixed(2),
      });

      // Execute position close
      const result = await this.placeOrder({
        coin: params.coin,
        isBuy,
        size: closeSize,
        orderType: params.orderType || 'market',
        price: params.price,
        reduceOnly: true,
      });

      // Return freed margin using native abstraction or programmatic transfer
      if (
        result.success &&
        isHip3Position &&
        hip3Dex &&
        !this.useDexAbstraction
      ) {
        DevLogger.log(
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
        DevLogger.log(
          'Position closed - DEX abstraction will auto-return freed margin',
          {
            coin: params.coin,
            dex: hip3Dex,
            note: 'HyperLiquid handles return automatically',
          },
        );
      }

      return result;
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('closePosition', {
          coin: params.coin,
          orderType: params.orderType,
        }),
      );
      return createErrorResult(error, { success: false });
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
        DevLogger.log('Using cached positions from WebSocket', {
          count: cachedPositions.length,
        });
        return cachedPositions;
      }

      // Fallback to API call
      DevLogger.log(
        'Fetching positions via API',
        params?.skipCache ? '(skipCache requested)' : '(cache not initialized)',
      );

      await this.ensureReady();

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

      DevLogger.log('Frontend open orders (all DEXs):', {
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
            // First check direct trigger orders
            const positionOrders = allOrders.filter(
              (order) =>
                order.coin === position.coin &&
                order.isTrigger &&
                order.reduceOnly,
            );

            // Also check for parent orders that might have TP/SL children
            const parentOrdersWithChildren = allOrders.filter(
              (order) =>
                order.coin === position.coin &&
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
                DevLogger.log(`Found TP order for ${position.coin}:`, {
                  triggerPrice: order.triggerPx,
                  orderId: order.oid,
                  orderType: order.orderType,
                  isPositionTpsl: order.isPositionTpsl,
                });
              } else if (
                order.orderType === 'Stop Market' ||
                order.orderType === 'Stop Limit'
              ) {
                stopLossPrice = order.triggerPx;
                DevLogger.log(`Found SL order for ${position.coin}:`, {
                  triggerPrice: order.triggerPx,
                  orderId: order.oid,
                  orderType: order.orderType,
                  isPositionTpsl: order.isPositionTpsl,
                });
              }
            });

            // Check child orders (for normalTpsl grouping)
            parentOrdersWithChildren.forEach((parentOrder) => {
              DevLogger.log(
                `Parent order with children for ${position.coin}:`,
                {
                  parentOid: parentOrder.oid,
                  childrenCount: parentOrder.children.length,
                },
              );

              parentOrder.children.forEach((childOrder: FrontendOrder) => {
                if (childOrder.isTrigger && childOrder.reduceOnly) {
                  if (
                    childOrder.orderType === 'Take Profit Market' ||
                    childOrder.orderType === 'Take Profit Limit'
                  ) {
                    takeProfitPrice = childOrder.triggerPx;
                    DevLogger.log(
                      `Found TP child order for ${position.coin}:`,
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
                    DevLogger.log(
                      `Found SL child order for ${position.coin}:`,
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
      DevLogger.log('Error getting positions:', error);
      return [];
    }
  }

  /**
   * Get historical user fills (trade executions)
   */
  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    try {
      DevLogger.log('Getting user fills via HyperLiquid SDK:', params);
      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      const rawFills = await infoClient.userFills({
        user: userAddress,
        aggregateByTime: params?.aggregateByTime || false,
      });

      DevLogger.log('User fills received:', rawFills);

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
      DevLogger.log('Error getting user fills:', error);
      return [];
    }
  }

  /**
   * Get historical orders (order lifecycle)
   */
  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    try {
      DevLogger.log('Getting user orders via HyperLiquid SDK:', params);
      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      const rawOrders = await infoClient.historicalOrders({
        user: userAddress,
      });

      DevLogger.log('User orders received:', rawOrders);

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
      DevLogger.log('Error getting user orders:', error);
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
        DevLogger.log('Using cached open orders from WebSocket', {
          count: cachedOrders.length,
        });
        return cachedOrders;
      }

      // Fallback to API call
      DevLogger.log(
        'Fetching open orders via API',
        params?.skipCache ? '(skipCache requested)' : '(cache not initialized)',
      );
      await this.ensureReady();

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

      DevLogger.log('Currently open orders received (all DEXs):', {
        count: rawOrders.length,
      });

      // Transform HyperLiquid open orders to abstract Order type using adapter
      const orders: Order[] = (rawOrders || []).map((order) => {
        const position = positions.find((p) => p.coin === order.coin);
        return adaptOrderFromSDK(order, position);
      });

      return orders;
    } catch (error) {
      DevLogger.log('Error getting currently open orders:', error);
      return [];
    }
  }

  /**
   * Get user funding history
   */
  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    try {
      DevLogger.log('Getting user funding via HyperLiquid SDK:', params);
      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      const rawFunding = await infoClient.userFunding({
        user: userAddress,
        startTime: params?.startTime || 0,
        endTime: params?.endTime,
      });

      DevLogger.log('User funding received:', rawFunding);

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
      DevLogger.log('Error getting user funding:', error);
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
      await this.ensureReady();

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
      Logger.error(
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
      await this.ensureReady();

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
      Logger.error(ensureError(error), this.getErrorContext('getUserHistory'));
      return [];
    }
  }

  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    try {
      DevLogger.log(
        'Getting historical portfolio via HyperLiquid SDK:',
        params,
      );
      await this.ensureReady();

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

      DevLogger.log('Historical portfolio result:', result);
      return result;
    } catch (error) {
      DevLogger.log('Error getting historical portfolio:', error);
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
      DevLogger.log('Getting account state via HyperLiquid SDK');

      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      DevLogger.log('User address for account state:', userAddress);
      DevLogger.log(
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

      DevLogger.log('Spot state:', spotState);
      DevLogger.log('Perps states (all DEXs):', {
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
          DevLogger.log(`DEX ${dex || 'main'} account state:`, {
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

      DevLogger.log('Aggregated account state:', aggregatedAccountState);

      return aggregatedAccountState;
    } catch (error) {
      Logger.error(
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
      await this.ensureReady();

      // Path 1: Symbol filtering - group by DEX and fetch in parallel
      if (params?.symbols && params.symbols.length > 0) {
        DevLogger.log(
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
            this.fetchMarketsForDex(dex, params?.skipFilters),
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
          DevLogger.log('HyperLiquidProvider: Fetching markets from DEXs', {
            dexCount: dexsToQuery.length,
            skipFilters: params?.skipFilters || false,
          });

          const marketArrays = await Promise.all(
            dexsToQuery.map(async (dex) => {
              try {
                return await this.fetchMarketsForDex(dex, params?.skipFilters);
              } catch (error) {
                Logger.error(
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
      DevLogger.log('HyperLiquidProvider: Getting markets for single DEX', {
        dex: params?.dex || 'main',
      });

      return await this.fetchMarketsForDex(
        params?.dex ?? null,
        params?.skipFilters,
      );
    } catch (error) {
      Logger.error(
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
      await this.ensureReady();

      if (!this.hip3Enabled) {
        DevLogger.log('HIP-3 disabled, no DEXs available');
        return [];
      }

      const infoClient = this.clientService.getInfoClient();

      // Get all DEXs from API
      const allDexs = await infoClient.perpDexs();

      if (!allDexs || !Array.isArray(allDexs)) {
        DevLogger.log('perpDexs() returned invalid data');
        return [];
      }

      // Extract HIP-3 DEX names (filter out null which is main DEX)
      const hip3DexNames: string[] = [];
      allDexs.forEach((dex) => {
        if (dex !== null && 'name' in dex) {
          hip3DexNames.push(dex.name);
        }
      });

      DevLogger.log(
        `Found ${hip3DexNames.length} HIP-3 DEXs from perpDexs() API`,
      );

      // Filter to only DEXs that have markets
      const dexsWithMarkets: string[] = [];
      await Promise.all(
        hip3DexNames.map(async (dexName) => {
          try {
            const meta = await infoClient.meta({ dex: dexName });
            if (
              meta.universe &&
              Array.isArray(meta.universe) &&
              meta.universe.length > 0
            ) {
              dexsWithMarkets.push(dexName);
              DevLogger.log(`  ✅ ${dexName}: ${meta.universe.length} markets`);
            } else {
              DevLogger.log(`  ⚠️ ${dexName}: no markets`);
            }
          } catch (error) {
            DevLogger.log(`  ❌ ${dexName}: error querying`, error);
          }
        }),
      );

      DevLogger.log(
        `${dexsWithMarkets.length} DEXs have markets:`,
        dexsWithMarkets,
      );
      return dexsWithMarkets.sort((a, b) => a.localeCompare(b));
    } catch (error) {
      Logger.error(
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
    DevLogger.log('Getting market data with prices via HyperLiquid SDK');

    await this.ensureReady();

    const infoClient = this.clientService.getInfoClient();

    // Get enabled DEXs respecting feature flags
    const enabledDexs = await this.getValidatedDexs();

    // Fetch meta, assetCtxs, and allMids for each enabled DEX in parallel
    const dexDataResults = await Promise.all(
      enabledDexs.map(async (dex) => {
        const dexParam = dex ?? '';
        try {
          const [meta, metaAndCtxs, dexAllMids] = await Promise.all([
            infoClient.meta(dexParam ? { dex: dexParam } : undefined),
            infoClient.metaAndAssetCtxs(
              dexParam ? { dex: dexParam } : undefined,
            ),
            infoClient.allMids(dexParam ? { dex: dexParam } : undefined),
          ]);

          return {
            dex,
            meta,
            assetCtxs: metaAndCtxs?.[1] || [],
            allMids: dexAllMids || {},
            success: true,
          };
        } catch (error) {
          Logger.error(
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

    DevLogger.log('HyperLiquidProvider: Aggregated market data from all DEXs', {
      dexCount: enabledDexs.length,
      totalMarkets: combinedUniverse.length,
      mainDexMarkets: dexDataResults[0]?.meta?.universe?.length || 0,
      hip3Markets:
        combinedUniverse.length -
        (dexDataResults[0]?.meta?.universe?.length || 0),
    });

    // Debug: Log combinedAllMids to diagnose price lookup issues
    const hip3Keys = Object.keys(combinedAllMids).filter((k) =>
      k.includes(':'),
    );
    DevLogger.log('Combined allMids price data:', {
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
        coin: params.coin,
        size: params.size,
        price: params.price,
      });
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Check minimum order size using consistent defaults (matching useMinimumOrderAmount hook)
      // Note: For full validation with market-specific limits, use async methods
      const coinAmount = parseFloat(params.size || '0');
      const minimumOrderSize = this.clientService.isTestnetMode()
        ? TRADING_DEFAULTS.amount.testnet
        : TRADING_DEFAULTS.amount.mainnet;

      // Convert coin amount to USD value for comparison with minimum
      // Price is required for proper validation
      if (!params.currentPrice) {
        return {
          isValid: false,
          error: strings('perps.order.validation.price_required'),
        };
      }

      const orderValueUSD = coinAmount * params.currentPrice;

      if (orderValueUSD < minimumOrderSize) {
        return {
          isValid: false,
          error: strings('perps.order.validation.minimum_amount', {
            amount: minimumOrderSize.toString(),
          }),
        };
      }

      // Asset-specific leverage validation
      if (params.leverage && params.coin) {
        try {
          const maxLeverage = await this.getMaxLeverage(params.coin);
          if (params.leverage < 1 || params.leverage > maxLeverage) {
            return {
              isValid: false,
              error: strings('perps.order.validation.invalid_leverage', {
                min: '1',
                max: maxLeverage.toString(),
              }),
            };
          }
        } catch (error) {
          // Log the error before falling back
          DevLogger.log('Failed to get max leverage for symbol', error);
          // If we can't get max leverage, use the default as fallback
          const defaultMaxLeverage = PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
          if (params.leverage < 1 || params.leverage > defaultMaxLeverage) {
            return {
              isValid: false,
              error: strings('perps.order.validation.invalid_leverage', {
                min: '1',
                max: defaultMaxLeverage.toString(),
              }),
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
          error: strings('perps.order.validation.leverage_below_position', {
            required: params.existingPositionLeverage.toString(),
            provided: params.leverage.toString(),
          }),
        };
      }

      // Validate order value against max limits
      if (params.currentPrice && params.leverage) {
        try {
          const maxLeverage = await this.getMaxLeverage(params.coin);

          const maxOrderValue = getMaxOrderValue(maxLeverage, params.orderType);
          const orderValue = parseFloat(params.size) * params.currentPrice;

          if (orderValue > maxOrderValue) {
            return {
              isValid: false,
              error: strings('perps.order.validation.max_order_value', {
                maxValue: formatPerpsFiat(maxOrderValue, {
                  minimumDecimals: 0,
                  maximumDecimals: 0,
                }).replace('$', ''),
              }),
            };
          }
        } catch (error) {
          DevLogger.log('Failed to validate max order value', error);
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
            : strings('perps.errors.unknownError'),
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
      if (!params.coin) {
        return {
          isValid: false,
          error: strings('perps.errors.orderValidation.coinRequired'),
        };
      }

      // If closing with limit order, must have price
      if (params.orderType === 'limit' && !params.price) {
        return {
          isValid: false,
          error: strings('perps.order.validation.limit_price_required'),
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
            error: strings('perps.order.validation.minimum_amount', {
              amount: minimumOrderSize.toString(),
            }),
          };
        }

        // Enforce minimum order value for partial closes when price known
        if (orderValueUSD !== undefined && orderValueUSD < minimumOrderSize) {
          return {
            isValid: false,
            error: strings('perps.order.validation.minimum_amount', {
              amount: minimumOrderSize.toString(),
            }),
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
            : strings('perps.errors.unknownError'),
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
      DevLogger.log('HyperLiquidProvider: STARTING WITHDRAWAL', {
        params,
        timestamp: new Date().toISOString(),
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination,
        isTestnet: this.clientService.isTestnetMode(),
      });

      // Step 1: Validate withdrawal parameters
      DevLogger.log('HyperLiquidProvider: VALIDATING PARAMETERS');
      const validation = validateWithdrawalParams(params);
      if (!validation.isValid) {
        DevLogger.log('❌ HyperLiquidProvider: PARAMETER VALIDATION FAILED', {
          error: validation.error,
          params,
          validationResult: validation,
        });
        throw new Error(validation.error);
      }
      DevLogger.log('HyperLiquidProvider: PARAMETERS VALIDATED');

      // Step 2: Get supported withdrawal routes and validate asset
      DevLogger.log('HyperLiquidProvider: CHECKING ASSET SUPPORT');
      const supportedRoutes = this.getWithdrawalRoutes();
      DevLogger.log('HyperLiquidProvider: SUPPORTED WITHDRAWAL ROUTES', {
        routeCount: supportedRoutes.length,
        routes: supportedRoutes.map((route) => ({
          assetId: route.assetId,
          chainId: route.chainId,
          contractAddress: route.contractAddress,
        })),
      });

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.assetId) {
        const error = strings(
          'perps.errors.withdrawValidation.assetIdRequired',
        );
        DevLogger.log('HyperLiquidProvider: MISSING ASSET ID', {
          error,
          params,
        });
        throw new Error(error);
      }

      const assetValidation = validateAssetSupport(
        params.assetId,
        supportedRoutes,
      );
      if (!assetValidation.isValid) {
        DevLogger.log('❌ HyperLiquidProvider: ASSET NOT SUPPORTED', {
          error: assetValidation.error,
          assetId: params.assetId,
          supportedAssets: supportedRoutes.map((r) => r.assetId),
        });
        throw new Error(assetValidation.error);
      }
      DevLogger.log('HyperLiquidProvider: ASSET SUPPORTED', {
        assetId: params.assetId,
      });

      // Step 3: Determine destination address
      DevLogger.log('HyperLiquidProvider: DETERMINING DESTINATION ADDRESS');
      let destination: Hex;
      if (params.destination) {
        destination = params.destination;
        DevLogger.log('HyperLiquidProvider: USING PROVIDED DESTINATION', {
          destination,
        });
      } else {
        destination = await this.walletService.getUserAddressWithDefault();
        DevLogger.log('HyperLiquidProvider: USING USER WALLET ADDRESS', {
          destination,
        });
      }

      // Step 4: Ensure client is ready
      DevLogger.log('HyperLiquidProvider: ENSURING CLIENT READY');
      await this.ensureReady();
      const exchangeClient = this.clientService.getExchangeClient();
      DevLogger.log('HyperLiquidProvider: CLIENT READY');

      // Step 5: Validate amount against account balance
      DevLogger.log('HyperLiquidProvider: CHECKING ACCOUNT BALANCE');
      const accountState = await this.getAccountState();
      const availableBalance = parseFloat(accountState.availableBalance);
      DevLogger.log('HyperLiquidProvider: ACCOUNT BALANCE', {
        availableBalance,
        totalBalance: accountState.totalBalance,
        marginUsed: accountState.marginUsed,
        unrealizedPnl: accountState.unrealizedPnl,
      });

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.amount) {
        const error = strings('perps.errors.withdrawValidation.amountRequired');
        DevLogger.log('HyperLiquidProvider: MISSING AMOUNT', {
          error,
          params,
        });
        throw new Error(error);
      }

      const withdrawAmount = parseFloat(params.amount);
      DevLogger.log('HyperLiquidProvider: WITHDRAWAL AMOUNT', {
        requestedAmount: withdrawAmount,
        availableBalance,
        sufficientBalance: withdrawAmount <= availableBalance,
      });

      const balanceValidation = validateBalance(
        withdrawAmount,
        availableBalance,
      );
      if (!balanceValidation.isValid) {
        DevLogger.log('HyperLiquidProvider: INSUFFICIENT BALANCE', {
          error: balanceValidation.error,
          requestedAmount: withdrawAmount,
          availableBalance,
          difference: withdrawAmount - availableBalance,
        });
        throw new Error(balanceValidation.error);
      }
      DevLogger.log('✅ HyperLiquidProvider: BALANCE SUFFICIENT');

      // Step 6: Execute withdrawal via HyperLiquid SDK (API call)
      DevLogger.log('HyperLiquidProvider: CALLING WITHDRAW3 API', {
        destination,
        amount: params.amount,
        endpoint: 'withdraw3',
        timestamp: new Date().toISOString(),
      });

      const result = await exchangeClient.withdraw3({
        destination,
        amount: params.amount,
      });

      DevLogger.log('HyperLiquidProvider: WITHDRAW3 API RESPONSE', {
        status: result.status,
        response: result,
        timestamp: new Date().toISOString(),
      });

      if (result.status === 'ok') {
        DevLogger.log(
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
      DevLogger.log('HyperLiquidProvider: WITHDRAWAL FAILED', {
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
      DevLogger.log('HyperLiquidProvider: WITHDRAWAL EXCEPTION', {
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        params,
        timestamp: new Date().toISOString(),
      });
      Logger.error(
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
      DevLogger.log('HyperLiquidProvider: STARTING DEX TRANSFER', {
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
      DevLogger.log('HyperLiquidProvider: USER ADDRESS', { userAddress });

      // Ensure client ready
      await this.ensureReady();
      const exchangeClient = this.clientService.getExchangeClient();

      // Execute transfer using SDK sendAsset()
      // Note: SDK docs say "testnet-only" but it works on mainnet (verified via Phantom)
      DevLogger.log('HyperLiquidProvider: CALLING SEND_ASSET API', {
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

      DevLogger.log('HyperLiquidProvider: SEND_ASSET RESPONSE', {
        status: result.status,
        timestamp: new Date().toISOString(),
      });

      if (result.status === 'ok') {
        DevLogger.log('✅ HyperLiquidProvider: TRANSFER SUCCESSFUL');
        return {
          success: true,
          // Note: sendAsset doesn't return txHash in response
          // User can verify transfer in explorer by timestamp
        };
      }

      throw new Error(`Transfer failed: ${result.status}`);
    } catch (error) {
      DevLogger.log('❌ HyperLiquidProvider: TRANSFER FAILED', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      Logger.error(
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
        Logger.error(
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
   * Configure live data settings
   */
  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    DevLogger.log('Live data config updated:', config);
  }

  /**
   * Toggle testnet mode
   */
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    try {
      const newIsTestnet = !this.clientService.isTestnetMode();

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
      this.ensureClientsInitialized();
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
        DevLogger.log('Account not connected:', error);
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
            : strings('perps.errors.unknownError'),
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
    let maxLeverage = PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE; // Default fallback
    if (asset) {
      try {
        maxLeverage = await this.getMaxLeverage(asset);
      } catch (error) {
        DevLogger.log('Failed to get max leverage for asset, using default', {
          asset,
          error,
        });
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
      Logger.error(
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
        now - cached.timestamp <
          PERFORMANCE_CONFIG.MAX_LEVERAGE_CACHE_DURATION_MS
      ) {
        return cached.value;
      }

      await this.ensureReady();

      // Extract DEX name for API calls (main DEX = null)
      const { dex: dexName } = parseAssetName(asset);

      // Check cachedMetaByDex first (optimization to avoid redundant API calls)
      const dexKey = dexName || 'main';
      let meta = this.cachedMetaByDex.get(dexKey);

      if (!meta) {
        // Cache miss - fetch from API
        const infoClient = this.clientService.getInfoClient();
        meta = await infoClient.meta({ dex: dexName ?? '' });

        // Store raw meta response for reuse
        this.cachedMetaByDex.set(dexKey, meta);

        DevLogger.log('[getMaxLeverage] Fetched and cached meta response', {
          dex: dexKey,
          asset,
          universeSize: meta.universe?.length ?? 0,
        });
      } else {
        DevLogger.log('[getMaxLeverage] Using cached meta response', {
          dex: dexKey,
          asset,
          universeSize: meta.universe?.length ?? 0,
        });
      }

      // Check if meta and universe exist and is valid
      if (!meta?.universe || !Array.isArray(meta.universe)) {
        console.warn(
          `Meta or universe not available for DEX ${
            dexName || 'main'
          }, using default max leverage`,
        );
        return PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
      }

      // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
      const assetInfo = meta.universe.find((a) => a.name === asset);
      if (!assetInfo) {
        DevLogger.log(
          `Asset ${asset} not found in universe, using default max leverage`,
        );
        return PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
      }

      // Cache the result
      this.maxLeverageCache.set(asset, {
        value: assetInfo.maxLeverage,
        timestamp: now,
      });

      return assetInfo.maxLeverage;
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('getMaxLeverage', {
          asset,
        }),
      );
      return PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
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
    const { orderType, isMaker = false, amount, coin } = params;

    // Start with base rates from config
    let feeRate =
      orderType === 'market' || !isMaker ? FEE_RATES.taker : FEE_RATES.maker;

    // HIP-3 assets have 2× base fees (per fees.md line 9)
    // Parse coin to detect HIP-3 DEX (e.g., "xyz:TSLA" → dex="xyz")
    const { dex } = parseAssetName(coin);
    const isHip3Asset = dex !== null;

    if (isHip3Asset) {
      const originalRate = feeRate;
      feeRate *= HIP3_FEE_CONFIG.FEE_MULTIPLIER;

      DevLogger.log('HIP-3 Fee Multiplier Applied', {
        coin,
        dex,
        originalBaseRate: originalRate,
        hip3BaseRate: feeRate,
        multiplier: HIP3_FEE_CONFIG.FEE_MULTIPLIER,
      });
    }

    DevLogger.log('HyperLiquid Fee Calculation Started', {
      orderType,
      isMaker,
      amount,
      coin,
      isHip3Asset,
      baseFeeRate: feeRate,
      baseTakerRate: FEE_RATES.taker,
      baseMakerRate: FEE_RATES.maker,
    });

    // Try to get user-specific rates if wallet is connected
    try {
      const userAddress = await this.walletService.getUserAddressWithDefault();

      DevLogger.log('User Address Retrieved', {
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

          // Apply HIP-3 multiplier to user-specific rates
          if (isHip3Asset) {
            userFeeRate *= HIP3_FEE_CONFIG.FEE_MULTIPLIER;
          }

          feeRate = userFeeRate;

          DevLogger.log('📦 Using Cached Fee Rates', {
            cacheHit: true,
            perpsTakerRate: cached.perpsTakerRate,
            perpsMakerRate: cached.perpsMakerRate,
            spotTakerRate: cached.spotTakerRate,
            spotMakerRate: cached.spotMakerRate,
            selectedRate: feeRate,
            isHip3Asset,
            cacheExpiry: new Date(cached.timestamp + cached.ttl).toISOString(),
            cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
          });
        }
      } else {
        DevLogger.log('Fetching Fresh Fee Rates from HyperLiquid API', {
          cacheHit: false,
          userAddress,
        });

        // Fetch fresh rates from SDK
        await this.ensureReady();
        const infoClient = this.clientService.getInfoClient();
        const userFees = await infoClient.userFees({
          user: userAddress as `0x${string}`,
        });

        DevLogger.log('HyperLiquid userFees API Response', {
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

        DevLogger.log('Fee Discount Calculation', {
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
          DevLogger.log('Fee Rate Validation Failed', {
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

        // Apply HIP-3 multiplier to API-fetched rates
        if (isHip3Asset) {
          userFeeRate *= HIP3_FEE_CONFIG.FEE_MULTIPLIER;
        }

        feeRate = userFeeRate;

        DevLogger.log('Fee Rates Validated and Cached', {
          selectedRate: feeRate,
          selectedRatePercentage: `${(feeRate * 100).toFixed(4)}%`,
          discountApplied: perpsTakerRate < FEE_RATES.taker,
          isHip3Asset,
          cacheExpiry: new Date(rates.timestamp + rates.ttl).toISOString(),
        });
      }
    } catch (error) {
      // Silently fall back to base rates
      DevLogger.log('Fee API Call Failed - Falling Back to Base Rates', {
        error: error instanceof Error ? error.message : String(error),
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        fallbackTakerRate: FEE_RATES.taker,
        fallbackMakerRate: FEE_RATES.maker,
        userAddress: 'unknown',
      });
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
    let metamaskFeeRate = BUILDER_FEE_CONFIG.maxFeeDecimal;

    // Apply MetaMask reward discount if active
    if (this.userFeeDiscountBips !== undefined) {
      const discount = this.userFeeDiscountBips / BASIS_POINTS_DIVISOR; // Convert basis points to decimal
      metamaskFeeRate = BUILDER_FEE_CONFIG.maxFeeDecimal * (1 - discount);

      DevLogger.log('HyperLiquid: Applied MetaMask fee discount', {
        originalRate: BUILDER_FEE_CONFIG.maxFeeDecimal,
        discountBips: this.userFeeDiscountBips,
        discountPercentage: this.userFeeDiscountBips / 100,
        adjustedRate: metamaskFeeRate,
        discountAmount: BUILDER_FEE_CONFIG.maxFeeDecimal * discount,
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

    DevLogger.log('Final Fee Calculation Result', {
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
      DevLogger.log('Cleared fee cache for user', { userAddress });
    } else {
      this.userFeeCache.clear();
      DevLogger.log('Cleared all fee cache');
    }
  }

  /**
   * Disconnect provider
   */
  async disconnect(): Promise<DisconnectResult> {
    try {
      DevLogger.log('HyperLiquid: Disconnecting provider', {
        isTestnet: this.clientService.isTestnetMode(),
        timestamp: new Date().toISOString(),
      });

      // Clear subscriptions through subscription service
      this.subscriptionService.clearAll();

      // Clear fee cache
      this.clearFeeCache();

      // Disconnect client service
      await this.clientService.disconnect();

      DevLogger.log('HyperLiquid: Provider fully disconnected', {
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
    await this.ensureReady();

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const timeout = timeoutMs ?? PERPS_CONSTANTS.WEBSOCKET_PING_TIMEOUT_MS;

    DevLogger.log(
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
      await subscriptionClient.transport.ready(controller.signal);

      DevLogger.log('HyperLiquid: WebSocket health check ping succeeded');
    } catch (error) {
      // Check if we timed out first
      if (didTimeout) {
        DevLogger.log(
          `HyperLiquid: WebSocket health check ping timed out after ${timeout}ms`,
        );
        throw new Error(PERPS_ERROR_CODES.CONNECTION_TIMEOUT);
      }

      // Otherwise throw the actual error
      DevLogger.log('HyperLiquid: WebSocket health check ping failed', error);
      throw ensureError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get list of available HIP-3 builder-deployed DEXs
   * @param _params - Optional parameters (reserved for future filters/pagination)
   * @returns Array of DEX names (empty string '' represents main DEX)
   */
  async getAvailableDexs(_params?: GetAvailableDexsParams): Promise<string[]> {
    try {
      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const dexs = await infoClient.perpDexs();

      // Map DEX objects to names: null -> '' (main DEX), object -> object.name
      return dexs.map((dex) => (dex === null ? '' : dex.name));
    } catch (error) {
      Logger.error(
        ensureError(error),
        'HyperLiquidProvider: Failed to fetch available DEXs',
      );
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
      ? BUILDER_FEE_CONFIG.testnetBuilder
      : BUILDER_FEE_CONFIG.mainnetBuilder;
  }

  private getReferralCode(isTestnet: boolean): string {
    return isTestnet
      ? REFERRAL_CONFIG.testnetCode
      : REFERRAL_CONFIG.mainnetCode;
  }

  /**
   * Ensure user has a MetaMask referral code set
   * If user doesn't have a referral set, set MetaMask as referrer
   * This is called before every order to maximize referral capture
   *
   * Note: This is network-specific - testnet and mainnet have separate referral states
   */
  private async ensureReferralSet(): Promise<void> {
    const errorMessage = 'Error ensuring referral code is set';
    try {
      const isTestnet = this.clientService.isTestnetMode();
      const network = isTestnet ? 'testnet' : 'mainnet';
      const expectedReferralCode = this.getReferralCode(isTestnet);
      const referrerAddress = this.getBuilderAddress(isTestnet);
      const userAddress = await this.walletService.getUserAddressWithDefault();

      if (userAddress.toLowerCase() === referrerAddress.toLowerCase()) {
        // if the user is the builder, we don't need to set a referral code
        return;
      }

      const isReady = await this.isReferralCodeReady();
      if (!isReady) {
        // if the referrer code is not ready, we can't set the referral code on the user
        // so we just return and the error will be logged
        // we may want to block this completely, but for now we just log the error
        // as the referrer may need to address an issue first and we may not want to completely
        // block orders for this
        return;
      }
      // Check if user already has a referral set on this network
      const hasReferral = await this.checkReferralSet();

      if (!hasReferral) {
        DevLogger.log('No referral set - setting MetaMask as referrer', {
          network,
          referralCode: expectedReferralCode,
        });
        const result = await this.setReferralCode();
        if (result === true) {
          DevLogger.log('Referral code set', {
            network,
            referralCode: expectedReferralCode,
          });
        } else {
          throw new Error('Failed to set referral code');
        }
      }
    } catch (error) {
      console.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if the referral code is ready to be used
   * @returns Promise resolving to true if referral code is ready
   */
  private async isReferralCodeReady(): Promise<boolean> {
    const errorMessage = 'Error checking if referral code is ready';
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
      console.error('Referral code not ready', {
        stage,
        code,
        referrerAddr,
        referral,
      });
      return false;
    } catch (error) {
      console.error(errorMessage, error);
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

      DevLogger.log('Referral check result:', {
        userAddress,
        referralData,
      });

      return !!referralData?.referredBy?.code;
    } catch (error) {
      DevLogger.log('Error checking referral status:', error);
      // do not throw here, return false as we can try to set it again
      return false;
    }
  }

  /**
   * Set MetaMask as the user's referrer on HyperLiquid
   */
  private async setReferralCode(): Promise<boolean> {
    const errorMessage = 'Error setting referral code';
    try {
      const exchangeClient = this.clientService.getExchangeClient();
      const referralCode = this.getReferralCode(
        this.clientService.isTestnetMode(),
      );

      DevLogger.log('Setting referral code:', {
        code: referralCode,
        network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      });

      // set the referral code
      const result = await exchangeClient.setReferrer({
        code: referralCode,
      });

      DevLogger.log('Referral code set result:', result);

      return result?.status === 'ok';
    } catch (error) {
      console.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }
}
