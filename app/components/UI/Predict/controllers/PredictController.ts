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
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
} from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import { GetMarketsParams, PredictProvider } from '../providers/types';
import {
  BuyParams,
  GetPositionsParams,
  OffchainTradeResponse,
  PredictMarket,
  PredictNotification,
  PredictOrder,
  PredictPosition,
  Result,
  SellParams,
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
  SUBMIT_OFFCHAIN_TRADE_FAILED: 'SUBMIT_OFFCHAIN_TRADE_FAILED',
} as const;

export type PredictErrorCode =
  (typeof PREDICT_ERROR_CODES)[keyof typeof PREDICT_ERROR_CODES];

/**
 * State shape for PredictController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictControllerState = {
  // User positions
  positions: PredictPosition[];

  // Eligibility (Geo-Blocking) per Provider
  eligibility: { [key: string]: boolean };

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;

  // Order management
  activeOrders: { [key: string]: PredictOrder };

  // Notifications
  // TODO: Refactor to use generic notifications
  notifications: PredictNotification[];
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  positions: [],
  eligibility: {},
  lastError: null,
  lastUpdateTimestamp: 0,
  activeOrders: {},
  notifications: [],
});

/**
 * State metadata for the PredictController
 */
const metadata = {
  positions: { persist: true, anonymous: false },
  orders: { persist: false, anonymous: false },
  pendingOrders: { persist: false, anonymous: false },
  eligibility: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  activeOrders: { persist: true, anonymous: false },
  notifications: { persist: false, anonymous: false },
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
      type: 'PredictController:sell';
      handler: PredictController['sell'];
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
  | TransactionControllerTransactionFailedEvent
  | TransactionControllerTransactionRejectedEvent;

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

    // TODO: Uncomment this when we have a way to handle transaction rejected events
    /* this.messagingSystem.subscribe(
      'TransactionController:transactionRejected',
      this.handleTransactionRejected.bind(this),
    ); */

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
    const txId = _txMeta.id;

    const id = batchId ?? txId;

    if (!id) {
      return;
    }

    const activeOrder = this.state.activeOrders[id];

    if (!activeOrder) {
      return;
    }

    const provider = this.providers.get(activeOrder.providerId);
    if (!provider) {
      this.update((state) => {
        state.activeOrders[id].status = 'error';
        state.activeOrders[id].error =
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
        state.activeOrders[id].status = 'error';
        state.activeOrders[id].error =
          PREDICT_ERROR_CODES.ONCHAIN_TRANSACTION_NOT_FOUND;
      });
      return;
    }

    this.update((state) => {
      state.activeOrders[id].onchainTradeParams[
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
        state.activeOrders[id].status = 'filled';
        state.notifications.push({ orderId: id, status: 'filled' });
      });

      return;
    }

    if (!provider.submitOffchainTrade) {
      this.update((state) => {
        state.activeOrders[id].status = 'error';
        state.activeOrders[id].error =
          PREDICT_ERROR_CODES.SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED;
        state.notifications.push({ orderId: id, status: 'error' });
      });
      return;
    }

    try {
      const { success, response } = (await provider.submitOffchainTrade?.(
        offchainTradeParams,
      )) as OffchainTradeResponse;

      const status = success ? 'filled' : 'error';
      const error = !success
        ? (response as { error: string }).error ?? 'Unknown error'
        : undefined;

      this.update((state) => {
        state.activeOrders[id].status = status;
        state.activeOrders[id].error = error;
        state.notifications.push({ orderId: id, status });
      });
    } catch (error) {
      this.update((state) => {
        state.activeOrders[id].status = 'error';
        state.activeOrders[id].error =
          PREDICT_ERROR_CODES.SUBMIT_OFFCHAIN_TRADE_FAILED;
        state.notifications.push({ orderId: id, status: 'error' });
      });
    }
  }

  /**
   * Handle transaction failed event
   */
  private handleTransactionFailed(
    _event: TransactionControllerTransactionFailedEvent['payload'][0],
  ): void {
    const batchId = _event.transactionMeta.id;
    const txId = _event.transactionMeta.id;

    const id = batchId ?? txId;

    if (!id) {
      return;
    }

    // TODO: Implement transaction failure tracking
    this.update((state) => {
      if (state.activeOrders[id]) {
        state.activeOrders[id].status = 'error';
        state.notifications.push({ orderId: id, status: 'error' });
      }
    });
  }

  /**
   * Handle transaction rejected event
   */
  // TODO: Uncomment this when we have a way to handle transaction rejected events
  // private handleTransactionRejected(
  //   _event: TransactionControllerTransactionRejectedEvent['payload'][0],
  // ): void {
  //   const batchId = _event.transactionMeta.id;
  //   const txId = _event.transactionMeta.id;
  //
  //   const id = batchId ?? txId;
  //
  //   if (!id) {
  //     return;
  //   }
  //
  //   this.update((state) => {
  //     if (state.activeOrders[id]) {
  //       state.activeOrders[id].status = 'cancelled';
  //       state.notifications.push({ orderId: id, status: 'cancelled' });
  //     }
  //   });
  // }

  /**
   * Initialize the PredictController providers
   * Must be called before using any other methods
   * Prevents double initialization with promise caching
   */
  private async initializeProviders(): Promise<void> {
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

    this.providers.clear();
    this.providers.set('polymarket', new PolymarketProvider());

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
      const providerIds = params.providerId
        ? [params.providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const allMarkets = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getMarkets(params),
        ),
      );

      //TODO: We need to sort the markets after merging them
      const markets = allMarkets
        .flat()
        .filter((market): market is PredictMarket => market !== undefined);

      // Clear any previous errors on successful call
      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return markets;
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
    providerId,
  }: GetPositionsParams): Promise<PredictPosition[]> {
    try {
      const { AccountsController } = Engine.context;

      const selectedAddress =
        address ?? AccountsController.getSelectedAccount().address;

      const providerIds = providerId
        ? [providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const allPositions = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getPositions({
            address: selectedAddress,
          }),
        ),
      );

      //TODO: We need to sort the positions after merging them
      const positions = allPositions
        .flat()
        .filter(
          (position): position is PredictPosition => position !== undefined,
        );

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
    size,
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

      const order = await provider.prepareBuyOrder({
        signer: {
          address: selectedAddress,
          signTypedMessage: (
            params: TypedMessageParams,
            version: SignTypedDataVersion,
          ) => KeyringController.signTypedMessage(params, version),
        },
        outcomeId,
        outcomeTokenId,
        size,
        market,
      });

      if (order.onchainTradeParams.length === 0) {
        throw new Error(PREDICT_ERROR_CODES.NO_ONCHAIN_TRADE_PARAMS);
      }

      const { chainId } = order;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      if (order.onchainTradeParams.length === 1) {
        const params = order.onchainTradeParams[0];

        const { transactionMeta } = await addTransaction(
          {
            from: selectedAddress as Hex,
            to: params.to as Hex,
            data: params.data as Hex,
            value: params.value as Hex,
          },
          {
            networkClientId,
            requireApproval: true,
          },
        );

        this.update((state) => {
          state.activeOrders[transactionMeta.id] = order;
          state.activeOrders[transactionMeta.id].status = 'pending';
          state.notifications.push({
            orderId: transactionMeta.id,
            status: 'pending',
          });
        });

        return {
          success: true,
          id: transactionMeta.id,
        };
      }

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
        state.notifications.push({ orderId: batchId, status: 'pending' });
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

  async sell({ position }: SellParams): Promise<Result> {
    try {
      const provider = this.providers.get(position.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      // TODO: Change to AccountTreeController when available
      const { AccountsController, NetworkController, KeyringController } =
        Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;

      const order = await provider.prepareSellOrder({
        signer: {
          address: selectedAddress,
          signTypedMessage: (
            params: TypedMessageParams,
            version: SignTypedDataVersion,
          ) => KeyringController.signTypedMessage(params, version),
        },
        position,
      });

      if (order.onchainTradeParams.length === 0) {
        throw new Error(PREDICT_ERROR_CODES.NO_ONCHAIN_TRADE_PARAMS);
      }

      const { chainId } = order;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      if (order.onchainTradeParams.length === 1) {
        const params = order.onchainTradeParams[0];

        const { transactionMeta } = await addTransaction(
          {
            from: selectedAddress as Hex,
            to: params.to as Hex,
            data: params.data as Hex,
            value: params.value as Hex,
          },
          {
            networkClientId,
            requireApproval: true,
          },
        );

        this.update((state) => {
          state.activeOrders[transactionMeta.id] = order;
          state.activeOrders[transactionMeta.id].status = 'pending';
          state.notifications.push({
            orderId: transactionMeta.id,
            status: 'pending',
          });
        });

        return {
          success: true,
          id: transactionMeta.id,
        };
      }

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
        state.notifications.push({ orderId: batchId, status: 'pending' });
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

  public deleteNotification(orderId: string): void {
    this.update((state) => {
      state.notifications = state.notifications.filter(
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
