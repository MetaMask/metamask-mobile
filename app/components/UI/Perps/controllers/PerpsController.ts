import type { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import { BaseController, type RestrictedMessenger } from '@metamask/base-controller';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { TransactionParams } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { generateTransferData } from '../../../../util/transactions';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import type {
  AccountState,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DepositResult,
  GetAccountStateParams,
  GetPositionsParams,
  IPerpsProvider,
  LiveDataConfig,
  MarketInfo,
  OrderParams,
  OrderResult,
  Position,
  SubscribeOrderFillsParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  SwitchProviderResult,
  ToggleTestnetResult,
  WithdrawParams,
  WithdrawResult,
} from './types';

/**
 * State shape for PerpsController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsControllerState = {
  // Active provider
  activeProvider: string;
  isTestnet: boolean;     // Dev toggle for testnet
  connectionStatus: 'disconnected' | 'connecting' | 'connected';

  // Account data (persisted) - using HyperLiquid property names
  positions: Position[];
  accountState: AccountState | null;

  // Order management
  pendingOrders: OrderParams[];
  orderHistory: OrderResult[];

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;
};

/**
 * Get default PerpsController state
 */
export const getDefaultPerpsControllerState = (): PerpsControllerState => ({
  activeProvider: 'hyperliquid',
  isTestnet: __DEV__, // Default to testnet in dev
  connectionStatus: 'disconnected',
  positions: [],
  accountState: null,
  pendingOrders: [],
  orderHistory: [],
  lastError: null,
  lastUpdateTimestamp: 0,
});

/**
 * State metadata for the PerpsController
 */
const metadata = {
  positions: { persist: true, anonymous: false },
  accountState: { persist: true, anonymous: false },
  orderHistory: { persist: true, anonymous: false },
  isTestnet: { persist: true, anonymous: false },
  activeProvider: { persist: true, anonymous: false },
  connectionStatus: { persist: false, anonymous: false },
  pendingOrders: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
};

/**
 * PerpsController events
 */
export interface PerpsControllerEvents {
  type: 'PerpsController:stateChange';
  payload: [PerpsControllerState, PerpsControllerState[]];
}

/**
 * PerpsController actions
 */
export type PerpsControllerActions = {
  type: 'PerpsController:getState';
  handler: () => PerpsControllerState;
} | {
  type: 'PerpsController:placeOrder';
  handler: PerpsController['placeOrder'];
} | {
  type: 'PerpsController:cancelOrder';
  handler: PerpsController['cancelOrder'];
} | {
  type: 'PerpsController:closePosition';
  handler: PerpsController['closePosition'];
} | {
  type: 'PerpsController:deposit';
  handler: PerpsController['deposit'];
} | {
  type: 'PerpsController:withdraw';
  handler: PerpsController['withdraw'];
} | {
  type: 'PerpsController:getPositions';
  handler: PerpsController['getPositions'];
} | {
  type: 'PerpsController:getAccountState';
  handler: PerpsController['getAccountState'];
} | {
  type: 'PerpsController:getMarkets';
  handler: PerpsController['getMarkets'];
} | {
  type: 'PerpsController:toggleTestnet';
  handler: PerpsController['toggleTestnet'];
} | {
  type: 'PerpsController:disconnect';
  handler: PerpsController['disconnect'];
};

/**
 * External actions the PerpsController can call
 */
export type AllowedActions =
  | AccountsControllerGetSelectedAccountAction['type']
  | NetworkControllerGetStateAction['type'];

/**
 * External events the PerpsController can subscribe to
 */
export type AllowedEvents =
  | 'AccountsController:selectedAccountChange'
  | 'NetworkController:stateChange';

/**
 * PerpsController messenger constraints
 */
export type PerpsControllerMessenger = RestrictedMessenger<
  'PerpsController',
  PerpsControllerActions,
  PerpsControllerEvents,
  AllowedActions,
  AllowedEvents
>;

/**
 * PerpsController options
 */
export interface PerpsControllerOptions {
  messenger: PerpsControllerMessenger;
  state?: Partial<PerpsControllerState>;
}

/**
 * PerpsController - Protocol-agnostic perpetuals trading controller
 *
 * Provides a unified interface for perpetual futures trading across multiple protocols.
 * Features dual data flow architecture:
 * - Trading actions use Redux for persistence and optimistic updates
 * - Live data uses direct callbacks for maximum performance
 */
export class PerpsController extends BaseController<
  'PerpsController',
  PerpsControllerState,
  PerpsControllerMessenger
> {
  private providers: Map<string, IPerpsProvider>;

  constructor({ messenger, state = {} }: PerpsControllerOptions) {
    super({
      name: 'PerpsController',
      metadata,
      messenger,
      state: { ...getDefaultPerpsControllerState(), ...state },
    });

    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize all available providers
   */
  private async initializeProviders(): Promise<void> {
    DevLogger.log('PerpsController: Reinitializing providers', {
      currentNetwork: this.state.isTestnet ? 'testnet' : 'mainnet',
      existingProviders: Array.from(this.providers.keys()),
      timestamp: new Date().toISOString()
    });

    // Disconnect existing providers to close WebSocket connections
    const existingProviders = Array.from(this.providers.values());
    if (existingProviders.length > 0) {
      DevLogger.log('PerpsController: Disconnecting existing providers', {
        count: existingProviders.length,
        timestamp: new Date().toISOString()
      });
      await Promise.all(existingProviders.map(provider => provider.disconnect()));
    }
    this.providers.clear();

    // HyperLiquid provider handles its own wallet/authentication internally
    DevLogger.log('PerpsController: Creating new HyperLiquid provider', {
      isTestnet: this.state.isTestnet,
      expectedEndpoint: this.state.isTestnet
        ? 'wss://api.hyperliquid-testnet.xyz/ws'
        : 'wss://api.hyperliquid.xyz/ws',
      timestamp: new Date().toISOString()
    });

    this.providers.set('hyperliquid', new HyperLiquidProvider(
      { isTestnet: this.state.isTestnet }
    ));

    // Future providers can be added here with their own authentication patterns:
    // - Some might use API keys: new BinanceProvider({ apiKey, apiSecret })
    // - Some might use different wallet patterns: new GMXProvider({ signer })
    // - Some might not need auth at all: new DydxProvider()
  }

  /**
   * Get the currently active provider
   */
  getActiveProvider(): IPerpsProvider {
    const provider = this.providers.get(this.state.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.state.activeProvider} not found`);
    }
    return provider;
  }

  /**
   * Place a new order
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();

    // Optimistic update
    this.update(state => {
      state.pendingOrders.push(params);
    });

    const result = await provider.placeOrder(params);

    // Update state
    this.update(state => {
      state.pendingOrders = state.pendingOrders.filter(o => o !== params);
      state.orderHistory.push(result);
      state.lastUpdateTimestamp = Date.now();
    });

    return result;
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    const provider = this.getActiveProvider();
    const result = await provider.cancelOrder(params);

    if (result.success) {
      this.update(state => {
        state.lastUpdateTimestamp = Date.now();
      });
    }

    return result;
  }

  /**
   * Close a position (partial or full)
   */
  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const result = await provider.closePosition(params);

    if (result.success) {
      this.update(state => {
        state.lastUpdateTimestamp = Date.now();
      });
    }

    return result;
  }

  /**
   * Deposit funds to trading account
   * Routes deposits based on chain compatibility:
   * - Same chain (Arbitrum): Direct ERC20 transfer to HyperLiquid contract
   * - Cross chain: Bridge transfer via BridgeController
   */
  async deposit(params: DepositParams): Promise<DepositResult> {
    try {
      // Validate required parameters
      if (!params.amount || params.amount === '0') {
        return { success: false, error: 'Amount is required and must be greater than 0' };
      }

      if (!params.assetId) {
        return { success: false, error: 'AssetId is required for deposit validation' };
      }

      // Get current account and network info
      const { AccountsController, NetworkController } = Engine.context;
      const selectedAccount = AccountsController.getSelectedAccount();
      const networkState = NetworkController.state;

      // Set defaults for missing parameters
      const fromChainId = params.fromChainId || `eip155:${networkState.selectedNetworkClientId}`;
      const toChainId = params.toChainId || 'eip155:42161'; // HyperLiquid on Arbitrum
      const recipient = params.recipient || selectedAccount.address as Hex;

      // Check if asset is supported for deposits
      const provider = this.getActiveProvider();
      const supportedPaths = provider.getSupportedDepositPaths({ assetId: params.assetId });

      if (!supportedPaths.includes(params.assetId)) {
        return {
          success: false,
          error: `Asset ${params.assetId} not supported for deposits. Supported: ${supportedPaths.join(', ')}`
        };
      }

      // Route based on chain compatibility
      if (fromChainId === toChainId || fromChainId === 'eip155:42161') {
        // Same chain or Arbitrum -> Direct ERC20 transfer
        return this.executeDirectDeposit({
          ...params,
          fromChainId,
          recipient,
          accountAddress: selectedAccount.address as Hex
        });
      }

      // Cross-chain -> Bridge transfer (TODO: implement BridgeController integration)
      return {
        success: false,
        error: 'Cross-chain deposits will be implemented via BridgeController integration'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deposit error'
      };
    }
  }

  /**
   * Withdraw funds from trading account
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    const provider = this.getActiveProvider();
    return provider.withdraw(params);
  }

  /**
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    const provider = this.getActiveProvider();
    const positions = await provider.getPositions(params);

    this.update(state => {
      state.positions = positions;
      state.lastUpdateTimestamp = Date.now();
    });

    return positions;
  }

  /**
   * Get account state (balances, etc.)
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    const provider = this.getActiveProvider();
    const accountState = await provider.getAccountState(params);

    this.update(state => {
      state.accountState = accountState;
      state.lastUpdateTimestamp = Date.now();
    });

    return accountState;
  }

  /**
   * Get available markets with optional filtering
   */
  async getMarkets(params?: { symbols?: string[] }): Promise<MarketInfo[]> {
    const provider = this.getActiveProvider();
    const allMarkets = await provider.getMarkets();

    // Filter by symbols if provided
    if (params?.symbols && params.symbols.length > 0) {
      return allMarkets.filter(market =>
        params.symbols?.some(symbol =>
          market.name.toLowerCase() === symbol.toLowerCase()
        )
      );
    }

    return allMarkets;
  }

  /**
   * Toggle between testnet and mainnet
   */
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    try {
      const previousNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      this.update(state => {
        state.isTestnet = !state.isTestnet;
        state.connectionStatus = 'disconnected';
      });

      const newNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      DevLogger.log('PerpsController: Network toggle initiated', {
        from: previousNetwork,
        to: newNetwork,
        timestamp: new Date().toISOString()
      });

      // Reinitialize provider with new testnet setting
      await this.initializeProviders();

      DevLogger.log('PerpsController: Network toggle completed', {
        newNetwork,
        isTestnet: this.state.isTestnet,
        timestamp: new Date().toISOString()
      });

      return { success: true, isTestnet: this.state.isTestnet };
    } catch (error) {
      return {
        success: false,
        isTestnet: this.state.isTestnet,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Switch to a different provider
   */
  async switchProvider(providerId: string): Promise<SwitchProviderResult> {
    if (!this.providers.has(providerId)) {
      return {
        success: false,
        providerId: this.state.activeProvider,
        error: `Provider ${providerId} not available`
      };
    }

    this.update(state => {
      state.activeProvider = providerId;
      state.connectionStatus = 'disconnected';
    });

    return { success: true, providerId };
  }

  /**
   * Get current network (mainnet/testnet)
   */
  getCurrentNetwork(): 'mainnet' | 'testnet' {
    return this.state.isTestnet ? 'testnet' : 'mainnet';
  }

  /**
   * Execute direct ERC20 transfer on same chain
   */
  private async executeDirectDeposit(params: {
    amount: string;
    assetId: string;
    recipient: Hex;
    accountAddress: Hex;
    fromChainId: string;
  }): Promise<DepositResult> {
    try {
      // Parse token address from CAIP asset ID (eip155:1/erc20:0x123... -> 0x123...)
      const tokenAddress = params.assetId.split(':')[2];
      if (!tokenAddress) {
        return { success: false, error: 'Invalid asset ID format' };
      }

      // Generate ERC20 transfer data
      const transferData = generateTransferData('transfer', {
        toAddress: params.recipient,
        amount: params.amount,
      });

      // Prepare transaction
      const transaction: TransactionParams = {
        from: params.accountAddress,
        to: tokenAddress,
        value: '0x0',
        data: transferData,
      };

      // Submit via TransactionController using Engine.context
      const { TransactionController, NetworkController } = Engine.context;

      // Get current network client ID from state
      const selectedNetworkClientId = NetworkController.state.selectedNetworkClientId;

      const result = await TransactionController.addTransaction(transaction, {
        origin: 'PerpsController',
        networkClientId: selectedNetworkClientId,
      });

      return {
        success: true,
        txHash: await result.result, // TransactionController returns Promise<string>
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Direct deposit failed'
      };
    }
  }

  // Live data delegation (NO Redux) - delegates to active provider

  /**
   * Subscribe to live price updates
   */
  subscribeToPrices(params: SubscribePricesParams): () => void {
    const provider = this.getActiveProvider();
    return provider.subscribeToPrices(params);
  }

  /**
   * Subscribe to live position updates
   */
  subscribeToPositions(params: SubscribePositionsParams): () => void {
    const provider = this.getActiveProvider();
    return provider.subscribeToPositions(params);
  }

  /**
   * Subscribe to live order fill updates
   */
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    const provider = this.getActiveProvider();
    return provider.subscribeToOrderFills(params);
  }

  /**
   * Configure live data throttling
   */
  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    const provider = this.getActiveProvider();
    provider.setLiveDataConfig(config);
  }

  /**
   * Disconnect provider and cleanup subscriptions
   * Call this when navigating away from Perps screens to prevent battery drain
   */
  async disconnect(): Promise<void> {
    DevLogger.log('PerpsController: Disconnecting provider to cleanup subscriptions', {
      timestamp: new Date().toISOString()
    });

    const provider = this.getActiveProvider();
    await provider.disconnect();
  }
}
