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
  PriceUpdate,
  OrderFill,
} from '../types';
import { parseCaipAccountId, type CaipAssetId, type CaipAccountId, type CaipChainId, type Hex, isValidHexAddress } from '@metamask/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  ExchangeClient,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
  type Subscription,
  type WsAllMids,
  type WsWebData2,
  type WsUserFills
} from '@deeeed/hyperliquid-node20';
import { adaptOrderToSDK, adaptPositionFromSDK, adaptAccountStateFromSDK, adaptMarketFromSDK, buildAssetMapping } from '../../utils/hyperLiquidAdapter';
import { store } from '../../../../../store';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import Engine from '../../../../../core/Engine';
import { SignTypedDataVersion } from '@metamask/keyring-controller';

// Network constants
const ARBITRUM_MAINNET_CHAIN_ID = '42161';
const ARBITRUM_TESTNET_CHAIN_ID = '421614';
const ARBITRUM_MAINNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_MAINNET_CHAIN_ID}`;
const ARBITRUM_TESTNET_CAIP_CHAIN_ID = `eip155:${ARBITRUM_TESTNET_CHAIN_ID}`;

/**
 * HyperLiquid provider implementation
 *
 * Implements the IPerpsProvider interface for HyperLiquid protocol.
 * Uses the @deeeed/hyperliquid-node20 SDK for all operations.
 */
export class HyperLiquidProvider implements IPerpsProvider {
  readonly protocolId = 'hyperliquid';

  private readonly assetConfigs = {
    'USDC': {
      mainnet: `${ARBITRUM_MAINNET_CAIP_CHAIN_ID}/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default`,
      testnet: `${ARBITRUM_TESTNET_CAIP_CHAIN_ID}/erc20:0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d/default`
    }
  } as const;

  // HyperLiquid bridge contract addresses for direct USDC deposits
  // These are the official bridge contracts where USDC must be sent to credit user's HyperLiquid account
  // Format: CAIP chain ID + contract address for multichain abstraction
  private readonly bridgeContracts = {
    mainnet: {
      chainId: ARBITRUM_MAINNET_CAIP_CHAIN_ID,
      contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7'
    },
    testnet: {
      chainId: ARBITRUM_TESTNET_CAIP_CHAIN_ID,
      contractAddress: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89'
    }
  } as const;

  private exchangeClient?: ExchangeClient;
  private infoClient?: InfoClient;
  private subscriptionClient?: SubscriptionClient;
  private isTestnet: boolean;

  // Live data management
  private priceSubscribers = new Map<string, Set<(prices: PriceUpdate[]) => void>>();
  private positionSubscribers = new Set<(positions: Position[]) => void>();
  private orderFillSubscribers = new Set<(fills: OrderFill[]) => void>();

  // Asset mapping
  private coinToAssetId = new Map<string, number>();
  private assetIdToCoin = new Map<number, string>();

  // Wallet adapter for HyperLiquid SDK - created internally
  private readonly wallet: {
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
  };

  constructor(options: { isTestnet?: boolean } = {}) {
    this.isTestnet = options.isTestnet || false;

    // Create wallet adapter internally
    this.wallet = this.createWalletAdapter();

    // Initialize clients
    this.initializeClients();
  }

  /**
   * Create wallet adapter that implements AbstractWindowEthereum interface
   * This is specific to HyperLiquid's SDK requirements
   */
  private createWalletAdapter(): {
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
  } {
    return {
      request: async (args: { method: string; params: unknown[] }): Promise<unknown> => {
        switch (args.method) {
          case 'eth_requestAccounts': {
            const selectedAddress = selectSelectedInternalAccountAddress(store.getState());
            if (!selectedAddress) {
              throw new Error('No account selected. Please ensure MetaMask has an active account.');
            }
            return [selectedAddress];
          }

          case 'eth_signTypedData_v4': {
            const [address, data] = args.params as [string, string | object];
            const selectedAddress = selectSelectedInternalAccountAddress(store.getState());

            // Check if account is selected
            if (!selectedAddress) {
              throw new Error('No account selected');
            }

            // Verify the signing address matches the selected account
            if (address.toLowerCase() !== selectedAddress.toLowerCase()) {
              throw new Error('Signing address does not match selected account');
            }

            // Parse the JSON string if needed
            const typedData = typeof data === 'string' ? JSON.parse(data) : data;

            // Use Engine's KeyringController directly
            const signature = await Engine.context.KeyringController.signTypedMessage(
              {
                from: address,
                data: typedData,
              },
              SignTypedDataVersion.V4
            );

            return signature;
          }

          default:
            throw new Error(`Unsupported method: ${args.method}`);
        }
      }
    };
  }

  /**
   * Initialize HyperLiquid SDK clients
   */
  private initializeClients(): void {
    try {
      const transport = this.createTransport();

      this.exchangeClient = new ExchangeClient({
        wallet: this.wallet,
        transport,
        isTestnet: this.isTestnet
      });

      this.infoClient = new InfoClient({ transport });
      this.subscriptionClient = new SubscriptionClient({ transport });

      DevLogger.log('HyperLiquid SDK clients initialized', {
        testnet: this.isTestnet,
        protocolId: this.protocolId,
        endpoint: this.isTestnet ? 'wss://api.hyperliquid-testnet.xyz/ws' : 'wss://api.hyperliquid.xyz/ws',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      DevLogger.log('Failed to initialize HyperLiquid SDK clients:', error);
      throw error;
    }
  }

  /**
   * Create WebSocket transport
   */
  private createTransport(): WebSocketTransport {
    const wsUrl = this.isTestnet
      ? 'wss://api.hyperliquid-testnet.xyz/ws'
      : 'wss://api.hyperliquid.xyz/ws';

    DevLogger.log('HyperLiquid: Creating WebSocket transport', {
      endpoint: wsUrl,
      isTestnet: this.isTestnet,
      timestamp: new Date().toISOString()
    });

    return new WebSocketTransport({
      url: wsUrl,
      timeout: 10_000,
      keepAlive: { interval: 30_000 },
      reconnect: {
        maxRetries: 5,
        connectionTimeout: 10_000
      }
    });
  }

  /**
   * Ensure clients are initialized and asset mapping is loaded
   */
  private async ensureReady(): Promise<void> {
    if (!this.exchangeClient || !this.infoClient || !this.subscriptionClient) {
      throw new Error('HyperLiquid SDK clients not properly initialized');
    }

    if (this.coinToAssetId.size === 0) {
      await this.buildAssetMapping();
    }
  }

  /**
   * Build asset ID mapping from market metadata
   */
  private async buildAssetMapping(): Promise<void> {
    try {
      if (!this.infoClient) {
        throw new Error('InfoClient is not initialized');
      }

      const meta = await this.infoClient.meta();
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
   * Get user address with error handling
   */
  private async getUserAddressWithDefault(accountId?: CaipAccountId): Promise<Hex> {
    const id = accountId || await this.getCurrentAccountId();
    return this.getUserAddress(id);
  }

  /**
   * Create standardized error response
   */
  private createErrorResult<T extends { success: boolean; error?: string }>(
    error: unknown,
    defaultResponse: T
  ): T {
    return {
      ...defaultResponse,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  /**
   * Get supported deposit paths - returns CAIP asset IDs for multichain abstraction
   */
  getSupportedDepositPaths(params?: GetSupportedPathsParams): CaipAssetId[] {
    const isTestnet = params?.isTestnet ?? this.isTestnet;
    const assets = Object.values(this.assetConfigs).map(config =>
      isTestnet ? config.testnet : config.mainnet
    );

    const filteredAssets = this.applyPathFilters(assets, params);

    DevLogger.log('HyperLiquid: getSupportedDepositPaths', {
      isTestnet,
      requestedParams: params,
      assetConfigs: this.assetConfigs,
      allAssets: assets,
      filteredAssets,
      currentInstanceTestnet: this.isTestnet,
      returnType: 'CaipAssetId[]',
      example: filteredAssets[0]
    });

    return filteredAssets;
  }

  /**
   * Get supported withdrawal paths
   */
  getSupportedWithdrawalPaths(params?: GetSupportedPathsParams): CaipAssetId[] {
    return this.getSupportedDepositPaths(params);
  }

  /**
   * Get the HyperLiquid bridge information for deposits
   * Returns both the CAIP chain ID and contract address where USDC must be sent
   */
  getBridgeInfo(): { chainId: CaipChainId; contractAddress: Hex } {
    const bridgeConfig = this.isTestnet ? this.bridgeContracts.testnet : this.bridgeContracts.mainnet;
    return {
      chainId: bridgeConfig.chainId,
      contractAddress: bridgeConfig.contractAddress,
    };
  }

  /**
   * Apply filters to asset paths
   */
  private applyPathFilters(assets: CaipAssetId[], params?: GetSupportedPathsParams): CaipAssetId[] {
    if (!params) {
      DevLogger.log('HyperLiquid: applyPathFilters - no params, returning all assets', { assets });
      return assets;
    }

    let filtered = assets;

    DevLogger.log('HyperLiquid: applyPathFilters - starting filter', {
      initialAssets: assets,
      filterParams: params
    });

    if (params.chainId) {
      const before = filtered;
      filtered = filtered.filter(asset => asset.startsWith(params.chainId as string));
      DevLogger.log('HyperLiquid: applyPathFilters - chainId filter', {
        chainId: params.chainId,
        before,
        after: filtered
      });
    }

    if (params.symbol && params.symbol in this.assetConfigs) {
      const config = this.assetConfigs[params.symbol as keyof typeof this.assetConfigs];
      const isTestnet = params.isTestnet ?? this.isTestnet;
      const selectedAsset = isTestnet ? config.testnet : config.mainnet;
      const before = filtered;
      filtered = [selectedAsset];
      DevLogger.log('HyperLiquid: applyPathFilters - symbol filter', {
        symbol: params.symbol,
        isTestnet,
        config,
        selectedAsset,
        before,
        after: filtered
      });
    }

    if (params.assetId) {
      const before = filtered;
      // Use case-insensitive comparison for asset ID matching to handle address case differences
      filtered = filtered.filter(asset => asset.toLowerCase() === params.assetId?.toLowerCase());
      DevLogger.log('HyperLiquid: applyPathFilters - assetId filter', {
        assetId: params.assetId,
        before,
        after: filtered,
        exactMatch: before.includes(params.assetId),
        caseInsensitiveMatch: before.some(asset => asset.toLowerCase() === params.assetId?.toLowerCase())
      });
    }

    DevLogger.log('HyperLiquid: applyPathFilters - final result', {
      initialAssets: assets,
      finalFiltered: filtered,
      filterParams: params
    });

    return filtered;
  }

  /**
   * Place an order using HyperLiquid SDK
   */
  async placeOrder(params: PerpsOrderParams): Promise<OrderResult> {
    try {
      DevLogger.log('Placing order via HyperLiquid SDK:', params);

      await this.ensureReady();

      if (!this.exchangeClient) {
        throw new Error('ExchangeClient is not initialized');
      }

      const sdkOrderParams = adaptOrderToSDK(params, this.coinToAssetId);
      const result = await this.exchangeClient.order({
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
      return this.createErrorResult(error, { success: false });
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    try {
      DevLogger.log('Canceling order:', params);

      await this.ensureReady();

      if (!this.exchangeClient) {
        throw new Error('ExchangeClient is not initialized');
      }

      const asset = this.coinToAssetId.get(params.coin);
      if (asset === undefined) {
        throw new Error(`Unknown coin: ${params.coin}`);
      }

      const result = await this.exchangeClient.cancel({
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
      return this.createErrorResult(error, { success: false });
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
      return this.createErrorResult(error, { success: false });
    }
  }

  /**
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    try {
      DevLogger.log('Getting positions via HyperLiquid SDK:', params);

      if (!this.infoClient) {
        throw new Error('HyperLiquid client not initialized');
      }

      const userAddress = await this.getUserAddressWithDefault(params?.accountId);
      const clearingState = await this.infoClient.clearinghouseState({ user: userAddress });

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

      if (!this.infoClient) {
        throw new Error('HyperLiquid client not initialized');
      }

      const userAddress = await this.getUserAddressWithDefault(params?.accountId);

      // Get both Perps and Spot balances
      const [perpsState, spotState] = await Promise.all([
        this.infoClient.clearinghouseState({ user: userAddress }),
        this.infoClient.spotClearinghouseState({ user: userAddress })
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

      if (!this.infoClient) {
        throw new Error('InfoClient is not initialized');
      }

      const meta = await this.infoClient.meta();
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

      // Validate required parameters
      if (!params.assetId) {
        throw new Error('assetId is required for withdrawals');
      }

      // Validate amount
      if (!params.amount || parseFloat(params.amount) <= 0) {
        throw new Error('Amount must be a positive number');
      }

      // Get supported withdrawal paths and validate asset
      const supportedPaths = this.getSupportedWithdrawalPaths();
      if (!supportedPaths.includes(params.assetId)) {
        const supportedAssets = supportedPaths.map(path => {
          // Extract symbol from CAIP asset ID
          const parts = path.split('/');
          return parts[parts.length - 2] || 'Unknown';
        }).join(', ');

        throw new Error(
          `Asset ${params.assetId} is not supported for withdrawals. ` +
          `Supported assets: ${supportedAssets}`
        );
      }

      // Validate destination address if provided
      let destination: Hex;
      if (params.destination) {
        if (!isValidHexAddress(params.destination)) {
          throw new Error(`Invalid destination address format: ${params.destination}`);
        }
        destination = params.destination;
      } else {
        destination = await this.getUserAddressWithDefault();
      }

      // Ensure client is ready
      await this.ensureReady();

      if (!this.exchangeClient) {
        throw new Error('HyperLiquid client not initialized');
      }

      // Validate amount against account balance
      const accountState = await this.getAccountState();
      const availableBalance = parseFloat(accountState.availableBalance);
      const withdrawAmount = parseFloat(params.amount);

      if (withdrawAmount > availableBalance) {
        throw new Error(
          `Insufficient balance. Available: ${availableBalance}, ` +
          `Requested: ${withdrawAmount}`
        );
      }

      // Execute withdrawal via HyperLiquid SDK (API call)
      const result = await this.exchangeClient.withdraw3({
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
      return this.createErrorResult(error, { success: false });
    }
  }

  /**
   * Ensure subscription client is available, recreate if needed
   */
  private ensureSubscriptionClient(): void {
    if (!this.subscriptionClient) {
      DevLogger.log('HyperLiquid: Recreating subscription client after disconnect');
      this.initializeClients();
    }
  }

  /**
   * Create subscription with common error handling
   */
  private createSubscription<T>(
    subscribers: Set<T> | Map<string, Set<T>>,
    callback: T,
    key?: string
  ): () => void {
    this.ensureSubscriptionClient();

    if (!this.subscriptionClient) {
      DevLogger.log('SubscriptionClient not initialized');
      return () => {
        // No-op: subscription client not available
      };
    }

    if (subscribers instanceof Map && key) {
      if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
      }
      subscribers.get(key)?.add(callback);
    } else if (subscribers instanceof Set) {
      subscribers.add(callback);
    }

    return () => {
      if (subscribers instanceof Map && key) {
        subscribers.get(key)?.delete(callback);
      } else if (subscribers instanceof Set) {
        subscribers.delete(callback);
      }
    };
  }

  /**
   * Subscribe to live price updates
   */
  subscribeToPrices(params: SubscribePricesParams): () => void {
    const { symbols, callback } = params;
    const unsubscribers: (() => void)[] = [];

    symbols.forEach(symbol => {
      unsubscribers.push(
        this.createSubscription(this.priceSubscribers, callback, symbol)
      );
    });

    // Subscribe to all mids via SDK
    let subscription: Subscription | undefined;

    this.ensureSubscriptionClient();
    if (this.subscriptionClient) {
      this.subscriptionClient.allMids((data: WsAllMids) => {
        const priceUpdates: PriceUpdate[] = symbols
          .filter(symbol => data.mids[symbol] !== undefined)
          .map(symbol => ({
            coin: symbol,
            price: data.mids[symbol].toString(),
            timestamp: Date.now(),
          }));

        if (priceUpdates.length > 0) {
          callback(priceUpdates);
        }
      }).then(sub => {
        subscription = sub;
      }).catch(error => {
        DevLogger.log('Failed to subscribe to price updates:', error);
      });
    }

    return () => {
      unsubscribers.forEach(fn => fn());

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          DevLogger.log('Failed to unsubscribe from price updates:', error);
        });
      }
    };
  }

  /**
   * Subscribe to live position updates
   */
  subscribeToPositions(params: SubscribePositionsParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(this.positionSubscribers, callback);

    let subscription: Subscription | undefined;

    this.ensureSubscriptionClient();
    if (this.subscriptionClient) {
      this.getUserAddressWithDefault(accountId)
        .then(userAddress => {
          if (!this.subscriptionClient) {
            throw new Error('SubscriptionClient is not initialized');
          }

          return this.subscriptionClient.webData2({ user: userAddress }, (data: WsWebData2) => {
            if (data.clearinghouseState.assetPositions) {
              const positions: Position[] = data.clearinghouseState.assetPositions
                .filter(assetPos => assetPos.position.szi !== '0')
                .map(assetPos => adaptPositionFromSDK(assetPos));

              callback(positions);
            }
          });
        })
        .then(sub => {
          subscription = sub;
        })
        .catch(error => {
          DevLogger.log('Failed to subscribe to position updates:', error);
        });
    }

    return () => {
      unsubscribe();

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          DevLogger.log('Failed to unsubscribe from position updates:', error);
        });
      }
    };
  }

  /**
   * Subscribe to live order fill updates
   */
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(this.orderFillSubscribers, callback);

    let subscription: Subscription | undefined;

    this.ensureSubscriptionClient();
    if (this.subscriptionClient) {
      this.getUserAddressWithDefault(accountId)
        .then(userAddress => {
          if (!this.subscriptionClient) {
            throw new Error('SubscriptionClient is not initialized');
          }

          return this.subscriptionClient.userFills({ user: userAddress }, (data: WsUserFills) => {
            const orderFills: OrderFill[] = data.fills.map(fill => ({
              orderId: fill.oid.toString(),
              symbol: fill.coin,
              side: fill.side,
              size: fill.sz,
              price: fill.px,
              fee: fill.fee,
              timestamp: fill.time,
            }));

            callback(orderFills);
          });
        })
        .then(sub => {
          subscription = sub;
        })
        .catch(error => {
          DevLogger.log('Failed to subscribe to order fill updates:', error);
        });
    }

    return () => {
      unsubscribe();

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          DevLogger.log('Failed to unsubscribe from order fill updates:', error);
        });
      }
    };
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
      this.isTestnet = !this.isTestnet;
      this.initializeClients();
      return {
        success: true,
        isTestnet: this.isTestnet,
      };
    } catch (error) {
      return this.createErrorResult(error, {
        success: false,
        isTestnet: this.isTestnet,
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
        chainId: this.isTestnet ? ARBITRUM_TESTNET_CHAIN_ID : ARBITRUM_MAINNET_CHAIN_ID,
      };
    } catch (error) {
      return this.createErrorResult(error, { success: false });
    }
  }

  /**
   * Check if ready to trade
   */
  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    try {
      const walletConnected = !!this.exchangeClient && !!this.infoClient;

      let accountConnected = false;
      try {
        await this.getCurrentAccountId();
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
        isTestnet: this.isTestnet,
        endpoint: this.isTestnet ? 'wss://api.hyperliquid-testnet.xyz/ws' : 'wss://api.hyperliquid.xyz/ws',
        subscribersCount: {
          prices: this.priceSubscribers.size,
          positions: this.positionSubscribers.size,
          orderFills: this.orderFillSubscribers.size
        },
        timestamp: new Date().toISOString()
      });

      // Properly close the WebSocket connection using SDK's AsyncDisposable
      if (this.subscriptionClient) {
        try {
          await this.subscriptionClient[Symbol.asyncDispose]();
          DevLogger.log('HyperLiquid: Properly closed WebSocket connection via asyncDispose', {
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          DevLogger.log('HyperLiquid: Error closing WebSocket connection', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
        // Clear the subscription client reference so it gets recreated on next use
        this.subscriptionClient = undefined;
      }

      // Clear all local subscriber collections
      this.priceSubscribers.clear();
      this.positionSubscribers.clear();
      this.orderFillSubscribers.clear();

      DevLogger.log('HyperLiquid: Provider fully disconnected', {
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      return this.createErrorResult(error, { success: false });
    }
  }

  /**
   * Get current account ID from Redux store
   */
  private async getCurrentAccountId(): Promise<CaipAccountId> {
    const selectedAddress = selectSelectedInternalAccountAddress(store.getState());

    if (!selectedAddress) {
      throw new Error('No account selected. Please ensure MetaMask has an active account.');
    }

    const chainId = this.isTestnet ? ARBITRUM_TESTNET_CHAIN_ID : ARBITRUM_MAINNET_CHAIN_ID;
    const caipAccountId: CaipAccountId = `eip155:${chainId}:${selectedAddress}`;

    return caipAccountId;
  }

  /**
   * Get validated user address as Hex from account ID
   */
  private getUserAddress(accountId: CaipAccountId): Hex {
    const parsed = parseCaipAccountId(accountId);
    const address = parsed.address as Hex;

    if (!isValidHexAddress(address)) {
      throw new Error(`Invalid address format: ${address}`);
    }

    return address;
  }
}
