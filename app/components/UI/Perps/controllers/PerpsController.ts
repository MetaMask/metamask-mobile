import type { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { TransactionParams } from '@metamask/transaction-controller';
import { parseCaipAssetId, type CaipChainId, type Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { generateTransferData } from '../../../../util/transactions';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  DepositParams,
  DepositResult,
  DepositStatus,
  DepositFlowType,
  DepositStepInfo,
  EditOrderParams,
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
import type { CandleData } from '../types';

/**
 * State shape for PerpsController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsControllerState = {
  // Active provider
  activeProvider: string;
  isTestnet: boolean; // Dev toggle for testnet
  connectionStatus: 'disconnected' | 'connecting' | 'connected';

  // Account data (persisted) - using HyperLiquid property names
  positions: Position[];
  accountState: AccountState | null;

  // Order management
  pendingOrders: OrderParams[];

  // Deposit flow state (for reactive UI)
  depositStatus: DepositStatus;
  depositFlowType: DepositFlowType | null;
  currentDepositTxHash: string | null;
  depositError: string | null;
  requiresModalDismissal: boolean;
  depositSteps: DepositStepInfo;

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
  // Deposit flow state defaults
  depositStatus: 'idle',
  depositFlowType: null,
  currentDepositTxHash: null,
  depositError: null,
  requiresModalDismissal: false,
  depositSteps: {
    totalSteps: 0,
    currentStep: 0,
    stepNames: [],
    stepTxHashes: [],
  },
  lastError: null,
  lastUpdateTimestamp: 0,
});

/**
 * State metadata for the PerpsController
 */
const metadata = {
  positions: { persist: true, anonymous: false },
  accountState: { persist: true, anonymous: false },
  isTestnet: { persist: true, anonymous: false },
  activeProvider: { persist: true, anonymous: false },
  connectionStatus: { persist: false, anonymous: false },
  pendingOrders: { persist: false, anonymous: false },
  // Deposit flow state - transient, no need to persist across app restarts
  depositStatus: { persist: false, anonymous: false },
  depositFlowType: { persist: false, anonymous: false },
  currentDepositTxHash: { persist: false, anonymous: false },
  depositError: { persist: false, anonymous: false },
  requiresModalDismissal: { persist: false, anonymous: false },
  depositSteps: { persist: false, anonymous: false },
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
export type PerpsControllerActions =
  | {
      type: 'PerpsController:getState';
      handler: () => PerpsControllerState;
    }
  | {
      type: 'PerpsController:placeOrder';
      handler: PerpsController['placeOrder'];
    }
  | {
      type: 'PerpsController:editOrder';
      handler: PerpsController['editOrder'];
    }
  | {
      type: 'PerpsController:cancelOrder';
      handler: PerpsController['cancelOrder'];
    }
  | {
      type: 'PerpsController:closePosition';
      handler: PerpsController['closePosition'];
    }
  | {
      type: 'PerpsController:deposit';
      handler: PerpsController['deposit'];
    }
  | {
      type: 'PerpsController:submitDirectDepositTransaction';
      handler: PerpsController['submitDirectDepositTransaction'];
    }
  | {
      type: 'PerpsController:withdraw';
      handler: PerpsController['withdraw'];
    }
  | {
      type: 'PerpsController:getPositions';
      handler: PerpsController['getPositions'];
    }
  | {
      type: 'PerpsController:getAccountState';
      handler: PerpsController['getAccountState'];
    }
  | {
      type: 'PerpsController:getMarkets';
      handler: PerpsController['getMarkets'];
    }
  | {
      type: 'PerpsController:toggleTestnet';
      handler: PerpsController['toggleTestnet'];
    }
  | {
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
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor({ messenger, state = {} }: PerpsControllerOptions) {
    super({
      name: 'PerpsController',
      metadata,
      messenger,
      state: { ...getDefaultPerpsControllerState(), ...state },
    });

    this.providers = new Map();
    this.initializeProviders().catch((error) => {
      DevLogger.log('PerpsController: Error initializing providers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Initialize the PerpsController providers
   * Must be called before using any other methods
   * Prevents double initialization with promise caching
   */
  async initializeProviders(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Actual initialization implementation
   */
  private async performInitialization(): Promise<void> {
    DevLogger.log('PerpsController: Initializing providers', {
      currentNetwork: this.state.isTestnet ? 'testnet' : 'mainnet',
      existingProviders: Array.from(this.providers.keys()),
      timestamp: new Date().toISOString(),
    });

    // Disconnect existing providers to close WebSocket connections
    const existingProviders = Array.from(this.providers.values());
    if (existingProviders.length > 0) {
      DevLogger.log('PerpsController: Disconnecting existing providers', {
        count: existingProviders.length,
        timestamp: new Date().toISOString(),
      });
      await Promise.all(
        existingProviders.map((provider) => provider.disconnect()),
      );
    }
    this.providers.clear();
    this.providers.set(
      'hyperliquid',
      new HyperLiquidProvider({ isTestnet: this.state.isTestnet }),
    );

    // Future providers can be added here with their own authentication patterns:
    // - Some might use API keys: new BinanceProvider({ apiKey, apiSecret })
    // - Some might use different wallet patterns: new GMXProvider({ signer })
    // - Some might not need auth at all: new DydxProvider()

    this.isInitialized = true;
    DevLogger.log('PerpsController: Providers initialized successfully', {
      providerCount: this.providers.size,
      activeProvider: this.state.activeProvider,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get the currently active provider - ensures initialization first
   */
  getActiveProvider(): IPerpsProvider {
    if (!this.isInitialized) {
      const error = 'PerpsController not initialized. Call initialize() first.';
      this.update((state) => {
        state.lastError = error;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(error);
    }

    const provider = this.providers.get(this.state.activeProvider);
    if (!provider) {
      const error = `Provider ${this.state.activeProvider} not found`;
      this.update((state) => {
        state.lastError = error;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(error);
    }

    return provider;
  }

  /**
   * Place a new order
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();

    // Optimistic update
    this.update((state) => {
      state.pendingOrders.push(params);
    });

    const result = await provider.placeOrder(params);

    // Update state only on success
    if (result.success) {
      this.update((state) => {
        state.pendingOrders = state.pendingOrders.filter((o) => o !== params);
        state.lastUpdateTimestamp = Date.now();
      });
    } else {
      // Remove from pending orders even on failure since the attempt is complete
      this.update((state) => {
        state.pendingOrders = state.pendingOrders.filter((o) => o !== params);
      });
    }

    return result;
  }

  /**
   * Edit an existing order
   */
  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const result = await provider.editOrder(params);

    if (result.success) {
      this.update((state) => {
        state.lastUpdateTimestamp = Date.now();
      });
    }

    return result;
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    const provider = this.getActiveProvider();
    const result = await provider.cancelOrder(params);

    if (result.success) {
      this.update((state) => {
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
      this.update((state) => {
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
  /**
   * Helper method to update deposit progress and state
   */
  private updateDepositProgress(
    status: DepositStatus,
    step: number,
    txHash?: string,
    error?: string,
  ): void {
    this.update((state) => {
      state.depositStatus = status;
      state.depositSteps.currentStep = step;

      if (txHash) {
        state.currentDepositTxHash = txHash;
        // Add to step transaction hashes
        if (!state.depositSteps.stepTxHashes) {
          state.depositSteps.stepTxHashes = [];
        }
        state.depositSteps.stepTxHashes[step - 1] = txHash;
      }

      if (error) {
        state.depositError = error;
      } else {
        state.depositError = null;
      }

      // Signal UI to dismiss modal when we start depositing (final step)
      if (status === 'depositing') {
        state.requiresModalDismissal = true;
      }
    });
  }

  /**
   * Analyze deposit route and determine flow type
   */
  private analyzeDepositRoute(params: DepositParams): {
    type: DepositFlowType;
    stepNames: string[];
    parsedAsset: ReturnType<typeof parseCaipAssetId>;
    assetChainId: CaipChainId;
    bridgeChainId: CaipChainId;
    bridgeContractAddress: Hex;
  } {
    // Extract chain ID from the asset ID using MetaMask CAIP utilities
    const parsedAsset = parseCaipAssetId(params.assetId);
    const assetChainId = parsedAsset.chainId;

    // Get the HyperLiquid bridge info (chain + contract address)
    const provider = this.getActiveProvider();
    const depositRoutes = provider.getDepositRoutes({
      assetId: params.assetId,
    });

    if (depositRoutes.length === 0) {
      throw new Error(
        `No deposit routes available for asset ${params.assetId}`,
      );
    }

    // Use the first route (HyperLiquid currently has only one route per asset)
    const route = depositRoutes[0];
    const { chainId: bridgeChainId, contractAddress: bridgeContractAddress } =
      route;

    if (!bridgeContractAddress) {
      throw new Error('Unable to get HyperLiquid bridge contract address');
    }

    // For now, we only support direct deposits (same chain, same token)
    // TODO: Implement swap, bridge, and swap+bridge flows
    if (assetChainId === bridgeChainId && parsedAsset.assetReference) {
      return {
        type: 'direct',
        stepNames: ['Depositing to HyperLiquid'],
        parsedAsset,
        assetChainId,
        bridgeChainId,
        bridgeContractAddress,
      };
    }

    // TODO: Add other flow types
    throw new Error('Only direct deposits are currently supported');
  }

  async deposit(params: DepositParams): Promise<DepositResult> {
    try {
      // Step 1: Reset state and validate parameters
      this.update((state) => {
        state.depositStatus = 'preparing';
        state.depositError = null;
        state.requiresModalDismissal = false;
        state.currentDepositTxHash = null;
      });

      // Validate required parameters
      if (!params.amount || params.amount === '0') {
        const error = 'Amount is required and must be greater than 0';
        this.updateDepositProgress('error', 0, undefined, error);
        return { success: false, error };
      }

      if (!params.assetId) {
        const error = 'AssetId is required for deposit validation';
        this.updateDepositProgress('error', 0, undefined, error);
        return { success: false, error };
      }

      // Get current account
      const { AccountsController } = Engine.context;
      const selectedAccount = AccountsController.getSelectedAccount();

      // Step 2: Analyze deposit route
      const route = this.analyzeDepositRoute(params);

      this.update((state) => {
        state.depositFlowType = route.type;
        state.depositSteps = {
          totalSteps: route.stepNames.length,
          currentStep: 0,
          stepNames: route.stepNames,
          stepTxHashes: [],
        };
      });

      DevLogger.log('PerpsController: Deposit route analysis', {
        assetId: params.assetId,
        assetChainId: route.assetChainId,
        bridgeChainId: route.bridgeChainId,
        amount: params.amount,
        userAddress: selectedAccount.address,
        bridgeContractAddress: route.bridgeContractAddress,
        flowType: route.type,
        stepNames: route.stepNames,
        isTestnet: this.state.isTestnet,
      });

      // Step 3: Check if asset is supported
      const provider = this.getActiveProvider();
      const supportedRoutes = provider.getDepositRoutes({
        assetId: params.assetId,
      });
      const isAssetSupported = supportedRoutes.some(
        (supportedRoute) =>
          supportedRoute.assetId.toLowerCase() === params.assetId.toLowerCase(),
      );

      if (!isAssetSupported) {
        const supportedAssets = supportedRoutes.map(
          (supportedRoute) => supportedRoute.assetId,
        );
        const error = `Asset ${
          params.assetId
        } not supported for deposits. Supported: ${supportedAssets.join(', ')}`;
        this.updateDepositProgress('error', 0, undefined, error);
        return { success: false, error };
      }

      // Step 4: Execute deposit based on flow type
      switch (route.type) {
        case 'direct':
          return this.executeDirectDepositFlow(
            params,
            route,
            selectedAccount.address as Hex,
          );

        case 'swap':
        case 'bridge':
        case 'swap_bridge': {
          const error = `${route.type} deposits will be implemented in future versions`;
          this.updateDepositProgress('error', 0, undefined, error);
          return { success: false, error };
        }

        default: {
          const unknownError = `Unknown deposit flow type: ${route.type}`;
          this.updateDepositProgress('error', 0, undefined, unknownError);
          return { success: false, error: unknownError };
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown deposit error';
      this.updateDepositProgress('error', 0, undefined, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute direct deposit flow (same chain, same token)
   */
  private async executeDirectDepositFlow(
    params: DepositParams,
    route: ReturnType<typeof this.analyzeDepositRoute>,
    accountAddress: Hex,
  ): Promise<DepositResult> {
    try {
      DevLogger.log('🎯 PerpsController: Starting direct deposit flow', {
        reason: 'Token is on same chain as HyperLiquid',
        assetChainId: route.assetChainId,
        bridgeChainId: route.bridgeChainId,
        bridgeContractAddress: route.bridgeContractAddress,
        userAddress: accountAddress,
        transferFlow: `User → USDC Transfer → Bridge(${route.bridgeContractAddress}) → HyperLiquid Account Credit`,
      });

      // Step 1: Prepare transaction
      this.updateDepositProgress('depositing', 1);

      const directDepositResult = await this.executeDirectDeposit({
        ...params,
        fromChainId: route.assetChainId,
        recipient: route.bridgeContractAddress,
        accountAddress,
        tokenAddress: route.parsedAsset.assetReference as Hex,
      });

      if (!directDepositResult.success) {
        this.updateDepositProgress(
          'error',
          1,
          undefined,
          directDepositResult.error,
        );
        return directDepositResult;
      }

      // Step 2: Submit transaction if modal dismissal is required
      if (directDepositResult.success) {
        DevLogger.log(
          'PerpsController: Direct deposit completed successfully',
          {
            txHash: directDepositResult.txHash,
          },
        );

        this.updateDepositProgress('success', 1, directDepositResult.txHash);
        return directDepositResult;
      }

      // For failed deposits
      this.updateDepositProgress(
        'error',
        1,
        undefined,
        directDepositResult.error,
      );
      return directDepositResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Direct deposit flow failed';
      this.updateDepositProgress('error', 1, undefined, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Withdraw funds from trading account
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    // TODO: not validated yet
    const provider = this.getActiveProvider();
    return provider.withdraw(params);
  }

  /**
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    try {
      const provider = this.getActiveProvider();
      const positions = await provider.getPositions(params);

      // Only update state if the provider call succeeded
      this.update((state) => {
        state.positions = positions;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });

      return positions;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get positions';

      // Update error state but don't modify positions (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get account state (balances, etc.)
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    try {
      const provider = this.getActiveProvider();
      const accountState = await provider.getAccountState(params);

      // Only update state if the provider call succeeded
      DevLogger.log(
        'PerpsController: Updating Redux store with accountState:',
        accountState,
      );
      this.update((state) => {
        state.accountState = accountState;
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });
      DevLogger.log('PerpsController: Redux store updated successfully');

      return accountState;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get account state';

      // Update error state but don't modify accountState (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get available markets with optional filtering
   */
  async getMarkets(params?: { symbols?: string[] }): Promise<MarketInfo[]> {
    try {
      const provider = this.getActiveProvider();
      const allMarkets = await provider.getMarkets();

      // Clear any previous errors on successful call
      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      // Filter by symbols if provided
      if (params?.symbols && params.symbols.length > 0) {
        return allMarkets.filter((market) =>
          params.symbols?.some(
            (symbol) => market.name.toLowerCase() === symbol.toLowerCase(),
          ),
        );
      }

      return allMarkets;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get markets';

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Fetch historical candle data
   */
  async fetchHistoricalCandles(
    coin: string,
    interval: string,
    limit: number = 100,
  ): Promise<CandleData | null> {
    try {
      const provider = this.getActiveProvider() as IPerpsProvider & {
        clientService?: {
          fetchHistoricalCandles: (
            coin: string,
            interval: string,
            limit: number,
          ) => Promise<CandleData | null>;
        };
      };

      // Check if provider has a client service with fetchHistoricalCandles
      if (provider.clientService?.fetchHistoricalCandles) {
        return await provider.clientService.fetchHistoricalCandles(
          coin,
          interval,
          limit,
        );
      }

      // Fallback: throw error if method not available
      throw new Error('Historical candles not supported by current provider');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical candles';

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get supported deposit routes - returns complete asset and routing information
   */
  getDepositRoutes(): AssetRoute[] {
    const provider = this.getActiveProvider();
    return provider.getDepositRoutes();
  }

  /**
   * Get supported withdrawal routes - returns complete asset and routing information
   */
  getWithdrawalRoutes(): AssetRoute[] {
    const provider = this.getActiveProvider();
    return provider.getWithdrawalRoutes();
  }

  /**
   * Toggle between testnet and mainnet
   */
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    try {
      const previousNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      this.update((state) => {
        state.isTestnet = !state.isTestnet;
        state.connectionStatus = 'disconnected';
      });

      const newNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

      DevLogger.log('PerpsController: Network toggle initiated', {
        from: previousNetwork,
        to: newNetwork,
        timestamp: new Date().toISOString(),
      });

      // Reset initialization state and reinitialize provider with new testnet setting
      this.isInitialized = false;
      this.initializationPromise = null;
      await this.initializeProviders();

      DevLogger.log('PerpsController: Network toggle completed', {
        newNetwork,
        isTestnet: this.state.isTestnet,
        timestamp: new Date().toISOString(),
      });

      return { success: true, isTestnet: this.state.isTestnet };
    } catch (error) {
      return {
        success: false,
        isTestnet: this.state.isTestnet,
        error: error instanceof Error ? error.message : 'Unknown error',
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
        error: `Provider ${providerId} not available`,
      };
    }

    this.update((state) => {
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
   * Returns transaction details for UI to handle confirmation flow
   */
  private async executeDirectDeposit(params: {
    amount: string;
    assetId: string;
    recipient: Hex;
    accountAddress: Hex;
    fromChainId: CaipChainId;
    tokenAddress: Hex;
  }): Promise<DepositResult> {
    try {
      DevLogger.log(
        '🚀 PerpsController: PREPARING DIRECT DEPOSIT TRANSACTION',
        {
          amount: params.amount,
          tokenAddress: params.tokenAddress,
          fromUser: params.accountAddress,
          toBridge: params.recipient,
          criticalFix:
            'Sending to HyperLiquid bridge contract (NOT user address)',
          transferSummary: `${params.accountAddress} → ${params.recipient} (${params.amount} USDC)`,
          modalFlow:
            'Will return transaction params for UI to handle modal dismissal + confirmation',
        },
      );

      // Use the already parsed token address from CAIP utilities
      const tokenAddress = params.tokenAddress;

      // Convert amount to token's smallest units (e.g., 6 USDC -> 6,000,000 units for 6 decimals)
      // Extract decimals from asset - for USDC it's 6 decimals
      const decimals = 6; // USDC has 6 decimals
      const amountInUnits = (
        parseFloat(params.amount) * Math.pow(10, decimals)
      ).toString();

      // Convert to hex for generateTransferData (it expects hex string)
      const amountInHex = `0x${parseInt(amountInUnits, 10).toString(16)}`;

      DevLogger.log('🔢 PerpsController: Amount conversion', {
        userInput: params.amount,
        decimals,
        amountInUnits,
        amountInHex,
        calculation: `${params.amount} * 10^${decimals} = ${amountInUnits} = ${amountInHex}`,
      });

      // Generate ERC20 transfer data
      // CRITICAL: params.recipient should be HyperLiquid bridge contract, NOT user address
      // This transfers USDC from user -> HyperLiquid bridge -> credits user's HL account
      const transferData = generateTransferData('transfer', {
        toAddress: params.recipient, // HyperLiquid bridge contract address
        amount: amountInHex, // Amount in token's smallest units as hex
      });

      // Prepare transaction parameters
      const transaction: TransactionParams = {
        from: params.accountAddress,
        to: tokenAddress,
        value: '0x0',
        data: transferData,
      };

      DevLogger.log(
        '✅ PerpsController: TRANSACTION PREPARED - READY FOR UI MODAL FLOW',
        {
          transaction,
          amount: params.amount,
          tokenAddress,
          bridgeContract: params.recipient,
          userAddress: params.accountAddress,
          flowSteps: [
            '1. UI dismisses deposit modal',
            '2. UI calls submitDirectDepositTransaction()',
            '3. TransactionController shows confirmation UI',
            '4. User confirms/rejects',
            '5. UI navigates to success/error screen',
          ],
        },
      );

      // TODO: ⚠️ Flagging: We'll need to keep an eye out for breaking changes regarding the global network selector (GNS) removal initiative. Assuming it's still happening, we won't be able to rely on a single user-selected "active" network and instead will need to rely on contextual data.
      // Submit the transaction directly via TransactionController
      const { NetworkController } = Engine.context;
      const selectedNetworkClientId =
        NetworkController.state.selectedNetworkClientId;

      DevLogger.log(
        '🎯 PerpsController: SUBMITTING DIRECT DEPOSIT TRANSACTION',
        {
          transaction,
          selectedNetworkClientId,
          timestamp: new Date().toISOString(),
        },
      );

      // Use lower-level transaction submission to bypass UI confirmation
      const result = await this.submitTransactionDirectly(
        transaction,
        selectedNetworkClientId,
      );
      const txHash = result.txHash;

      DevLogger.log(
        '✅ PerpsController: DIRECT DEPOSIT TRANSACTION SUBMITTED',
        {
          txHash,
          transaction,
          success: true,
        },
      );

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Direct deposit preparation failed',
      };
    }
  }

  /**
   * Submit the prepared transaction after modal dismissal
   * This method is called by the UI after dismissing the deposit modal
   */
  async submitDirectDepositTransaction(
    transaction: TransactionParams,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      DevLogger.log(
        '🎯 PerpsController: SUBMITTING DIRECT DEPOSIT TRANSACTION',
        {
          transaction,
          modalStatus: 'Should be dismissed by UI before this call',
          timestamp: new Date().toISOString(),
        },
      );

      // Submit via TransactionController using Engine.context
      const { NetworkController } = Engine.context;

      // Get current network client ID from state
      const selectedNetworkClientId =
        NetworkController.state.selectedNetworkClientId;

      // Use lower-level transaction submission to bypass UI confirmation
      const result = await this.submitTransactionDirectly(
        transaction,
        selectedNetworkClientId,
      );
      const txHash = result.txHash;

      DevLogger.log(
        '✅ PerpsController: DIRECT DEPOSIT TRANSACTION SUBMITTED',
        {
          txHash,
          transaction,
          success: true,
          nextSteps: 'HyperLiquid will detect deposit and credit user account',
        },
      );

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      DevLogger.log('❌ PerpsController: DIRECT DEPOSIT TRANSACTION FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transaction,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Direct deposit transaction failed',
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
   * Reset deposit state for a fresh deposit flow
   * Call this when starting a new deposit to clear previous state
   */
  resetDepositState(): void {
    DevLogger.log(
      'PerpsController: Resetting deposit state for new deposit flow',
    );
    this.update((state) => {
      state.depositStatus = 'idle';
      state.depositFlowType = null;
      state.depositSteps = {
        totalSteps: 0,
        currentStep: 0,
        stepNames: [],
        stepTxHashes: [],
      };
      state.depositError = null;
      state.currentDepositTxHash = null;
      state.requiresModalDismissal = false;
    });
  }

  /**
   * Disconnect provider and cleanup subscriptions
   * Call this when navigating away from Perps screens to prevent battery drain
   */
  async disconnect(): Promise<void> {
    DevLogger.log(
      'PerpsController: Disconnecting provider to cleanup subscriptions',
      {
        timestamp: new Date().toISOString(),
      },
    );

    const provider = this.getActiveProvider();
    await provider.disconnect();
  }

  /**
   * Submit transaction with proper gas estimation and nonce management
   */
  private async submitTransactionDirectly(
    transaction: TransactionParams,
    networkClientId: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const { TransactionController } = Engine.context;

      const result = await TransactionController.addTransaction(transaction, {
        origin: 'metamask',
        requireApproval: false,
        networkClientId,
      });

      const txHash = await result.result;

      return {
        success: true,
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Transaction submission failed',
      };
    }
  }
}
