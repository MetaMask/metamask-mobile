import type {
  IPerpsProvider,
  OrderParams as PerpsOrderParams,
  OrderResult,
  Position,
  AccountState,
  MarketInfo,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  WithdrawParams,
  WithdrawResult,
  ToggleTestnetResult,
  InitializeResult,
  ReadyToTradeResult,
  DisconnectResult,
  GetPositionsParams,
  GetAccountStateParams,
  GetSupportedPathsParams,
  SubscribePricesParams,
  SubscribePositionsParams,
  SubscribeOrderFillsParams,
  LiveDataConfig,
  AssetRoute,
} from '../types';
import type { Hex } from '@metamask/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { adaptOrderToSDK, adaptPositionFromSDK, adaptAccountStateFromSDK, adaptMarketFromSDK, buildAssetMapping } from '../../utils/hyperLiquidAdapter';
import {
  createErrorResult,
  validateWithdrawalParams,
  validateAssetSupport,
  validateBalance,
  getSupportedPaths,
  validateOrderParams,
  validateCoinExists,
} from '../../utils/hyperLiquidValidation';
import {
  getBridgeInfo,
  getChainId,
} from '../../constants/hyperLiquidConfig';
import { HyperLiquidClientService } from '../../services/HyperLiquidClientService';
import { HyperLiquidWalletService } from '../../services/HyperLiquidWalletService';
import { HyperLiquidSubscriptionService } from '../../services/HyperLiquidSubscriptionService';

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
  private assetIdToCoin = new Map<number, string>();

  constructor(options: { isTestnet?: boolean } = {}) {
    const isTestnet = options.isTestnet || false;

    // Initialize services
    this.clientService = new HyperLiquidClientService({ isTestnet });
    this.walletService = new HyperLiquidWalletService({ isTestnet });
    this.subscriptionService = new HyperLiquidSubscriptionService(
      this.clientService,
      this.walletService
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
    try {
      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta();
      const { coinToAssetId, assetIdToCoin } = buildAssetMapping(meta.universe);

      this.coinToAssetId = coinToAssetId;
      this.assetIdToCoin = assetIdToCoin;

      DevLogger.log('Asset mapping built', {
        assetCount: meta.universe.length,
        coins: Array.from(this.coinToAssetId.keys())
      });
    } catch (error) {
      DevLogger.log('Failed to build asset mapping:', error);
      throw error;
    }
  }


  /**
   * Get supported deposit routes with complete asset and routing information
   */
  getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    const isTestnet = params?.isTestnet ?? this.clientService.isTestnetMode();
    const supportedAssets = getSupportedPaths({ ...params, isTestnet });
    const bridgeInfo = getBridgeInfo(isTestnet);

    return supportedAssets.map(assetId => ({
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
   * Place an order using HyperLiquid SDK
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

      const exchangeClient = this.clientService.getExchangeClient();
      const sdkOrderParams = adaptOrderToSDK(params, this.coinToAssetId);
      const result = await exchangeClient.order({
        orders: [sdkOrderParams],
        grouping: 'na'
      });

      const status = result.response?.data?.statuses?.[0];
      const restingOrder = status && 'resting' in status ? status.resting : null;
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
   * Cancel an order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    try {
      DevLogger.log('Canceling order:', params);

      // Validate coin exists
      const coinValidation = validateCoinExists(params.coin, this.coinToAssetId);
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
        cancels: [{
          a: asset,
          o: parseInt(params.orderId, 10)
        }]
      });

      const success = result.response?.data?.statuses?.[0] === 'success';

      return {
        success,
        orderId: params.orderId,
        error: success ? undefined : 'Order cancellation failed'
      };
    } catch (error) {
      DevLogger.log('Order cancellation failed:', error);
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
      const position = positions.find(p => p.coin === params.coin);

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
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    try {
      DevLogger.log('Getting positions via HyperLiquid SDK:', params);

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(params?.accountId);
      const clearingState = await infoClient.clearinghouseState({ user: userAddress });

      return clearingState.assetPositions
        .filter(assetPos => assetPos.position.szi !== '0')
        .map(assetPos => adaptPositionFromSDK(assetPos));
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
      DevLogger.log('Getting account state via HyperLiquid SDK:', params);

      const infoClient = this.clientService.getInfoClient();
      const userAddress = await this.walletService.getUserAddressWithDefault(params?.accountId);

      // Get both Perps and Spot balances
      const [perpsState, spotState] = await Promise.all([
        infoClient.clearinghouseState({ user: userAddress }),
        infoClient.spotClearinghouseState({ user: userAddress })
      ]);

      DevLogger.log('Perps state:', perpsState);
      DevLogger.log('Spot state:', spotState);

      return adaptAccountStateFromSDK(perpsState, spotState);
    } catch (error) {
      DevLogger.log('Error getting account state:', error);
      return {
        availableBalance: '0',
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
      };
    }
  }

  /**
   * Get available markets
   */
  async getMarkets(): Promise<MarketInfo[]> {
    try {
      DevLogger.log('Getting markets via HyperLiquid SDK');

      const infoClient = this.clientService.getInfoClient();
      const meta = await infoClient.meta();
      return meta.universe.map(asset => adaptMarketFromSDK(asset));
    } catch (error) {
      DevLogger.log('Error getting markets:', error);
      return [];
    }
  }

  // NOTE: deposit() method removed from provider - handled by PerpsController routing
  // withdraw() method stays here since it's a HyperLiquid API operation

  /**
   * Withdraw funds from HyperLiquid trading account
   *
   * This initiates a withdrawal request via HyperLiquid's API (withdraw3 endpoint).
   * The actual funds transfer happens on HyperLiquid's side after API confirmation.
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    try {
      DevLogger.log('Withdrawing funds:', params);

      // Validate withdrawal parameters
      const validation = validateWithdrawalParams(params);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Get supported withdrawal routes and validate asset
      const supportedRoutes = this.getWithdrawalRoutes();

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.assetId) {
        throw new Error('assetId is required for withdrawals');
      }

      const assetValidation = validateAssetSupport(params.assetId, supportedRoutes);
      if (!assetValidation.isValid) {
        throw new Error(assetValidation.error);
      }

      // Validate destination address if provided
      let destination: Hex;
      if (params.destination) {
        destination = params.destination;
      } else {
        destination = await this.walletService.getUserAddressWithDefault();
      }

      // Ensure client is ready
      await this.ensureReady();
      const exchangeClient = this.clientService.getExchangeClient();

      // Validate amount against account balance
      const accountState = await this.getAccountState();
      const availableBalance = parseFloat(accountState.availableBalance);

      // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
      if (!params.amount) {
        throw new Error('amount is required for withdrawals');
      }

      const withdrawAmount = parseFloat(params.amount);

      const balanceValidation = validateBalance(withdrawAmount, availableBalance);
      if (!balanceValidation.isValid) {
        throw new Error(balanceValidation.error);
      }

      // Execute withdrawal via HyperLiquid SDK (API call)
      const result = await exchangeClient.withdraw3({
        destination,
        amount: params.amount,
      });

      if (result.status === 'ok') {
        return {
          success: true,
          txHash: 'Withdrawal submitted successfully',
        };
      }

      return {
        success: false,
        error: `Withdrawal failed: ${result.status}`,
      };
    } catch (error) {
      DevLogger.log('Withdrawal failed:', error);
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
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Disconnect provider
   */
  async disconnect(): Promise<DisconnectResult> {
    try {
      DevLogger.log('HyperLiquid: Disconnecting provider', {
        isTestnet: this.clientService.isTestnetMode(),
        timestamp: new Date().toISOString()
      });

      // Clear subscriptions through subscription service
      this.subscriptionService.clearAll();

      // Disconnect client service
      await this.clientService.disconnect();

      DevLogger.log('HyperLiquid: Provider fully disconnected', {
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return createErrorResult(error, { success: false });
    }
  }

}
