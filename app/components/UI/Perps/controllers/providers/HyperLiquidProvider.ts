import type { OrderParams as SDKOrderParams } from '@deeeed/hyperliquid-node20/esm/src/types/exchange/requests';
import { parseCaipAssetId, type Hex } from '@metamask/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../../core/Engine';
import { getBridgeInfo, getChainId } from '../../constants/hyperLiquidConfig';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import {
  adaptAccountStateFromSDK,
  adaptMarketFromSDK,
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
  PendingWithdrawal,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DisconnectResult,
  EditOrderParams,
  GetAccountStateParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  InitializeResult,
  IPerpsProvider,
  LiveDataConfig,
  LiquidationPriceParams,
  MaintenanceMarginParams,
  PerpsMarketData,
  MarketInfo,
  OrderResult,
  OrderParams as PerpsOrderParams,
  Position,
  ReadyToTradeResult,
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  ToggleTestnetResult,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
} from '../types';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

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
   * Place an order using direct wallet signing (same as working debug test)
   */
  async placeOrder(params: PerpsOrderParams): Promise<OrderResult> {
    try {
      DevLogger.log('Placing order via HyperLiquid SDK:', params);

      // Validate order parameters
      const validation = validateOrderParams(params);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      await this.ensureReady();

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
        t:
          params.orderType === 'limit'
            ? { limit: { tif: 'Gtc' } }
            : { limit: { tif: 'Ioc' } },
        c: params.clientOrderId
          ? (params.clientOrderId as `0x${string}`)
          : undefined,
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
      return createErrorResult(error, { success: false });
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
        t:
          params.newOrder.orderType === 'limit'
            ? { limit: { tif: 'Gtc' } }
            : { limit: { tif: 'Ioc' } },
        c: params.newOrder.clientOrderId
          ? (params.newOrder.clientOrderId as `0x${string}`)
          : undefined,
      };

      // Submit modification via SDK
      const exchangeClient = this.clientService.getExchangeClient();
      const result = await exchangeClient.modify({
        oid:
          typeof params.orderId === 'string'
            ? (params.orderId as `0x${string}`)
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

      const positionSize = Math.abs(parseFloat(position.size));
      const isLong = parseFloat(position.size) > 0;

      await this.ensureReady();

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
          s: formatHyperLiquidSize({
            size: positionSize,
            szDecimals: assetInfo.szDecimals,
          }),
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
          s: formatHyperLiquidSize({
            size: positionSize,
            szDecimals: assetInfo.szDecimals,
          }),
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

      if (orders.length === 0) {
        throw new Error('No TP/SL prices provided');
      }

      // Submit via SDK exchange client with positionTpsl grouping
      const result = await exchangeClient.order({
        orders,
        grouping: 'positionTpsl',
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

      return this.placeOrder({
        coin: params.coin,
        isBuy,
        size: closeSize,
        orderType: params.orderType || 'market',
        price: params.price,
        reduceOnly: true,
      });
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
      return meta.universe.map((asset) => adaptMarketFromSDK(asset));
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
      const [perpsMeta, allMids] = await Promise.all([
        infoClient.meta(),
        infoClient.allMids(),
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
  validateDeposit(params: DepositParams): { isValid: boolean; error?: string } {
    return validateDepositParams({
      amount: params.amount,
      assetId: params.assetId,
      isTestnet: this.clientService.isTestnetMode(),
    });
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
      DevLogger.log('🚀 HyperLiquidProvider: STARTING WITHDRAWAL', {
        params,
        timestamp: new Date().toISOString(),
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination,
        isTestnet: this.clientService.isTestnetMode(),
      });

      // Step 1: Validate withdrawal parameters
      DevLogger.log('🔍 HyperLiquidProvider: VALIDATING PARAMETERS');
      const validation = validateWithdrawalParams(params);
      if (!validation.isValid) {
        DevLogger.log('❌ HyperLiquidProvider: PARAMETER VALIDATION FAILED', {
          error: validation.error,
          params,
          validationResult: validation,
        });
        throw new Error(validation.error);
      }
      DevLogger.log('✅ HyperLiquidProvider: PARAMETERS VALIDATED');

      // Step 2: Get supported withdrawal routes and validate asset
      DevLogger.log('🔍 HyperLiquidProvider: CHECKING ASSET SUPPORT');
      const supportedRoutes = this.getWithdrawalRoutes();
      DevLogger.log('📋 HyperLiquidProvider: SUPPORTED WITHDRAWAL ROUTES', {
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
        DevLogger.log('❌ HyperLiquidProvider: MISSING ASSET ID', {
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
      DevLogger.log('✅ HyperLiquidProvider: ASSET SUPPORTED', {
        assetId: params.assetId,
      });

      // Step 3: Determine destination address
      DevLogger.log('🔍 HyperLiquidProvider: DETERMINING DESTINATION ADDRESS');
      let destination: Hex;
      if (params.destination) {
        destination = params.destination;
        DevLogger.log('📍 HyperLiquidProvider: USING PROVIDED DESTINATION', {
          destination,
        });
      } else {
        destination = await this.walletService.getUserAddressWithDefault();
        DevLogger.log('📍 HyperLiquidProvider: USING USER WALLET ADDRESS', {
          destination,
        });
      }

      // Step 4: Ensure client is ready
      DevLogger.log('🔌 HyperLiquidProvider: ENSURING CLIENT READY');
      await this.ensureReady();
      const exchangeClient = this.clientService.getExchangeClient();
      DevLogger.log('✅ HyperLiquidProvider: CLIENT READY');

      // Step 5: Validate amount against account balance
      DevLogger.log('🔍 HyperLiquidProvider: CHECKING ACCOUNT BALANCE');
      const accountState = await this.getAccountState();
      const availableBalance = parseFloat(accountState.availableBalance);
      DevLogger.log('💰 HyperLiquidProvider: ACCOUNT BALANCE', {
        availableBalance,
        totalBalance: accountState.totalBalance,
        marginUsed: accountState.marginUsed,
        unrealizedPnl: accountState.unrealizedPnl,
      });

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.amount) {
        const error = strings('perps.errors.withdrawValidation.amountRequired');
        DevLogger.log('❌ HyperLiquidProvider: MISSING AMOUNT', {
          error,
          params,
        });
        throw new Error(error);
      }

      const withdrawAmount = parseFloat(params.amount);
      DevLogger.log('🔢 HyperLiquidProvider: WITHDRAWAL AMOUNT', {
        requestedAmount: withdrawAmount,
        availableBalance,
        sufficientBalance: withdrawAmount <= availableBalance,
      });

      const balanceValidation = validateBalance(
        withdrawAmount,
        availableBalance,
      );
      if (!balanceValidation.isValid) {
        DevLogger.log('❌ HyperLiquidProvider: INSUFFICIENT BALANCE', {
          error: balanceValidation.error,
          requestedAmount: withdrawAmount,
          availableBalance,
          difference: withdrawAmount - availableBalance,
        });
        throw new Error(balanceValidation.error);
      }
      DevLogger.log('✅ HyperLiquidProvider: BALANCE SUFFICIENT');

      // Step 6: Execute withdrawal via HyperLiquid SDK (API call)
      DevLogger.log('📡 HyperLiquidProvider: CALLING WITHDRAW3 API', {
        destination,
        amount: params.amount,
        endpoint: 'withdraw3',
        timestamp: new Date().toISOString(),
      });

      const result = await exchangeClient.withdraw3({
        destination,
        amount: params.amount,
      });

      DevLogger.log('📊 HyperLiquidProvider: WITHDRAW3 API RESPONSE', {
        status: result.status,
        response: result,
        timestamp: new Date().toISOString(),
      });

      if (result.status === 'ok') {
        DevLogger.log(
          '✅ HyperLiquidProvider: WITHDRAWAL SUBMITTED SUCCESSFULLY',
          {
            destination,
            amount: params.amount,
            assetId: params.assetId,
            status: result.status,
          },
        );
        return {
          success: true,
          // Don't set txHash if we don't have a real transaction hash
          // HyperLiquid's withdraw3 API doesn't return a transaction hash immediately
        };
      }

      const errorMessage = `Withdrawal failed: ${result.status}`;
      DevLogger.log('❌ HyperLiquidProvider: WITHDRAWAL FAILED', {
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
      DevLogger.log('💥 HyperLiquidProvider: WITHDRAWAL EXCEPTION', {
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
    return this.subscriptionService.subscribeToPrices(params);
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
      } catch {
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
        return entryPrice.toFixed(2);
      }

      const liquidationPrice =
        entryPrice - (side * marginAvailable * entryPrice) / denominator;

      // Ensure liquidation price is non-negative
      return Math.max(0, liquidationPrice).toFixed(2);
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
    await this.ensureReady();

    const infoClient = this.clientService.getInfoClient();
    const meta = await infoClient.meta();

    const assetInfo = meta.universe.find((a) => a.name === asset);
    if (!assetInfo) {
      throw new Error(`Asset ${asset} not found`);
    }

    return assetInfo.maxLeverage;
  }

  /**
   * Check withdrawal status using HyperLiquid-specific logic
   */
  async checkWithdrawalStatus(withdrawal: PendingWithdrawal): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    metadata?: Record<string, string | number | boolean | null>;
  }> {
    const now = Date.now();
    const estimatedTime =
      withdrawal.estimatedArrivalTime || withdrawal.initiatedAt + 5 * 60 * 1000;
    const maxWaitTime = estimatedTime + 10 * 60 * 1000; // 15 minutes total

    DevLogger.log('🔍 HyperLiquid: Checking withdrawal status', {
      withdrawalId: withdrawal.withdrawalId,
      amount: withdrawal.amount,
      currentStatus: withdrawal.status,
      initiatedAt: new Date(withdrawal.initiatedAt).toISOString(),
      now: new Date(now).toISOString(),
      elapsedSeconds: Math.floor((now - withdrawal.initiatedAt) / 1000),
    });

    // Check if withdrawal has exceeded maximum wait time
    if (now > maxWaitTime) {
      DevLogger.log('⏱️ HyperLiquid: Withdrawal timeout exceeded', {
        withdrawalId: withdrawal.withdrawalId,
        maxWaitMinutes: 15,
        actualMinutes: Math.floor((now - withdrawal.initiatedAt) / (60 * 1000)),
      });
      return {
        status: 'failed',
        error: 'Withdrawal timeout - please check manually',
      };
    }

    // HyperLiquid-specific timing logic
    const elapsedMinutes = (now - withdrawal.initiatedAt) / (60 * 1000);

    // Update status based on HyperLiquid's process:
    // 0-3 minutes: validators signing
    // 3-5 minutes: bridge finalization
    // 5+ minutes: should be complete
    DevLogger.log('📊 HyperLiquid: Withdrawal phase check', {
      elapsedMinutes: elapsedMinutes.toFixed(2),
      phase:
        elapsedMinutes < 3
          ? 'validator-signing'
          : elapsedMinutes < 5
          ? 'bridge-finalizing'
          : 'should-be-complete',
    });

    if (elapsedMinutes >= 5) {
      DevLogger.log(
        '💰 HyperLiquid: Withdrawal should be complete, checking balance',
        {
          withdrawalId: withdrawal.withdrawalId,
          elapsedMinutes: elapsedMinutes.toFixed(2),
        },
      );

      // Check if we have balance monitoring data
      const { TokenBalancesController } = Engine.context;

      // Force a balance refresh before checking
      try {
        DevLogger.log('🔄 HyperLiquid: Refreshing token balances', {
          chainId: withdrawal.destinationChainId,
        });
        await TokenBalancesController.updateBalances({
          chainIds: [withdrawal.destinationChainId.split(':')[1]] as Hex[],
        });
        DevLogger.log('✅ HyperLiquid: Token balances refreshed');
      } catch (error) {
        DevLogger.log('⚠️ HyperLiquid: Failed to refresh balances', { error });
      }

      // Get USDC address from the withdrawal asset ID
      const arbitrumChainId = withdrawal.destinationChainId.split(':')[1];
      const parsedAsset = parseCaipAssetId(withdrawal.assetId);
      const usdcAddress = parsedAsset.assetReference.startsWith('0x')
        ? parsedAsset.assetReference
        : `0x${parsedAsset.assetReference}`;

      // Check current balance
      const tokenBalancesState = TokenBalancesController.state;
      const accountAddress = withdrawal.destinationAddress; // Don't lowercase - use as-is
      const hexChainId = `0x${parseInt(arbitrumChainId, 10).toString(
        16,
      )}` as Hex; // Convert to hex
      let currentUsdcBalance: string | undefined;

      DevLogger.log('🔍 HyperLiquid: Checking withdrawal balance', {
        elapsedMinutes,
        accountAddress,
        arbitrumChainId,
        hexChainId,
        usdcAddress,
        hasTokenBalances: !!tokenBalancesState.tokenBalances,
      });

      if (tokenBalancesState.tokenBalances) {
        // Access nested structure: tokenBalances[account][chainId][tokenAddress]
        const accountBalances =
          tokenBalancesState.tokenBalances[accountAddress];
        // Cast to proper template literal type for strict typing
        const chainBalances = accountBalances?.[hexChainId as Hex];
        currentUsdcBalance = chainBalances?.[usdcAddress as Hex];

        DevLogger.log('🔍 HyperLiquid: Balance check result', {
          accountAddress,
          hexChainId,
          usdcAddress,
          hasAccountBalances: !!accountBalances,
          hasChainBalances: !!chainBalances,
          currentUsdcBalance,
          // Log structure for debugging
          availableAccounts: Object.keys(
            tokenBalancesState.tokenBalances || {},
          ),
          availableChains: accountBalances ? Object.keys(accountBalances) : [],
          availableTokens: chainBalances ? Object.keys(chainBalances) : [],
        });
      }

      // Check if balance increased
      const baselineBalanceStr = withdrawal.metadata?.baselineBalance;
      if (
        baselineBalanceStr !== undefined &&
        baselineBalanceStr !== null &&
        currentUsdcBalance
      ) {
        // Convert hex balance to decimal with USDC's 6 decimals
        const currentBalanceWei = BigInt(currentUsdcBalance);
        const currentBalanceDecimal = Number(currentBalanceWei) / 1e6; // USDC has 6 decimals

        const baselineBalance = parseFloat(String(baselineBalanceStr));
        const expectedAmount = parseFloat(withdrawal.amount);
        const balanceIncrease = currentBalanceDecimal - baselineBalance;
        const minExpectedIncrease = expectedAmount * 0.9; // Allow 10% for fees

        DevLogger.log('🔍 HyperLiquid: Comparing balances', {
          baselineBalance,
          currentBalanceHex: currentUsdcBalance,
          currentBalanceDecimal,
          expectedAmount,
          balanceIncrease,
          minExpectedIncrease,
          isComplete: balanceIncrease >= minExpectedIncrease,
        });

        if (balanceIncrease >= minExpectedIncrease) {
          DevLogger.log('🎉 HyperLiquid: Withdrawal COMPLETED!', {
            withdrawalId: withdrawal.withdrawalId,
            amount: withdrawal.amount,
            balanceIncrease: balanceIncrease.toFixed(2),
            finalBalance: currentBalanceDecimal.toFixed(2),
            elapsedMinutes: elapsedMinutes.toFixed(2),
          });
          return {
            status: 'completed',
            metadata: {
              finalBalance: currentBalanceDecimal.toString(),
              balanceIncrease: balanceIncrease.toString(),
            },
          };
        }

        DevLogger.log(
          '🔍 HyperLiquid: Balance checked but no increase detected yet',
          {
            withdrawalId: withdrawal.withdrawalId,
            expectedIncrease: minExpectedIncrease.toFixed(2),
            actualIncrease: balanceIncrease.toFixed(2),
            currentBalance: currentBalanceDecimal.toFixed(2),
            baselineBalance: baselineBalance.toFixed(2),
          },
        );
      } else if (!baselineBalanceStr && currentUsdcBalance !== undefined) {
        // Store baseline for future comparisons - convert hex to decimal
        const baselineWei = BigInt(currentUsdcBalance);
        const baselineDecimal = Number(baselineWei) / 1e6; // USDC has 6 decimals

        DevLogger.log('📊 HyperLiquid: Storing baseline balance', {
          withdrawalId: withdrawal.withdrawalId,
          baselineHex: currentUsdcBalance,
          baselineDecimal,
        });

        return {
          status: withdrawal.status,
          metadata: {
            baselineBalance: baselineDecimal.toString(),
            baselineTimestamp: now,
          },
        };
      }

      // After 5 minutes, consider it processing if not completed
      DevLogger.log(
        '⏳ HyperLiquid: Withdrawal still processing after 5 minutes',
        {
          withdrawalId: withdrawal.withdrawalId,
          suggestion: 'Balance may not have updated yet, will check again',
        },
      );
      return { status: 'processing' };
    } else if (elapsedMinutes >= 3) {
      // Validators finalizing
      DevLogger.log('🌉 HyperLiquid: Bridge finalization phase', {
        withdrawalId: withdrawal.withdrawalId,
        elapsedMinutes: elapsedMinutes.toFixed(2),
        expectedCompletion: `${(5 - elapsedMinutes).toFixed(
          1,
        )} minutes remaining`,
      });
      return { status: 'processing' };
    }

    // Still in initial phase
    DevLogger.log('✍️ HyperLiquid: Validator signing phase', {
      withdrawalId: withdrawal.withdrawalId,
      elapsedMinutes: elapsedMinutes.toFixed(2),
      nextPhase: `Bridge finalization in ${(3 - elapsedMinutes).toFixed(
        1,
      )} minutes`,
    });
    return { status: 'pending' };
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
}
