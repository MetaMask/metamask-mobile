import type { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionParams,
} from '@metamask/transaction-controller';
import { parseCaipAssetId, type CaipChainId, type Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { generateTransferData } from '../../../../util/transactions';
import type { CandleData } from '../types';
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
  UpdatePositionTPSLParams,
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
  isTestnet: boolean; // Dev toggle for testnet
  connectionStatus: 'disconnected' | 'connecting' | 'connected';

  // Account data (persisted) - using HyperLiquid property names
  positions: Position[];
  accountState: AccountState | null;

  // Order management
  pendingOrders: OrderParams[];

  // Deposit flow state (for reactive UI)
  depositStatus: DepositStatus;
  currentDepositTxHash: string | null;
  depositError: string | null;
  activeDepositTransactions: Record<string, { amount: string; token: string }>; // Track active deposits by tx id

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
  currentDepositTxHash: null,
  depositError: null,
  activeDepositTransactions: {},
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
  currentDepositTxHash: { persist: false, anonymous: false },
  depositError: { persist: false, anonymous: false },
  activeDepositTransactions: { persist: false, anonymous: false },
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
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent;

/**
 * PerpsController messenger constraints
 */
export type PerpsControllerMessenger = RestrictedMessenger<
  'PerpsController',
  PerpsControllerActions,
  PerpsControllerEvents | AllowedEvents,
  AllowedActions,
  AllowedEvents['type']
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

    // Subscribe to TransactionController events for deposit tracking
    this.messagingSystem.subscribe(
      'TransactionController:transactionSubmitted',
      this.handleTransactionSubmitted.bind(this),
    );

    this.messagingSystem.subscribe(
      'TransactionController:transactionConfirmed',
      this.handleTransactionConfirmed.bind(this),
    );

    this.messagingSystem.subscribe(
      'TransactionController:transactionFailed',
      this.handleTransactionFailed.bind(this),
    );

    this.initializeProviders().catch((error) => {
      DevLogger.log('PerpsController: Error initializing providers', {
        error:
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknownError'),
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle transaction submitted event
   */
  private handleTransactionSubmitted(
    event: TransactionControllerTransactionSubmittedEvent['payload'][0],
  ): void {
    const txMeta = event.transactionMeta;
    // Check if this is a deposit transaction we're tracking
    const depositInfo = this.state.activeDepositTransactions[txMeta.id];
    if (depositInfo) {
      DevLogger.log('PerpsController: Deposit transaction submitted', {
        txId: txMeta.id,
        txHash: txMeta.hash,
        amount: depositInfo.amount,
        token: depositInfo.token,
      });

      this.update((state) => {
        state.depositStatus = 'depositing';
        state.currentDepositTxHash = txMeta.hash || null;
      });
    }
  }

  /**
   * Handle transaction confirmed event
   */
  private handleTransactionConfirmed(
    txMeta: TransactionControllerTransactionConfirmedEvent['payload'][0],
  ): void {
    // Check if this is a deposit transaction we're tracking
    const depositInfo = this.state.activeDepositTransactions[txMeta.id];
    if (depositInfo) {
      DevLogger.log('PerpsController: Deposit transaction confirmed', {
        txId: txMeta.id,
        txHash: txMeta.hash,
        amount: depositInfo.amount,
        token: depositInfo.token,
      });

      this.update((state) => {
        state.depositStatus = 'success';
        state.currentDepositTxHash = txMeta.hash || null;
        // Remove from active tracking
        delete state.activeDepositTransactions[txMeta.id];
      });
    }
  }

  /**
   * Handle transaction failed event
   */
  private handleTransactionFailed(
    event: TransactionControllerTransactionFailedEvent['payload'][0],
  ): void {
    const txMeta = event.transactionMeta;
    // Check if this is a deposit transaction we're tracking
    const depositInfo = this.state.activeDepositTransactions[txMeta.id];
    if (depositInfo) {
      DevLogger.log('PerpsController: Deposit transaction failed', {
        txId: txMeta.id,
        txHash: txMeta.hash,
        amount: depositInfo.amount,
        token: depositInfo.token,
        error: txMeta.error,
      });

      this.update((state) => {
        state.depositStatus = 'error';
        state.depositError = txMeta.error?.message || 'Transaction failed';
        state.currentDepositTxHash = txMeta.hash || null;
        // Remove from active tracking
        delete state.activeDepositTransactions[txMeta.id];
      });
    }
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
      const error = strings('perps.errors.clientNotInitialized');
      this.update((state) => {
        state.lastError = error;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(error);
    }

    const provider = this.providers.get(this.state.activeProvider);
    if (!provider) {
      const error = strings('perps.errors.providerNotAvailable', {
        providerId: this.state.activeProvider,
      });
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
   * Update TP/SL for an existing position
   */
  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    const provider = this.getActiveProvider();
    const result = await provider.updatePositionTPSL(params);

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
   * Deposit funds to trading account
   * Single flow that handles all deposit scenarios via TransactionController
   */
  async deposit(params: DepositParams): Promise<DepositResult> {
    try {
      // Reset state
      this.update((state) => {
        state.depositStatus = 'preparing';
        state.depositError = null;
        state.currentDepositTxHash = null;
      });

      // Get provider for validation
      const provider = this.getActiveProvider();

      // Validate deposit parameters
      const validation = provider.validateDeposit(params);
      if (!validation.isValid) {
        this.update((state) => {
          state.depositStatus = 'error';
          state.depositError = validation.error || null;
        });
        return { success: false, error: validation.error };
      }

      // Get current account
      const { AccountsController } = Engine.context;
      const selectedAccount = AccountsController.getSelectedAccount();
      const accountAddress = selectedAccount.address as Hex;

      // Parse asset ID to get chain and token address
      const parsedAsset = parseCaipAssetId(params.assetId);
      const assetChainId = parsedAsset.chainId;
      const tokenAddress = parsedAsset.assetReference as Hex;

      // Get deposit route (bridge contract address)
      const depositRoutes = provider.getDepositRoutes({
        assetId: params.assetId,
      });

      if (depositRoutes.length === 0) {
        const error = strings('perps.errors.tokenNotSupported', {
          token: params.assetId,
        });
        this.update((state) => {
          state.depositStatus = 'error';
          state.depositError = error;
        });
        return { success: false, error };
      }

      const route = depositRoutes[0];
      const bridgeContractAddress = route.contractAddress;

      if (!bridgeContractAddress) {
        const error = strings('perps.errors.bridgeContractNotFound');
        this.update((state) => {
          state.depositStatus = 'error';
          state.depositError = error;
        });
        return { success: false, error };
      }

      DevLogger.log('PerpsController: Preparing deposit', {
        assetId: params.assetId,
        amount: params.amount,
        tokenAddress,
        bridgeContract: bridgeContractAddress,
        userAddress: accountAddress,
      });

      // Execute the deposit transaction
      this.update((state) => {
        state.depositStatus = 'depositing';
      });

      const result = await this.executeDirectDeposit({
        amount: params.amount,
        assetId: params.assetId,
        recipient: bridgeContractAddress,
        accountAddress,
        fromChainId: assetChainId,
        tokenAddress,
      });

      if (result.success) {
        DevLogger.log('PerpsController: Deposit transaction submitted', {
          txHash: result.txHash,
        });
        // Transaction events will update the status
        return result;
      }

      this.update((state) => {
        state.depositStatus = 'error';
        state.depositError = result.error || null;
      });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown deposit error';
      this.update((state) => {
        state.depositStatus = 'error';
        state.depositError = errorMessage;
      });
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
        error instanceof Error
          ? error.message
          : strings('perps.errors.positionsFailed');

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
        error instanceof Error
          ? error.message
          : strings('perps.errors.accountStateFailed');

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
        error instanceof Error
          ? error.message
          : strings('perps.errors.marketsFailed');

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
   * Calculate liquidation price for a position
   * Uses provider-specific formulas based on protocol rules
   */
  async calculateLiquidationPrice(params: {
    entryPrice: number;
    leverage: number;
    direction: 'long' | 'short';
    positionSize?: number;
    marginType?: 'isolated' | 'cross';
    asset?: string;
  }): Promise<string> {
    const provider = this.getActiveProvider();
    return provider.calculateLiquidationPrice(params);
  }

  /**
   * Calculate maintenance margin for a specific asset
   * Returns a percentage (e.g., 0.0125 for 1.25%)
   */
  async calculateMaintenanceMargin(params: {
    asset: string;
    positionSize?: number;
  }): Promise<number> {
    const provider = this.getActiveProvider();
    return provider.calculateMaintenanceMargin(params);
  }

  /**
   * Get maximum leverage allowed for an asset
   */
  async getMaxLeverage(asset: string): Promise<number> {
    const provider = this.getActiveProvider();
    return provider.getMaxLeverage(asset);
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
        error:
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknownError'),
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
        params.amount,
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
        error:
          error instanceof Error
            ? error.message
            : strings('perps.errors.unknownError'),
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
      state.depositError = null;
      state.currentDepositTxHash = null;
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

    // Reset initialization state to ensure proper reconnection
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Submit transaction with proper gas estimation and nonce management
   */
  private async submitTransactionDirectly(
    transaction: TransactionParams,
    networkClientId: string,
    depositAmount?: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const { TransactionController } = Engine.context;

      const result = await TransactionController.addTransaction(transaction, {
        origin: 'metamask',
        requireApproval: false,
        networkClientId,
      });

      // Track this deposit transaction
      const txMeta = result.transactionMeta;
      if (txMeta && depositAmount) {
        this.update((state) => {
          state.activeDepositTransactions[txMeta.id] = {
            amount: depositAmount,
            token: 'USDC', // For now, we only support USDC
          };
        });
      }

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
