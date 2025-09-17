import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
import { isEqualCaseInsensitive } from '@metamask/controller-utils';
import {
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import { NetworkControllerGetStateAction } from '@metamask/network-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionSubmittedEvent,
} from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import { GetMarketsParams, PredictProvider } from '../providers/types';
import {
  BuyParams,
  GetPositionsParams,
  OffchainTradeResponse,
  PredictMarket,
  PredictOrder,
  PredictOrderStatus,
  PredictPosition,
  Result,
  SellParams,
  ToggleTestnetResult,
} from '../types';

/**
 * Error codes for PredictController
 * These codes are returned to the UI layer for translation
 */
export const PREDICT_ERROR_CODES = {
  CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
  MARKETS_FAILED: 'MARKETS_FAILED',
  POSITIONS_FAILED: 'POSITIONS_FAILED',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  PLACE_BUY_ORDER_FAILED: 'PLACE_BUY_ORDER_FAILED',
  PLACE_SELL_ORDER_FAILED: 'PLACE_SELL_ORDER_FAILED',
  SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED: 'SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED',
  NO_ONCHAIN_TRADE_PARAMS: 'NO_ONCHAIN_TRADE_PARAMS',
  ONCHAIN_TRANSACTION_NOT_FOUND: 'ONCHAIN_TRANSACTION_NOT_FOUND',
} as const;

export type PredictErrorCode =
  (typeof PREDICT_ERROR_CODES)[keyof typeof PREDICT_ERROR_CODES];

/**
 * State shape for PredictController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictControllerState = {
  isTestnet: boolean; // Dev toggle for testnet
  connectionStatus: 'disconnected' | 'connecting' | 'connected';

  // Market data
  markets: PredictMarket[];

  // User positions
  positions: PredictPosition[];

  // Eligibility (Geo-Blocking) per Provider
  eligibility: { [key: string]: boolean };

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;

  // Order management
  activeOrders: { [key: string]: PredictOrder };
  ordersToNotify: { orderId: string; status: PredictOrderStatus }[];
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  isTestnet: __DEV__, // Default to testnet in dev
  connectionStatus: 'disconnected',
  markets: [],
  positions: [],
  eligibility: {},
  lastError: null,
  lastUpdateTimestamp: 0,
  activeOrders: {},
  ordersToNotify: [],
});

/**
 * State metadata for the PredictController
 */
const metadata = {
  isTestnet: { persist: true, anonymous: false },
  connectionStatus: { persist: false, anonymous: false },
  markets: { persist: false, anonymous: false },
  positions: { persist: true, anonymous: false },
  orders: { persist: false, anonymous: false },
  pendingOrders: { persist: false, anonymous: false },
  eligibility: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  activeOrders: { persist: false, anonymous: false },
  ordersToNotify: { persist: false, anonymous: false },
};

/**
 * PredictController events
 */
export interface PredictControllerEvents {
  type: 'PredictController:stateChange';
  payload: [PredictControllerState, PredictControllerState[]];
}

/**
 * PredictController actions
 */
export type PredictControllerActions =
  | {
      type: 'PredictController:getState';
      handler: () => PredictControllerState;
    }
  | {
      type: 'PredictController:buy';
      handler: PredictController['buy'];
    }
  | {
      type: 'PredictController:refreshEligibility';
      handler: PredictController['refreshEligibility'];
    };

/**
 * External actions the PredictController can call
 */
export type AllowedActions =
  | AccountsControllerGetSelectedAccountAction['type']
  | NetworkControllerGetStateAction['type'];

/**
 * External events the PredictController can subscribe to
 */
export type AllowedEvents =
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionFailedEvent;

/**
 * PredictController messenger constraints
 */
export type PredictControllerMessenger = RestrictedMessenger<
  'PredictController',
  PredictControllerActions,
  PredictControllerEvents | AllowedEvents,
  AllowedActions,
  AllowedEvents['type']
>;

/**
 * PredictController options
 */
export interface PredictControllerOptions {
  messenger: PredictControllerMessenger;
  state?: Partial<PredictControllerState>;
}

/**
 * PredictController - Protocol-agnostic prediction markets trading controller
 *
 * Provides a unified interface for prediction markets trading across multiple protocols.
 * Features dual data flow architecture:
 * - Trading actions use Redux for persistence and optimistic updates
 * - Live data uses direct callbacks for maximum performance
 */
export class PredictController extends BaseController<
  'PredictController',
  PredictControllerState,
  PredictControllerMessenger
> {
  private providers: Map<string, PredictProvider>;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor({ messenger, state = {} }: PredictControllerOptions) {
    super({
      name: 'PredictController',
      metadata,
      messenger,
      state: { ...getDefaultPredictControllerState(), ...state },
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
      DevLogger.log('PredictController: Error initializing providers', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    });

    this.refreshEligibility().catch((error) => {
      DevLogger.log('PredictController: Error refreshing eligibility', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Handle transaction submitted event
   */
  private handleTransactionSubmitted(
    _event: TransactionControllerTransactionSubmittedEvent['payload'][0],
  ): void {
    // TODO: Implement transaction submission tracking
  }

  /**
   * Handle transaction confirmed event
   */
  private async handleTransactionConfirmed(
    _txMeta: TransactionControllerTransactionConfirmedEvent['payload'][0],
  ): Promise<void> {
    const batchId = _txMeta.batchId;

    if (!batchId) {
      return;
    }

    const activeOrder = this.state.activeOrders[batchId];

    if (!activeOrder) {
      return;
    }

    const provider = this.providers.get(activeOrder.providerId);
    if (!provider) {
      this.update((state) => {
        state.activeOrders[batchId].status = 'error';
        state.activeOrders[batchId].error =
          PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE;
      });
      return;
    }

    const onchainTransactionIndex = activeOrder.onchainTradeParams.findIndex(
      (tx) => isEqualCaseInsensitive(tx.data, _txMeta.txParams.data ?? ''),
    );

    const onchainTransactionNotFound = onchainTransactionIndex === -1;

    if (onchainTransactionNotFound) {
      this.update((state) => {
        state.activeOrders[batchId].status = 'error';
        state.activeOrders[batchId].error =
          PREDICT_ERROR_CODES.ONCHAIN_TRANSACTION_NOT_FOUND;
      });
      return;
    }

    this.update((state) => {
      state.activeOrders[batchId].onchainTradeParams[
        onchainTransactionIndex
      ].transactionId = _txMeta.id;
    });

    const isLastPendingTransaction =
      activeOrder.onchainTradeParams.filter((tx) => !tx.transactionId)
        .length === 1;

    if (!isLastPendingTransaction) {
      return;
    }

    const { offchainTradeParams } = activeOrder;

    if (!offchainTradeParams) {
      this.update((state) => {
        state.activeOrders[batchId].status = 'filled';
        state.ordersToNotify.push({ orderId: batchId, status: 'filled' });
      });

      return;
    }

    if (!provider.submitOffchainTrade) {
      this.update((state) => {
        state.activeOrders[batchId].status = 'error';
        state.activeOrders[batchId].error =
          PREDICT_ERROR_CODES.SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED;
        state.ordersToNotify.push({ orderId: batchId, status: 'error' });
      });
      return;
    }

    const { clobOrder, headers } = offchainTradeParams;
    const { success, response } = (await provider.submitOffchainTrade?.({
      clobOrder,
      headers,
    })) as OffchainTradeResponse;

    const status = success ? 'filled' : 'error';
    const error = !success
      ? (response as { error: string }).error ?? 'Unknown error'
      : undefined;

    this.update((state) => {
      state.activeOrders[batchId].status = status;
      state.activeOrders[batchId].error = error;
      state.ordersToNotify.push({ orderId: batchId, status });
    });
  }

  /**
   * Handle transaction failed event
   */
  private handleTransactionFailed(
    _event: TransactionControllerTransactionFailedEvent['payload'][0],
  ): void {
    const batchId = _event.transactionMeta.id;

    if (!batchId) {
      return;
    }

    // TODO: Implement transaction failure tracking
    this.update((state) => {
      if (state.activeOrders[batchId]) {
        state.activeOrders[batchId].status = 'error';
        state.ordersToNotify.push({ orderId: batchId, status: 'error' });
      }
    });
  }

  /**
   * Initialize the PredictController providers
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
    DevLogger.log('PredictController: Initializing providers', {
      currentNetwork: this.state.isTestnet ? 'testnet' : 'mainnet',
      existingProviders: Array.from(this.providers.keys()),
      timestamp: new Date().toISOString(),
    });

    // Disconnect existing providers to close WebSocket connections
    const existingProviders = Array.from(this.providers.values());
    if (existingProviders.length > 0) {
      DevLogger.log('PredictController: Disconnecting existing providers', {
        count: existingProviders.length,
        timestamp: new Date().toISOString(),
      });
    }
    // note: temporarily removing as causing "Engine does not exist"
    // const { KeyringController } = Engine.context;
    this.providers.clear();
    this.providers.set(
      'polymarket',
      new PolymarketProvider({
        isTestnet: this.state.isTestnet,
      }),
    );

    // Future providers can be added here with their own authentication patterns:
    // - Some might use API keys: new BinanceProvider({ apiKey, apiSecret })
    // - Some might use different wallet patterns: new GMXProvider({ signer })
    // - Some might not need auth at all: new DydxProvider()

    this.isInitialized = true;
    DevLogger.log('PredictController: Providers initialized successfully', {
      providerCount: this.providers.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get available markets with optional filtering
   */
  async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
    try {
      const provider = this.providers.get('polymarket');
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }
      const allMarkets = await provider?.getMarkets(params);

      // Clear any previous errors on successful call
      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return allMarkets;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.MARKETS_FAILED;

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
   * Get user positions
   */
  async getPositions({
    address,
  }: GetPositionsParams): Promise<PredictPosition[]> {
    try {
      const provider = this.providers.get('polymarket');
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const { AccountsController } = Engine.context;

      const selectedAddress =
        address ?? AccountsController.getSelectedAccount().address;

      const positions = await provider.getPositions({
        address: selectedAddress,
      });

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
          : PREDICT_ERROR_CODES.POSITIONS_FAILED;

      // Update error state but don't modify positions (keep existing data)
      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      // Re-throw the error so components can handle it appropriately
      throw error;
    }
  }

  async buy({
    market,
    outcomeId,
    outcomeTokenId,
    amount,
  }: BuyParams): Promise<Result> {
    try {
      const provider = this.providers.get(market.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      // TODO: Change to AccountTreeController when available
      const { AccountsController, NetworkController, KeyringController } =
        Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;

      const order = await provider.prepareOrder({
        signer: {
          address: selectedAddress,
          signTypedMessage: (
            params: TypedMessageParams,
            version: SignTypedDataVersion,
          ) => KeyringController.signTypedMessage(params, version),
        },
        outcomeId,
        outcomeTokenId,
        amount,
        isBuy: true,
        market,
      });

      if (order.onchainTradeParams.length === 0) {
        throw new Error(PREDICT_ERROR_CODES.NO_ONCHAIN_TRADE_PARAMS);
      }

      const { chainId } = order;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      const { batchId } = await addTransactionBatch({
        from: selectedAddress as Hex,
        networkClientId,
        transactions: order.onchainTradeParams.map((tx) => ({
          params: {
            to: tx.to as Hex,
            data: tx.data as Hex,
            value: tx.value as Hex,
          },
        })),
        disable7702: true,
        disableHook: true,
        disableSequential: false,
        requireApproval: true,
      });

      this.update((state) => {
        state.activeOrders[batchId] = order;
        state.activeOrders[batchId].status = 'pending';
        state.ordersToNotify.push({ orderId: batchId, status: 'pending' });
      });

      return {
        success: true,
        id: batchId,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_BUY_ORDER_FAILED,
        id: undefined,
      };
    }
  }

  async sell({
    position,
    outcomeId,
    outcomeTokenId,
    quantity,
  }: SellParams): Promise<Result> {
    try {
      const provider = this.providers.get(position.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      // TODO: Change to AccountTreeController when available
      const { AccountsController, NetworkController, KeyringController } =
        Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;

      const order = await provider.prepareOrder({
        signer: {
          address: selectedAddress,
          signTypedMessage: (
            params: TypedMessageParams,
            version: SignTypedDataVersion,
          ) => KeyringController.signTypedMessage(params, version),
        },
        outcomeId,
        outcomeTokenId,
        amount: quantity,
        isBuy: false,
      });

      if (order.onchainTradeParams.length === 0) {
        throw new Error(PREDICT_ERROR_CODES.NO_ONCHAIN_TRADE_PARAMS);
      }

      const { chainId } = order;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      const { batchId } = await addTransactionBatch({
        from: selectedAddress as Hex,
        networkClientId,
        transactions: order.onchainTradeParams.map((tx) => ({
          params: {
            to: tx.to as Hex,
            data: tx.data as Hex,
            value: tx.value as Hex,
          },
        })),
        disable7702: true,
        disableHook: true,
        disableSequential: false,
        requireApproval: false,
      });

      this.update((state) => {
        state.activeOrders[batchId] = order;
        state.activeOrders[batchId].status = 'pending';
        state.ordersToNotify.push({ orderId: batchId, status: 'pending' });
      });

      return {
        success: true,
        id: batchId,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_SELL_ORDER_FAILED,
        id: undefined,
      };
    }
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

      DevLogger.log('PredictController: Network toggle initiated', {
        from: previousNetwork,
        to: newNetwork,
        timestamp: new Date().toISOString(),
      });

      // Reset initialization state and reinitialize provider with new testnet setting
      this.isInitialized = false;
      this.initializationPromise = null;
      await this.initializeProviders();

      DevLogger.log('PredictController: Network toggle completed', {
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
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Refresh eligibility status
   */
  public async refreshEligibility(): Promise<void> {
    DevLogger.log('PredictController: Refreshing eligibility');
    for (const providerId in this.providers) {
      const provider = this.providers.get(providerId);
      if (!provider) {
        continue;
      }
      try {
        const isEligible = await provider.isEligible();
        this.update((state) => {
          state.eligibility[providerId] = isEligible;
        });
      } catch (error) {
        // Default to false in case of error
        this.update((state) => {
          state.eligibility[providerId] = false;
        });
        DevLogger.log('PredictController: Eligibility refresh failed', {
          error:
            error instanceof Error
              ? error.message
              : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  public deleteOrderToNotify(orderId: string): void {
    this.update((state) => {
      state.ordersToNotify = state.ordersToNotify.filter(
        (order) => order.orderId !== orderId,
      );
    });
  }

  /**
   * Test utility method to update state for testing purposes
   * @param updater - Function that updates the state
   */
  public updateStateForTesting(
    updater: (state: PredictControllerState) => void,
  ): void {
    this.update(updater);
  }
}
