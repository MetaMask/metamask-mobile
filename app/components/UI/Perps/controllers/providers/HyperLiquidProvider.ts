import type { OrderParams as SDKOrderParams } from '@deeeed/hyperliquid-node20/esm/src/types/exchange/requests';
import { type Hex } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';
import { strings } from '../../../../../../locales/i18n';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  BUILDER_FEE_CONFIG,
  FEE_RATES,
  getBridgeInfo,
  getChainId,
  HYPERLIQUID_WITHDRAWAL_MINUTES,
  REFERRAL_CONFIG,
  TRADING_DEFAULTS,
} from '../../constants/hyperLiquidConfig';
import {
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  WITHDRAWAL_CONSTANTS,
} from '../../constants/perpsConfig';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import {
  adaptAccountStateFromSDK,
  adaptMarketFromSDK,
  adaptOrderFromSDK,
  adaptPositionFromSDK,
  buildAssetMapping,
  formatHyperLiquidPrice,
  formatHyperLiquidSize,
} from '../../utils/hyperLiquidAdapter';
import {
  createErrorResult,
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
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DisconnectResult,
  EditOrderParams,
  FeeCalculationParams,
  FeeCalculationResult,
  Funding,
  GetAccountStateParams,
  GetFundingParams,
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
} from '../types';
import { PERPS_ERROR_CODES } from '../PerpsController';

/**
 * HyperLiquid provider implementation
 *
 * Implements the IPerpsProvider interface for HyperLiquid protocol.
 * Uses the @deeeed/hyperliquid-node20 SDK for all operations.
 * Delegates to service classes for client management, wallet integration, and subscriptions.
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

  // Error mappings from HyperLiquid API errors to standardized PERPS_ERROR_CODES
  private readonly ERROR_MAPPINGS = {
    'isolated position does not have sufficient margin available to decrease leverage':
      PERPS_ERROR_CODES.ORDER_LEVERAGE_REDUCTION_FAILED,
  };

  constructor(options: { isTestnet?: boolean } = {}) {
    const isTestnet = options.isTestnet || false;

    // Initialize services
    this.clientService = new HyperLiquidClientService({ isTestnet });
    this.walletService = new HyperLiquidWalletService({ isTestnet });
    this.subscriptionService = new HyperLiquidSubscriptionService(
      this.clientService,
      this.walletService,
    );

    // Initialize clients
    this.initializeClients();
  }

  /**
   * Initialize HyperLiquid SDK clients
   */
  private initializeClients(): void {
    const wallet = this.walletService.createWalletAdapter();
    this.clientService.initialize(wallet);
  }

  /**
   * Ensure clients are initialized and asset mapping is loaded
   */
  private async ensureReady(): Promise<void> {
    this.clientService.ensureInitialized();

    if (this.coinToAssetId.size === 0) {
      await this.buildAssetMapping();
    }
  }

  /**
   * Build asset ID mapping from market metadata
   */
  private async buildAssetMapping(): Promise<void> {
    const infoClient = this.clientService.getInfoClient();
    const meta = await infoClient.meta();
    const { coinToAssetId } = buildAssetMapping(meta.universe);

    this.coinToAssetId = coinToAssetId;

    DevLogger.log('Asset mapping built', {
      assetCount: meta.universe.length,
      coins: Array.from(this.coinToAssetId.keys()),
    });
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

      // Ensure builder fee approval and referral code are set before placing any order
      await Promise.all([
        this.ensureBuilderFeeApproval(),
        this.ensureReferralSet(),
      ]);

      // Get asset info - use provided current price to avoid extra API call
      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta();

      const assetInfo = meta.universe.find(
        (asset) => asset.name === params.coin,
      );
      if (!assetInfo) {
        throw new Error(`Asset ${params.coin} not found`);
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
        const mids = await infoClient.allMids();
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
      const assetId = this.coinToAssetId.get(params.coin);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${params.coin}`);
      }

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
         * Using 'Ioc' causes market orders to be treated as limit orders by HyperLiquid,
         * leading to incorrect order type display in transaction history (TAT-1475)
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

      // 5. Submit via SDK exchange client instead of direct fetch
      const exchangeClient = this.clientService.getExchangeClient();
      const result = await exchangeClient.order({
        orders,
        grouping,
        builder: {
          b: this.getBuilderAddress(this.clientService.isTestnetMode()),
          f: BUILDER_FEE_CONFIG.maxFeeTenthsBps,
        },
      });

      if (result.status !== 'ok') {
        throw new Error(`Order failed: ${JSON.stringify(result)}`);
      }

      const status = result.response?.data?.statuses?.[0];
      const restingOrder =
        status && 'resting' in status ? status.resting : null;
      const filledOrder = status && 'filled' in status ? status.filled : null;

      return {
        success: true,
        orderId: restingOrder?.oid?.toString() || filledOrder?.oid?.toString(),
        filledSize: filledOrder?.totalSz,
        averagePrice: filledOrder?.avgPx,
      };
    } catch (error) {
      DevLogger.log('Order placement failed:', error);
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

      // Get asset info for proper formatting
      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta();
      const mids = await infoClient.allMids(); // Default to perps data (same as subscription service)

      const assetInfo = meta.universe.find(
        (asset) => asset.name === params.newOrder.coin,
      );
      if (!assetInfo) {
        throw new Error(`Asset ${params.newOrder.coin} not found`);
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
      DevLogger.log('Order modification failed:', error);
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
      DevLogger.log('Order cancellation failed:', error);
      return createErrorResult(error, { success: false });
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
      let positions: Position[];
      try {
        positions = await this.getPositions();
      } catch (error) {
        DevLogger.log('Error getting positions:', error);
        // If it's a WebSocket error, try to provide a more helpful message
        if (error instanceof Error && error.message.includes('WebSocket')) {
          throw new Error(
            'Connection error. Please check your network and try again.',
          );
        }
        throw error;
      }

      const position = positions.find((p) => p.coin === coin);

      if (!position) {
        throw new Error(`No position found for ${coin}`);
      }

      // const positionSize = Math.abs(parseFloat(position.size));
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

      const mids = await infoClient.allMids();
      const currentPrice = parseFloat(mids[coin] || '0');

      if (currentPrice === 0) {
        throw new Error(`No price available for ${coin}`);
      }

      // Cancel existing TP/SL orders for this position
      DevLogger.log('Fetching open orders to cancel existing TP/SL...');
      const openOrders = await infoClient.frontendOpenOrders({
        user: userAddress,
      });

      const tpslOrdersToCancel = openOrders.filter(
        (order) =>
          order.coin === coin &&
          order.reduceOnly === true &&
          order.isPositionTpsl === true &&
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

      // Get asset info for proper formatting
      const meta = await infoClient.meta();

      // Check if meta is an error response (string) or doesn't have universe property
      if (!meta || typeof meta === 'string' || !meta.universe) {
        DevLogger.log('Failed to fetch metadata for asset mapping', { meta });
        throw new Error('Failed to fetch market metadata');
      }

      const assetInfo = meta.universe.find((asset) => asset.name === coin);
      if (!assetInfo) {
        throw new Error(`Asset ${coin} not found`);
      }

      const assetId = this.coinToAssetId.get(coin);
      if (assetId === undefined) {
        throw new Error(`Asset ID not found for ${coin}`);
      }

      // Build orders array for TP/SL
      const orders: SDKOrderParams[] = [];

      // Take Profit order
      if (takeProfitPrice) {
        const tpOrder: SDKOrderParams = {
          a: assetId,
          b: !isLong, // Opposite side to close position
          p: formatHyperLiquidPrice({
            price: parseFloat(takeProfitPrice),
            szDecimals: assetInfo.szDecimals,
          }),
          s: '0',
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
          s: '0',
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

      // Submit via SDK exchange client with positionTpsl grouping
      const result = await exchangeClient.order({
        orders,
        grouping: 'positionTpsl',
        builder: {
          b: this.getBuilderAddress(this.clientService.isTestnetMode()),
          f: BUILDER_FEE_CONFIG.maxFeeTenthsBps,
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
      DevLogger.log('Position TP/SL update failed:', error);
      return createErrorResult(error, { success: false });
    }
  }

  /**
   * Close a position
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    try {
      DevLogger.log('Closing position:', params);

      const positions = await this.getPositions();
      const position = positions.find((p) => p.coin === params.coin);

      if (!position) {
        throw new Error(`No position found for ${params.coin}`);
      }

      const positionSize = parseFloat(position.size);
      const isBuy = positionSize < 0;
      const closeSize = params.size || Math.abs(positionSize).toString();

      const result = await this.placeOrder({
        coin: params.coin,
        isBuy,
        size: closeSize,
        orderType: params.orderType || 'market',
        price: params.price,
        reduceOnly: true,
      });

      return result;
    } catch (error) {
      DevLogger.log('Position closing failed:', error);
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
      DevLogger.log('Getting positions via HyperLiquid SDK');

      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Get positions and frontend orders (includes trigger info) in parallel
      const [clearingState, frontendOrders] = await Promise.all([
        infoClient.clearinghouseState({ user: userAddress }),
        infoClient.frontendOpenOrders({ user: userAddress }),
      ]);

      DevLogger.log('Frontend open orders:', {
        count: frontendOrders.length,
        orders: frontendOrders.map((o) => ({
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

      // Process positions and attach TP/SL prices
      return clearingState.assetPositions
        .filter((assetPos) => assetPos.position.szi !== '0')
        .map((assetPos) => {
          const position = adaptPositionFromSDK(assetPos);

          // Find TP/SL orders for this position
          // First check direct trigger orders
          const positionOrders = frontendOrders.filter(
            (order) =>
              order.coin === position.coin &&
              order.isTrigger &&
              order.reduceOnly,
          );

          // Also check for parent orders that might have TP/SL children
          const parentOrdersWithChildren = frontendOrders.filter(
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
            DevLogger.log(`Parent order with children for ${position.coin}:`, {
              parentOid: parentOrder.oid,
              childrenCount: parentOrder.children.length,
            });

            parentOrder.children.forEach((childOrder) => {
              if (childOrder.isTrigger && childOrder.reduceOnly) {
                if (
                  childOrder.orderType === 'Take Profit Market' ||
                  childOrder.orderType === 'Take Profit Limit'
                ) {
                  takeProfitPrice = childOrder.triggerPx;
                  DevLogger.log(`Found TP child order for ${position.coin}:`, {
                    triggerPrice: childOrder.triggerPx,
                    orderId: childOrder.oid,
                    orderType: childOrder.orderType,
                  });
                } else if (
                  childOrder.orderType === 'Stop Market' ||
                  childOrder.orderType === 'Stop Limit'
                ) {
                  stopLossPrice = childOrder.triggerPx;
                  DevLogger.log(`Found SL child order for ${position.coin}:`, {
                    triggerPrice: childOrder.triggerPx,
                    orderId: childOrder.oid,
                    orderType: childOrder.orderType,
                  });
                }
              }
            });
          });

          return {
            ...position,
            takeProfitPrice,
            stopLossPrice,
          };
        });
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
   */
  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    try {
      DevLogger.log(
        'Getting currently open orders via HyperLiquid SDK',
        params || '(no params)',
      );
      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      const rawOrders = await infoClient.frontendOpenOrders({
        user: userAddress,
      });

      DevLogger.log('Currently open orders received:', rawOrders);

      // Transform HyperLiquid open orders to abstract Order type using adapter
      const orders: Order[] = (rawOrders || []).map((rawOrder) =>
        adaptOrderFromSDK(rawOrder),
      );

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
   * Get historical portfolio data for percentage calculations
   */
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

      // Get both Perps and Spot balances
      const [perpsState, spotState] = await Promise.all([
        infoClient.clearinghouseState({ user: userAddress }),
        infoClient.spotClearinghouseState({ user: userAddress }),
      ]);

      DevLogger.log('Perps state:', perpsState);
      DevLogger.log('Spot state:', spotState);

      const accountState = adaptAccountStateFromSDK(perpsState, spotState);
      DevLogger.log('Adapted account state:', accountState);

      return accountState;
    } catch (error) {
      DevLogger.log('Error getting account state:', error);
      // Re-throw the error so the controller can handle it properly
      // This allows the UI to show proper error messages instead of zeros
      throw error;
    }
  }

  /**
   * Get available markets
   */
  async getMarkets(): Promise<MarketInfo[]> {
    try {
      DevLogger.log('Getting markets via HyperLiquid SDK');

      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta();
      const markets = meta.universe.map((asset) => adaptMarketFromSDK(asset));

      return markets;
    } catch (error) {
      DevLogger.log('Error getting markets:', error);
      return [];
    }
  }

  /**
   * Get market data with prices, volumes, and 24h changes
   */
  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    try {
      DevLogger.log('Getting market data with prices via HyperLiquid SDK');

      await this.ensureReady();

      const infoClient = this.clientService.getInfoClient();

      // Fetch all required data in parallel for better performance
      const [perpsMeta, allMids, predictedFundings] = await Promise.all([
        infoClient.meta(),
        infoClient.allMids(),
        infoClient.predictedFundings(),
      ]);

      if (!perpsMeta?.universe || !allMids) {
        throw new Error('Failed to fetch market data - no data received');
      }

      // Also fetch asset contexts for additional data like volume and previous day prices
      const metaAndCtxs = await infoClient.metaAndAssetCtxs();
      const assetCtxs = metaAndCtxs?.[1] || [];

      // Transform to UI-friendly format using standalone utility
      return transformMarketData({
        universe: perpsMeta.universe,
        assetCtxs,
        allMids,
        predictedFundings,
      });
    } catch (error) {
      DevLogger.log('Error getting market data with prices:', error);
      return [];
    }
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

      // Validate limit orders have a price
      if (params.orderType === 'limit' && !params.price) {
        return {
          isValid: false,
          error: strings('perps.order.validation.limit_price_required'),
        };
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
      return createErrorResult(error, { success: false });
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
        DevLogger.log('Error subscribing to prices:', error);
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

      // Reinitialize clients
      this.initializeClients();

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
   * Initialize provider
   */
  async initialize(): Promise<InitializeResult> {
    try {
      this.initializeClients();
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
      DevLogger.log('Error calculating liquidation price:', error);
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

      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta();

      // Check if meta and universe exist
      if (!meta?.universe) {
        console.warn(
          'Meta or universe not available, using default max leverage',
        );
        return PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
      }

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
      DevLogger.log('Error getting max leverage:', error);
      return PERPS_CONSTANTS.DEFAULT_MAX_LEVERAGE;
    }
  }

  /**
   * TODO: Fetch user's 14-day rolling volume when API available
   * @private
   */
  private async getUserVolume(): Promise<number> {
    // Placeholder - return 0 (base tier)
    return 0;
  }

  /**
   * TODO: Fetch user's $HYPE staking info when API available
   * @private
   */
  private async getUserStaking(): Promise<number> {
    // Placeholder - return 0 (no staking discount)
    return 0;
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
    const { orderType, isMaker = false, amount } = params;

    // Start with base rates from config
    let feeRate =
      orderType === 'market' || !isMaker ? FEE_RATES.taker : FEE_RATES.maker;

    DevLogger.log('HyperLiquid Fee Calculation Started', {
      orderType,
      isMaker,
      amount,
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
          feeRate =
            orderType === 'market' || !isMaker
              ? cached.perpsTakerRate
              : cached.perpsMakerRate;

          DevLogger.log('📦 Using Cached Fee Rates', {
            cacheHit: true,
            perpsTakerRate: cached.perpsTakerRate,
            perpsMakerRate: cached.perpsMakerRate,
            spotTakerRate: cached.spotTakerRate,
            spotMakerRate: cached.spotMakerRate,
            selectedRate: feeRate,
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
        feeRate =
          orderType === 'market' || !isMaker
            ? rates.perpsTakerRate
            : rates.perpsMakerRate;

        DevLogger.log('Fee Rates Validated and Cached', {
          selectedRate: feeRate,
          selectedRatePercentage: `${(feeRate * 100).toFixed(4)}%`,
          discountApplied: perpsTakerRate < FEE_RATES.taker,
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

    // MetaMask builder fee (0.1% = 0.001)
    const metamaskFeeRate = BUILDER_FEE_CONFIG.maxFeeDecimal;
    const metamaskFeeAmount =
      amount !== undefined
        ? isNaN(parsedAmount)
          ? 0
          : parsedAmount * metamaskFeeRate
        : undefined;

    // Total fees
    const totalFeeRate = protocolFeeRate + metamaskFeeRate;
    const totalFeeAmount =
      amount !== undefined
        ? isNaN(parsedAmount)
          ? 0
          : parsedAmount * totalFeeRate
        : undefined;

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
