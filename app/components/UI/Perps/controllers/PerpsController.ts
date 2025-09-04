import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
import { successfulFetch, toHex } from '@metamask/controller-utils';
import type { NetworkControllerGetStateAction } from '@metamask/network-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionParams,
  TransactionType,
} from '@metamask/transaction-controller';
import { parseCaipAssetId, type Hex } from '@metamask/utils';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { generateTransferData } from '../../../../util/transactions';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import type { CandleData } from '../types';
import { CandlePeriod } from '../constants/chartConfig';
import { PerpsMeasurementName } from '../constants/performanceMetrics';
import { DATA_LAKE_API_CONFIG } from '../constants/perpsConfig';
import { HyperLiquidProvider } from './providers/HyperLiquidProvider';
import type {
  AccountState,
  AssetRoute,
  CancelOrderParams,
  CancelOrderResult,
  ClosePositionParams,
  EditOrderParams,
  FeeCalculationResult,
  Funding,
  GetAccountStateParams,
  GetFundingParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  IPerpsProvider,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsControllerConfig,
  Position,
  SubscribeAccountParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  SwitchProviderResult,
  ToggleTestnetResult,
  UpdatePositionTPSLParams,
  WithdrawParams,
  WithdrawResult,
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
} from './types';
import { getEnvironment } from './utils';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { RemoteFeatureFlagControllerStateChangeEvent } from '@metamask/remote-feature-flag-controller/dist/remote-feature-flag-controller.d.cts';

/**
 * Error codes for PerpsController
 * These codes are returned to the UI layer for translation
 */
export const PERPS_ERROR_CODES = {
  CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
  CLIENT_REINITIALIZING: 'CLIENT_REINITIALIZING',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  TOKEN_NOT_SUPPORTED: 'TOKEN_NOT_SUPPORTED',
  BRIDGE_CONTRACT_NOT_FOUND: 'BRIDGE_CONTRACT_NOT_FOUND',
  WITHDRAW_FAILED: 'WITHDRAW_FAILED',
  POSITIONS_FAILED: 'POSITIONS_FAILED',
  ACCOUNT_STATE_FAILED: 'ACCOUNT_STATE_FAILED',
  MARKETS_FAILED: 'MARKETS_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type PerpsErrorCode =
  (typeof PERPS_ERROR_CODES)[keyof typeof PERPS_ERROR_CODES];

const ON_RAMP_GEO_BLOCKING_URLS = {
  DEV: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
  PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
};

// Temporary to avoids estimation failures due to insufficient balance.
const DEPOSIT_GAS_LIMIT = toHex(100000);

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

  // Perps balances per provider for portfolio display
  perpsBalances: {
    [provider: string]: {
      totalValue: string; // Current total account value (cash + positions) in USD
      unrealizedPnl: string; // Current P&L from open positions in USD
      accountValue1dAgo: string; // Account value 24h ago for daily change calculation in USD
      lastUpdated: number; // Timestamp of last update
    };
  };

  // Order management
  pendingOrders: OrderParams[];

  // Simple deposit state (transient, for UI feedback)
  depositInProgress: boolean;
  lastDepositResult: {
    success: boolean;
    txHash?: string;
    error?: string;
  } | null;

  // Simple withdrawal state (transient, for UI feedback)
  withdrawInProgress: boolean;
  lastWithdrawResult: {
    success: boolean;
    txHash?: string;
    amount?: string;
    error?: string;
  } | null;

  // Eligibility (Geo-Blocking)
  isEligible: boolean;

  // Tutorial/First time user tracking (per network)
  isFirstTimeUser: {
    testnet: boolean;
    mainnet: boolean;
  };

  // Notification tracking
  hasPlacedFirstOrder: {
    testnet: boolean;
    mainnet: boolean;
  };

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
  perpsBalances: {},
  pendingOrders: [],
  depositInProgress: false,
  lastDepositResult: null,
  withdrawInProgress: false,
  lastWithdrawResult: null,
  lastError: null,
  lastUpdateTimestamp: 0,
  isEligible: false,
  isFirstTimeUser: {
    testnet: true,
    mainnet: true,
  },
  hasPlacedFirstOrder: {
    testnet: false,
    mainnet: false,
  },
});

/**
 * State metadata for the PerpsController
 */
const metadata = {
  positions: { persist: true, anonymous: false },
  accountState: { persist: true, anonymous: false },
  perpsBalances: { persist: true, anonymous: false },
  isTestnet: { persist: true, anonymous: false },
  activeProvider: { persist: true, anonymous: false },
  connectionStatus: { persist: false, anonymous: false },
  pendingOrders: { persist: false, anonymous: false },
  depositInProgress: { persist: false, anonymous: false },
  lastDepositResult: { persist: false, anonymous: false },
  withdrawInProgress: { persist: false, anonymous: false },
  lastWithdrawResult: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  isEligible: { persist: false, anonymous: false },
  isFirstTimeUser: { persist: true, anonymous: false },
  hasPlacedFirstOrder: { persist: true, anonymous: false },
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
      type: 'PerpsController:withdraw';
      handler: PerpsController['withdraw'];
    }
  | {
      type: 'PerpsController:getPositions';
      handler: PerpsController['getPositions'];
    }
  | {
      type: 'PerpsController:getOrderFills';
      handler: PerpsController['getOrderFills'];
    }
  | {
      type: 'PerpsController:getOrders';
      handler: PerpsController['getOrders'];
    }
  | {
      type: 'PerpsController:getOpenOrders';
      handler: PerpsController['getOpenOrders'];
    }
  | {
      type: 'PerpsController:getFunding';
      handler: PerpsController['getFunding'];
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
      type: 'PerpsController:refreshEligibility';
      handler: PerpsController['refreshEligibility'];
    }
  | {
      type: 'PerpsController:toggleTestnet';
      handler: PerpsController['toggleTestnet'];
    }
  | {
      type: 'PerpsController:disconnect';
      handler: PerpsController['disconnect'];
    }
  | {
      type: 'PerpsController:calculateFees';
      handler: PerpsController['calculateFees'];
    }
  | {
      type: 'PerpsController:markTutorialCompleted';
      handler: PerpsController['markTutorialCompleted'];
    }
  | {
      type: 'PerpsController:markFirstOrderCompleted';
      handler: PerpsController['markFirstOrderCompleted'];
    }
  | {
      type: 'PerpsController:getHistoricalPortfolio';
      handler: PerpsController['getHistoricalPortfolio'];
    }
  | {
      type: 'PerpsController:resetFirstTimeUserState';
      handler: PerpsController['resetFirstTimeUserState'];
    };

/**
 * External actions the PerpsController can call
 */
export type AllowedActions =
  | NetworkControllerGetStateAction
  | AuthenticationController.AuthenticationControllerGetBearerToken;

/**
 * External events the PerpsController can subscribe to
 */
export type AllowedEvents =
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent
  | RemoteFeatureFlagControllerStateChangeEvent;

/**
 * PerpsController messenger constraints
 */
export type PerpsControllerMessenger = RestrictedMessenger<
  'PerpsController',
  PerpsControllerActions | AllowedActions,
  PerpsControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

/**
 * PerpsController options
 */
export interface PerpsControllerOptions {
  messenger: PerpsControllerMessenger;
  state?: Partial<PerpsControllerState>;
  clientConfig?: PerpsControllerConfig;
}

interface BlockedRegionList {
  list: string[];
  source: 'remote' | 'fallback';
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
  private isReinitializing = false;

  // Geo-location cache
  private geoLocationCache: { location: string; timestamp: number } | null =
    null;
  private geoLocationFetchPromise: Promise<string> | null = null;
  private readonly GEO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private blockedRegionList: BlockedRegionList = {
    list: [],
    source: 'fallback',
  };

  constructor({
    messenger,
    state = {},
    clientConfig = { fallbackBlockedRegions: [] },
  }: PerpsControllerOptions) {
    super({
      name: 'PerpsController',
      metadata,
      messenger,
      state: { ...getDefaultPerpsControllerState(), ...state },
    });

    // Immediately set the fallback region list since RemoteFeatureFlagController is empty by default and takes a moment to populate.
    this.setBlockedRegionList(
      clientConfig.fallbackBlockedRegions ?? [],
      'fallback',
    );

    // RemoteFeatureFlagController state is empty by default so we must wait for it to be populated.
    this.messagingSystem.subscribe(
      'RemoteFeatureFlagController:stateChange',
      this.refreshEligibilityOnFeatureFlagChange.bind(this),
    );

    this.providers = new Map();

    this.initializeProviders().catch((error) => {
      DevLogger.log('PerpsController: Error initializing providers', {
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setBlockedRegionList(list: string[], source: 'remote' | 'fallback') {
    // Never downgrade from remote to fallback
    if (source === 'fallback' && this.blockedRegionList.source === 'remote')
      return;

    if (Array.isArray(list)) {
      this.blockedRegionList = {
        list,
        source,
      };
    }

    this.refreshEligibility();
  }

  /**
   * Respond to RemoteFeatureFlagController state changes
   * Refreshes user eligibility based on geo-blocked regions defined in remote feature flag.
   * Uses fallback configuration when remote feature flag is undefined.
   * Note: Initial eligibility is set in the constructor if fallback regions are provided.
   */
  private refreshEligibilityOnFeatureFlagChange(
    remoteFeatureFlagControllerState: RemoteFeatureFlagControllerState,
  ): void {
    const perpsGeoBlockedRegionsFeatureFlag =
      remoteFeatureFlagControllerState.remoteFeatureFlags
        ?.perpsPerpTradingGeoBlockedCountries;

    const remoteBlockedRegions = (
      perpsGeoBlockedRegionsFeatureFlag as { blockedRegions?: string[] }
    )?.blockedRegions;

    if (Array.isArray(remoteBlockedRegions)) {
      this.setBlockedRegionList(remoteBlockedRegions, 'remote');
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
   * Get the currently active provider
   * @returns The active provider
   * @throws Error if provider is not initialized or reinitializing
   */
  getActiveProvider(): IPerpsProvider {
    // Check if we're in the middle of reinitializing
    if (this.isReinitializing) {
      this.update((state) => {
        state.lastError = PERPS_ERROR_CODES.CLIENT_REINITIALIZING;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(PERPS_ERROR_CODES.CLIENT_REINITIALIZING);
    }

    // Check if not initialized
    if (!this.isInitialized) {
      this.update((state) => {
        state.lastError = PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
    }

    const provider = this.providers.get(this.state.activeProvider);
    if (!provider) {
      this.update((state) => {
        state.lastError = PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE;
        state.lastUpdateTimestamp = Date.now();
      });
      throw new Error(PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    return provider;
  }

  /**
   * Place a new order
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    // Start trace for the entire operation
    trace({
      name: TraceName.PerpsOrderExecution,
      op: TraceOperation.PerpsOrderSubmission,
      tags: {
        provider: this.state.activeProvider,
        orderType: params.orderType,
        market: params.coin,
        leverage: params.leverage || 1,
        isTestnet: this.state.isTestnet,
      },
      data: {
        isBuy: params.isBuy,
        orderPrice: params.price || '',
      },
    });

    try {
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

        // Report to data lake (fire-and-forget with retry)
        this.reportOrderToDataLake({
          action: 'open',
          coin: params.coin,
          sl_price: params.stopLossPrice
            ? parseFloat(params.stopLossPrice)
            : undefined,
          tp_price: params.takeProfitPrice
            ? parseFloat(params.takeProfitPrice)
            : undefined,
        });

        // End trace with success data
        endTrace({
          name: TraceName.PerpsOrderExecution,
          data: {
            success: true,
            orderId: result.orderId || '',
          },
        });
      } else {
        // Remove from pending orders even on failure since the attempt is complete
        this.update((state) => {
          state.pendingOrders = state.pendingOrders.filter((o) => o !== params);
        });

        // End trace with error data
        endTrace({
          name: TraceName.PerpsOrderExecution,
          data: {
            success: false,
            error: result.error || 'Unknown error',
          },
        });
      }

      return result;
    } catch (error) {
      // End trace with error data
      endTrace({
        name: TraceName.PerpsOrderExecution,
        data: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
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
    trace({
      name: TraceName.PerpsClosePosition,
      op: TraceOperation.PerpsPositionManagement,
      tags: {
        provider: this.state.activeProvider,
        coin: params.coin,
        closeSize: params.size || 'full',
        isTestnet: this.state.isTestnet,
      },
    });

    try {
      const provider = this.getActiveProvider();
      const result = await provider.closePosition(params);

      if (result.success) {
        this.update((state) => {
          state.lastUpdateTimestamp = Date.now();
        });

        // Report to data lake (fire-and-forget with retry)
        this.reportOrderToDataLake({ action: 'close', coin: params.coin });

        endTrace({
          name: TraceName.PerpsClosePosition,
          data: {
            success: true,
            filledSize: result.filledSize || '',
          },
        });
      } else {
        endTrace({
          name: TraceName.PerpsClosePosition,
          data: {
            success: false,
            error: result.error || 'Unknown error',
          },
        });
      }

      return result;
    } catch (error) {
      endTrace({
        name: TraceName.PerpsClosePosition,
        data: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
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
   * Simplified deposit method that prepares transaction for confirmation screen
   * No complex state tracking - just sets a loading flag
   */
  async depositWithConfirmation() {
    const { AccountTreeController, NetworkController, TransactionController } =
      Engine.context;

    try {
      // Clear any stale results when starting a new deposit flow
      // Don't set depositInProgress yet - wait until user confirms
      this.update((state) => {
        state.lastDepositResult = null;
      });

      const provider = this.getActiveProvider();
      const depositRoutes = provider.getDepositRoutes({ isTestnet: false });
      const route = depositRoutes[0];
      const bridgeContractAddress = route.contractAddress;

      const transferData = generateTransferData('transfer', {
        toAddress: bridgeContractAddress,
        amount: '0x0',
      });

      const accounts =
        AccountTreeController.getAccountsFromSelectedAccountGroup();
      const evmAccount = accounts.find((account) =>
        account.type.startsWith('eip155:'),
      );
      if (!evmAccount) {
        throw new Error(
          'No EVM-compatible account found in selected account group',
        );
      }
      const accountAddress = evmAccount.address as Hex;

      const parsedAsset = parseCaipAssetId(route.assetId);
      const assetChainId = toHex(parsedAsset.chainId.split(':')[1]);
      const tokenAddress = parsedAsset.assetReference as Hex;

      const transaction: TransactionParams = {
        from: accountAddress,
        to: tokenAddress,
        value: '0x0',
        data: transferData,
        gas: DEPOSIT_GAS_LIMIT,
      };

      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(assetChainId);

      // addTransaction shows the confirmation screen and returns a promise
      // The promise will resolve when transaction completes or reject if cancelled/failed
      const { result } = await TransactionController.addTransaction(
        transaction,
        {
          networkClientId,
          origin: 'metamask',
          type: TransactionType.perpsDeposit,
        },
      );

      // At this point, the confirmation modal is shown to the user
      // The result promise will resolve/reject based on user action and transaction outcome

      // Track the transaction lifecycle
      // The result promise will resolve/reject based on user action and transaction outcome
      // Note: We intentionally don't set depositInProgress immediately to avoid
      // showing toasts before the user confirms the transaction

      // TODO: @abretonc7s Find a better way to trigger our custom toast notification then having to toggle the state
      // How to replace the system notifications?
      result
        .then((actualTxHash) => {
          // Transaction was successfully completed
          // Set depositInProgress to true temporarily to show success
          this.update((state) => {
            state.depositInProgress = true;
            state.lastDepositResult = {
              success: true,
              txHash: actualTxHash,
            };
          });

          // Clear depositInProgress after a short delay
          setTimeout(() => {
            this.update((state) => {
              state.depositInProgress = false;
            });
          }, 100);
        })
        .catch((error) => {
          // Check if user denied/cancelled the transaction
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const userCancelled =
            errorMessage.includes('User denied') ||
            errorMessage.includes('User rejected') ||
            errorMessage.includes('User cancelled') ||
            errorMessage.includes('User canceled');

          if (userCancelled) {
            // User cancelled - clear any state, no toast
            this.update((state) => {
              state.depositInProgress = false;
              // Don't set lastDepositResult - no toast needed
            });
          } else {
            // Transaction failed after confirmation - show error toast
            this.update((state) => {
              state.depositInProgress = false;
              state.lastDepositResult = {
                success: false,
                error: errorMessage,
              };
            });
          }
        });

      return {
        result,
      };
    } catch (error) {
      // Check if user denied/cancelled the transaction
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const userCancelled =
        errorMessage.includes('User denied') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('User canceled');

      if (!userCancelled) {
        // Only track actual errors, not user cancellations
        this.update((state) => {
          state.lastDepositResult = {
            success: false,
            error: errorMessage,
          };
        });
      }
      throw error;
    }
  }

  /**
   * Clear the last deposit result after it has been shown to the user
   */
  clearDepositResult(): void {
    this.update((state) => {
      state.lastDepositResult = null;
    });
  }

  clearWithdrawResult(): void {
    this.update((state) => {
      state.lastWithdrawResult = null;
    });
  }

  /**
   * Withdraw funds from trading account
   *
   * The withdrawal process varies by provider and may involve:
   * - Direct on-chain transfers
   * - Bridge operations
   * - Multi-step validation processes
   *
   * Check the specific provider documentation for detailed withdrawal flows.
   *
   * @param params Withdrawal parameters
   * @returns WithdrawResult with withdrawal ID and tracking info
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    trace({
      name: TraceName.PerpsWithdraw,
      op: TraceOperation.PerpsOperation,
      tags: {
        assetId: params.assetId || '',
        provider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
      },
    });

    try {
      DevLogger.log('🚀 PerpsController: STARTING WITHDRAWAL', {
        params,
        timestamp: new Date().toISOString(),
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination,
        activeProvider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
      });

      // Set withdrawal in progress
      this.update((state) => {
        state.withdrawInProgress = true;
      });

      // Get provider (all validation is handled at the provider level)
      const provider = this.getActiveProvider();
      DevLogger.log('📡 PerpsController: DELEGATING TO PROVIDER', {
        provider: this.state.activeProvider,
        providerReady: !!provider,
      });

      // Execute withdrawal through provider
      const result = await provider.withdraw(params);

      DevLogger.log('📊 PerpsController: WITHDRAWAL RESULT', {
        success: result.success,
        error: result.error,
        txHash: result.txHash,
        timestamp: new Date().toISOString(),
      });

      // Update state based on result
      if (result.success) {
        this.update((state) => {
          state.lastError = null;
          state.lastUpdateTimestamp = Date.now();
          state.withdrawInProgress = false;
          state.lastWithdrawResult = {
            success: true,
            txHash: result.txHash,
            amount: params.amount,
          };
        });

        DevLogger.log('✅ PerpsController: WITHDRAWAL SUCCESSFUL', {
          txHash: result.txHash,
          amount: params.amount,
          assetId: params.assetId,
          withdrawalId: result.withdrawalId,
        });

        // Note: The withdrawal result will be cleared by usePerpsWithdrawStatus hook
        // after showing the appropriate toast messages

        // Trigger account state refresh after withdrawal
        this.getAccountState().catch((error) => {
          DevLogger.log(
            '⚠️ PerpsController: Failed to refresh after withdrawal',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          );
        });

        endTrace({
          name: TraceName.PerpsWithdraw,
          data: {
            success: true,
            txHash: result.txHash || '',
            withdrawalId: result.withdrawalId || '',
          },
        });

        return result;
      }

      this.update((state) => {
        state.lastError = result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawInProgress = false;
        state.lastWithdrawResult = {
          success: false,
          error: result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED,
        };
      });

      DevLogger.log('❌ PerpsController: WITHDRAWAL FAILED', {
        error: result.error,
        params,
      });

      endTrace({
        name: TraceName.PerpsWithdraw,
        data: {
          success: false,
          error: result.error || 'Unknown error',
        },
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.WITHDRAW_FAILED;

      DevLogger.log('💥 PerpsController: WITHDRAWAL EXCEPTION', {
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        params,
        timestamp: new Date().toISOString(),
      });

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
        state.withdrawInProgress = false;
        state.lastWithdrawResult = {
          success: false,
          error: errorMessage,
        };
      });

      endTrace({
        name: TraceName.PerpsWithdraw,
        data: {
          success: false,
          error: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get current positions
   */
  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    trace({
      name: TraceName.PerpsAccountStateUpdate,
      op: TraceOperation.PerpsOperation,
      tags: {
        provider: this.state.activeProvider,
        operation: 'getPositions',
        isTestnet: this.state.isTestnet,
      },
    });

    try {
      const provider = this.getActiveProvider();
      const positions = await provider.getPositions(params);

      // Only update state if the provider call succeeded
      this.update((state) => {
        state.positions = positions;
        // Update perps balances if we have account state
        if (state.accountState) {
          const providerKey = this.state.activeProvider;
          // Preserve existing historical data if available
          const existingBalance = state.perpsBalances[providerKey];
          state.perpsBalances[providerKey] = {
            totalValue: state.accountState.totalValue || '0',
            unrealizedPnl: state.accountState.unrealizedPnl || '0',
            accountValue1dAgo:
              existingBalance?.accountValue1dAgo ||
              state.accountState.totalValue ||
              '0',
            lastUpdated: Date.now(),
          };
        }
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });

      endTrace({
        name: TraceName.PerpsAccountStateUpdate,
        data: {
          success: true,
          positionsCount: positions.length,
        },
      });

      return positions;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.POSITIONS_FAILED;

      // Update error state but don't modify positions (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      endTrace({
        name: TraceName.PerpsAccountStateUpdate,
        data: {
          success: false,
          error: errorMessage,
        },
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get historical user fills (trade executions)
   */
  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    const provider = this.getActiveProvider();
    return provider.getOrderFills(params);
  }

  /**
   * Get historical user orders (order lifecycle)
   */
  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    const provider = this.getActiveProvider();
    return provider.getOrders(params);
  }

  /**
   * Get currently open orders (real-time status)
   */
  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    const provider = this.getActiveProvider();
    return provider.getOpenOrders(params);
  }

  /**
   * Get historical user funding history (funding payments)
   */
  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    const provider = this.getActiveProvider();
    return provider.getFunding(params);
  }

  /**
   * Get account state (balances, etc.)
   */
  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    trace({
      name: TraceName.PerpsAccountStateUpdate,
      op: TraceOperation.PerpsOperation,
      tags: {
        provider: this.state.activeProvider,
        operation: 'getAccountState',
        isTestnet: this.state.isTestnet,
      },
    });

    try {
      const provider = this.getActiveProvider();

      // Get both current account state and historical portfolio data
      const [accountState, historicalPortfolio] = await Promise.all([
        provider.getAccountState(params),
        provider.getHistoricalPortfolio(params).catch((error) => {
          DevLogger.log(
            'Failed to get historical portfolio, continuing without it:',
            error,
          );
          return;
        }),
      ]);

      // fallback to the current account total value if possible
      const historicalPortfolioToUse: HistoricalPortfolioResult =
        historicalPortfolio ?? {
          accountValue1dAgo: accountState.totalValue || '0',
          timestamp: 0,
        };

      // Only update state if the provider call succeeded
      DevLogger.log(
        'PerpsController: Updating Redux store with accountState and historical data:',
        { accountState, historicalPortfolio: historicalPortfolioToUse },
      );

      this.update((state) => {
        state.accountState = accountState;
        // Update perps balances for the active provider
        const providerKey = this.state.activeProvider;
        state.perpsBalances[providerKey] = {
          totalValue: accountState.totalValue || '0',
          unrealizedPnl: accountState.unrealizedPnl || '0',
          accountValue1dAgo: historicalPortfolioToUse.accountValue1dAgo || '0',
          lastUpdated: Date.now(),
        };
        state.lastUpdateTimestamp = Date.now();
        state.lastError = null; // Clear any previous errors
      });
      DevLogger.log('PerpsController: Redux store updated successfully');

      endTrace({
        name: TraceName.PerpsAccountStateUpdate,
        data: {
          success: true,
          hasBalance: parseFloat(accountState.totalBalance) > 0,
          hasHistoricalData:
            parseFloat(historicalPortfolioToUse?.accountValue1dAgo || '0') > 0,
        },
      });

      return accountState;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.ACCOUNT_STATE_FAILED;

      // Update error state but don't modify accountState (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      endTrace({
        name: TraceName.PerpsAccountStateUpdate,
        data: {
          success: false,
          error: errorMessage,
        },
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  /**
   * Get historical portfolio data for percentage calculations
   */
  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    try {
      const provider = this.getActiveProvider();
      const result = await provider.getHistoricalPortfolio(params);

      // Return the result without storing it in state
      // Historical data can be fetched when needed

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to get historical portfolio';

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
   * Get available markets with optional filtering
   */
  async getMarkets(params?: { symbols?: string[] }): Promise<MarketInfo[]> {
    trace({
      name: TraceName.PerpsMarketDataUpdate,
      op: TraceOperation.PerpsMarketData,
      tags: {
        provider: this.state.activeProvider,
        operation: 'getMarkets',
        isTestnet: this.state.isTestnet,
        symbolsRequested: params?.symbols?.length || 0,
      },
    });

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
        const filtered = allMarkets.filter((market) =>
          params.symbols?.some(
            (symbol) => market.name.toLowerCase() === symbol.toLowerCase(),
          ),
        );

        endTrace({
          name: TraceName.PerpsMarketDataUpdate,
          data: {
            success: true,
            marketsCount: filtered.length,
            totalMarkets: allMarkets.length,
          },
        });

        return filtered;
      }

      endTrace({
        name: TraceName.PerpsMarketDataUpdate,
        data: {
          success: true,
          marketsCount: allMarkets.length,
          totalMarkets: allMarkets.length,
        },
      });

      return allMarkets;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.MARKETS_FAILED;

      // Update error state
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      endTrace({
        name: TraceName.PerpsMarketDataUpdate,
        data: {
          success: false,
          error: errorMessage,
        },
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
    interval: CandlePeriod,
    limit: number = 100,
  ): Promise<CandleData> {
    try {
      const provider = this.getActiveProvider() as IPerpsProvider & {
        clientService?: {
          fetchHistoricalCandles: (
            coin: string,
            interval: CandlePeriod,
            limit: number,
          ) => Promise<CandleData>;
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
  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const provider = this.getActiveProvider();
    return provider.calculateLiquidationPrice(params);
  }

  /**
   * Calculate maintenance margin for a specific asset
   * Returns a percentage (e.g., 0.0125 for 1.25%)
   */
  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
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
   * Validate order parameters according to protocol-specific rules
   */
  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return provider.validateOrder(params);
  }

  /**
   * Validate close position parameters according to protocol-specific rules
   */
  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return provider.validateClosePosition(params);
  }

  /**
   * Validate withdrawal parameters according to protocol-specific rules
   */
  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.getActiveProvider();
    return provider.validateWithdrawal(params);
  }

  /**
   * Get supported withdrawal routes - returns complete asset and routing information
   */
  getWithdrawalRoutes(): AssetRoute[] {
    try {
      const provider = this.getActiveProvider();
      return provider.getWithdrawalRoutes();
    } catch (error) {
      DevLogger.log('PerpsController: Error getting withdrawal routes', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      // Return empty array if provider is not available
      return [];
    }
  }

  /**
   * Toggle between testnet and mainnet
   */
  async toggleTestnet(): Promise<ToggleTestnetResult> {
    // Prevent concurrent reinitializations
    if (this.isReinitializing) {
      DevLogger.log(
        'PerpsController: Already reinitializing, skipping toggle',
        {
          timestamp: new Date().toISOString(),
        },
      );
      return {
        success: false,
        isTestnet: this.state.isTestnet,
        error: PERPS_ERROR_CODES.CLIENT_REINITIALIZING,
      };
    }

    this.isReinitializing = true;

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
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    } finally {
      this.isReinitializing = false;
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

  // Live data delegation (NO Redux) - delegates to active provider

  /**
   * Subscribe to live price updates
   */
  subscribeToPrices(params: SubscribePricesParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToPrices(params);
    } catch (error) {
      DevLogger.log('PerpsController: Error subscribing to prices', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live position updates
   */
  subscribeToPositions(params: SubscribePositionsParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToPositions(params);
    } catch (error) {
      DevLogger.log('PerpsController: Error subscribing to positions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live order fill updates
   */
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToOrderFills(params);
    } catch (error) {
      DevLogger.log('PerpsController: Error subscribing to order fills', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live order updates
   */
  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToOrders(params);
    } catch (error) {
      DevLogger.log('PerpsController: Error subscribing to orders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Subscribe to live account updates
   */
  subscribeToAccount(params: SubscribeAccountParams): () => void {
    try {
      const provider = this.getActiveProvider();
      return provider.subscribeToAccount(params);
    } catch (error) {
      DevLogger.log('PerpsController: Error subscribing to account', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      // Return a no-op unsubscribe function
      return () => {
        // No-op: Provider not initialized
      };
    }
  }

  /**
   * Update perps balances for the current provider
   * Called when account state changes
   */
  updatePerpsBalances(
    accountState: AccountState,
    accountValue1dAgo?: string,
  ): void {
    const providerKey = this.state.activeProvider;
    this.update((state) => {
      // Preserve existing historical data if not provided
      const existingBalance = state.perpsBalances[providerKey];
      state.perpsBalances[providerKey] = {
        totalValue: accountState.totalValue || '0',
        unrealizedPnl: accountState.unrealizedPnl || '0',
        accountValue1dAgo:
          accountValue1dAgo ||
          existingBalance?.accountValue1dAgo ||
          accountState.totalValue ||
          '0',
        lastUpdated: Date.now(),
      };
    });
  }

  /**
   * Configure live data throttling
   */
  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    try {
      const provider = this.getActiveProvider();
      provider.setLiveDataConfig(config);
    } catch (error) {
      DevLogger.log('PerpsController: Error setting live data config', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate trading fees for the active provider
   * Each provider implements its own fee structure
   */
  async calculateFees(params: {
    orderType: 'market' | 'limit';
    isMaker?: boolean;
    amount?: string;
  }): Promise<FeeCalculationResult> {
    const provider = this.getActiveProvider();
    return provider.calculateFees(params);
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

    // Only disconnect the provider if we're initialized
    if (this.isInitialized && !this.isReinitializing) {
      try {
        const provider = this.getActiveProvider();
        await provider.disconnect();
      } catch (error) {
        DevLogger.log(
          'PerpsController: Error getting provider during disconnect',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        );
      }
    }

    // Reset initialization state to ensure proper reconnection
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Reconnect with new account/network context
   * Called when user switches accounts or networks
   */
  async reconnectWithNewContext(): Promise<void> {
    // Prevent concurrent reinitializations
    if (this.isReinitializing) {
      DevLogger.log('PerpsController: Already reinitializing, waiting...', {
        timestamp: new Date().toISOString(),
      });
      // Wait for the current reinitialization to complete
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }

    this.isReinitializing = true;

    try {
      DevLogger.log('PerpsController: Reconnecting with new account/network', {
        timestamp: new Date().toISOString(),
      });

      // Clear Redux state immediately to reset UI
      this.update((state) => {
        state.positions = [];
        state.accountState = null;
        state.pendingOrders = [];
        state.lastError = null;
      });

      // Clear state and force reinitialization
      // initializeProviders() will handle disconnection if needed
      this.isInitialized = false;
      this.initializationPromise = null;

      // Reinitialize with new context
      await this.initializeProviders();
    } finally {
      this.isReinitializing = false;
    }
  }

  /**
   * Eligibility (Geo-Blocking)
   */

  /**
   * Fetch geo location
   *
   * Returned in Country or Country-Region format
   * Example: FR, DE, US-MI, CA-ON
   */
  async #fetchGeoLocation(): Promise<string> {
    // Check cache first
    if (this.geoLocationCache) {
      const cacheAge = Date.now() - this.geoLocationCache.timestamp;
      if (cacheAge < this.GEO_CACHE_TTL_MS) {
        DevLogger.log('PerpsController: Using cached geo location', {
          location: this.geoLocationCache.location,
          cacheAge: `${(cacheAge / 1000).toFixed(1)}s`,
        });
        return this.geoLocationCache.location;
      }
    }

    // If already fetching, return the existing promise
    if (this.geoLocationFetchPromise) {
      DevLogger.log(
        'PerpsController: Geo location fetch already in progress, waiting...',
      );
      return this.geoLocationFetchPromise;
    }

    // Start new fetch
    this.geoLocationFetchPromise = this.#performGeoLocationFetch();

    try {
      const location = await this.geoLocationFetchPromise;
      return location;
    } finally {
      // Clear the promise after completion (success or failure)
      this.geoLocationFetchPromise = null;
    }
  }

  /**
   * Perform the actual geo location fetch
   * Separated to allow proper promise management
   */
  async #performGeoLocationFetch(): Promise<string> {
    let location = 'UNKNOWN';

    try {
      const environment = getEnvironment();

      DevLogger.log('PerpsController: Fetching geo location from API', {
        environment,
      });

      const response = await successfulFetch(
        ON_RAMP_GEO_BLOCKING_URLS[environment],
      );

      const textResult = await response?.text();
      location = textResult || 'UNKNOWN';

      // Cache the successful result
      this.geoLocationCache = {
        location,
        timestamp: Date.now(),
      };

      DevLogger.log('PerpsController: Geo location fetched successfully', {
        location,
      });

      return location;
    } catch (e) {
      DevLogger.log('PerpsController: Failed to fetch geo location', {
        error: e,
      });
      // Don't cache failures
      return location;
    }
  }

  /**
   * Refresh eligibility status
   */
  async refreshEligibility(): Promise<void> {
    // Default to false in case of error.
    let isEligible = false;

    try {
      DevLogger.log('PerpsController: Refreshing eligibility');

      // Returns UNKNOWN if we can't fetch the geo location
      const geoLocation = await this.#fetchGeoLocation();

      // Only set to eligible if we have valid geolocation and it's not blocked
      if (geoLocation !== 'UNKNOWN') {
        isEligible = this.blockedRegionList.list.every(
          (geoBlockedRegion) => !geoLocation.startsWith(geoBlockedRegion),
        );
      }
    } catch (error) {
      DevLogger.log('PerpsController: Eligibility refresh failed', {
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.update((state) => {
        state.isEligible = isEligible;
      });
    }
  }

  /**
   * Get block explorer URL for an address or just the base URL
   * @param address - Optional address to append to the base URL
   * @returns Block explorer URL
   */
  getBlockExplorerUrl(address?: string): string {
    const provider = this.getActiveProvider();
    return provider.getBlockExplorerUrl(address);
  }

  /**
   * Check if user is first-time for the current network
   */
  isFirstTimeUserOnCurrentNetwork(): boolean {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
    return this.state.isFirstTimeUser[currentNetwork];
  }

  /**
   * Mark that the user has completed the tutorial/onboarding
   * This prevents the tutorial from showing again
   */
  markTutorialCompleted(): void {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Marking tutorial as completed', {
      timestamp: new Date().toISOString(),
      network: currentNetwork,
    });

    this.update((state) => {
      state.isFirstTimeUser[currentNetwork] = false;
    });
  }

  /*
   * Mark that user has placed their first successful order
   * This prevents the notification tooltip from showing again
   */
  markFirstOrderCompleted(): void {
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';

    DevLogger.log('PerpsController: Marking first order completed', {
      timestamp: new Date().toISOString(),
      network: currentNetwork,
    });

    this.update((state) => {
      state.hasPlacedFirstOrder[currentNetwork] = true;
    });
  }

  /**
   * Reset first-time user state for both networks
   * This is useful for testing the tutorial flow
   * Called by Reset Account feature in settings
   */
  resetFirstTimeUserState(): void {
    DevLogger.log('PerpsController: Resetting first-time user state', {
      timestamp: new Date().toISOString(),
      previousState: this.state.isFirstTimeUser,
    });

    this.update((state) => {
      state.isFirstTimeUser = {
        testnet: true,
        mainnet: true,
      };
      state.hasPlacedFirstOrder = {
        testnet: false,
        mainnet: false,
      };
    });
  }

  /**
   * Report order events to data lake API with retry (non-blocking)
   */
  private async reportOrderToDataLake(params: {
    action: 'open' | 'close';
    coin: string;
    sl_price?: number;
    tp_price?: number;
    retryCount?: number;
  }): Promise<{ success: boolean; error?: string }> {
    // Skip data lake reporting for testnet as the API doesn't handle testnet data
    const isTestnet = this.state.isTestnet;
    if (isTestnet) {
      DevLogger.log('DataLake API: Skipping for testnet', {
        action: params.action,
        coin: params.coin,
        network: 'testnet',
      });
      return { success: true, error: 'Skipped for testnet' };
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
    const { action, coin, sl_price, tp_price, retryCount = 0 } = params;

    // Start performance measurement for initial call or log retry
    const startTime = performance.now();

    // Log the attempt
    DevLogger.log('DataLake API: Starting order report', {
      action,
      coin,
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRIES + 1,
      hasStopLoss: !!sl_price,
      hasTakeProfit: !!tp_price,
      timestamp: new Date().toISOString(),
    });

    try {
      const token = await this.messagingSystem.call(
        'AuthenticationController:getBearerToken',
      );
      const { AccountTreeController } = Engine.context;
      const accounts =
        AccountTreeController.getAccountsFromSelectedAccountGroup();
      const evmAccount = accounts.find((account) =>
        account.type.startsWith('eip155:'),
      );

      if (!evmAccount || !token) {
        DevLogger.log('DataLake API: Missing requirements', {
          hasAccount: !!evmAccount,
          hasToken: !!token,
          action,
          coin,
        });
        return { success: false, error: 'No account or token available' };
      }

      const response = await fetch(DATA_LAKE_API_CONFIG.ORDERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: evmAccount.address,
          coin,
          sl_price,
          tp_price,
        }),
      });

      const duration = performance.now() - startTime;

      if (!response.ok) {
        throw new Error(`DataLake API error: ${response.status}`);
      }

      // Consume response body (might be empty for 201, but good to check)
      const responseBody = await response.text();

      // Success logging and metrics
      DevLogger.log('DataLake API: Order reported successfully', {
        action,
        coin,
        duration: `${duration.toFixed(0)}ms`,
        status: response.status,
        attempt: retryCount + 1,
        responseBody: responseBody || 'empty',
      });

      // Report performance metric to Sentry (only on success)
      if (retryCount === 0) {
        setMeasurement(
          PerpsMeasurementName.DATA_LAKE_API_CALL,
          duration,
          'millisecond',
        );
      }

      return { success: true };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      DevLogger.log('DataLake API: Request failed', {
        error: errorMessage,
        duration: `${duration.toFixed(0)}ms`,
        retryCount,
        action,
        coin,
        willRetry: retryCount < MAX_RETRIES,
      });

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        DevLogger.log('DataLake API: Scheduling retry', {
          retryIn: `${retryDelay}ms`,
          nextAttempt: retryCount + 2,
          action,
          coin,
        });

        setTimeout(() => {
          this.reportOrderToDataLake({
            action,
            coin,
            sl_price,
            tp_price,
            retryCount: retryCount + 1,
          });
        }, retryDelay);
      } else {
        // Final failure - report to Sentry with performance metric
        DevLogger.log('DataLake API: All retries exhausted', {
          action,
          coin,
          totalAttempts: retryCount + 1,
          finalError: errorMessage,
        });

        // Report total retry duration as a metric
        const totalRetryDuration =
          duration + RETRY_DELAY_MS * (Math.pow(2, retryCount) - 1); // Include retry delays
        setMeasurement(
          PerpsMeasurementName.DATA_LAKE_API_RETRY,
          totalRetryDuration,
          'millisecond',
        );

        Logger.error(error as Error, {
          message: 'Failed to report perps order to data lake after retries',
          action,
          coin,
          retryCount,
          totalDuration: `${totalRetryDuration.toFixed(0)}ms`,
        });
      }

      return { success: false, error: errorMessage };
    }
  }
}
