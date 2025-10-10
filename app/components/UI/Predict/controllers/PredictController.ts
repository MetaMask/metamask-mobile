import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  PersonalMessageParams,
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import { NetworkControllerGetStateAction } from '@metamask/network-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionType,
} from '@metamask/transaction-controller';
import { numberToHex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { addTransaction } from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import {
  AccountState,
  CalculateBetAmountsParams,
  CalculateBetAmountsResponse,
  CalculateCashOutAmountsParams,
  CalculateCashOutAmountsResponse,
  EnableWalletParams,
  EnableWalletResponse,
  GetAccountStateParams,
  GetMarketsParams,
  GetPositionsParams,
  PlaceOrderParams,
  PredictProvider,
} from '../providers/types';
import {
  ClaimParams,
  GetPriceHistoryParams,
  PredictClaim,
  PredictClaimStatus,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  Result,
} from '../types';

/**
 * Error codes for PredictController
 * These codes are returned to the UI layer for translation
 */
export const PREDICT_ERROR_CODES = {
  CLIENT_NOT_INITIALIZED: 'CLIENT_NOT_INITIALIZED',
  MARKETS_FAILED: 'MARKETS_FAILED',
  MARKET_DETAILS_FAILED: 'MARKET_DETAILS_FAILED',
  PRICE_HISTORY_FAILED: 'PRICE_HISTORY_FAILED',
  POSITIONS_FAILED: 'POSITIONS_FAILED',
  PROVIDER_NOT_AVAILABLE: 'PROVIDER_NOT_AVAILABLE',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  PLACE_BUY_ORDER_FAILED: 'PLACE_BUY_ORDER_FAILED',
  PLACE_SELL_ORDER_FAILED: 'PLACE_SELL_ORDER_FAILED',
  SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED: 'SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED',
  NO_ONCHAIN_TRADE_PARAMS: 'NO_ONCHAIN_TRADE_PARAMS',
  ONCHAIN_TRANSACTION_NOT_FOUND: 'ONCHAIN_TRANSACTION_NOT_FOUND',
  SUBMIT_OFFCHAIN_TRADE_FAILED: 'SUBMIT_OFFCHAIN_TRADE_FAILED',
  CLAIM_FAILED: 'CLAIM_FAILED',
  PLACE_ORDER_FAILED: 'PLACE_ORDER_FAILED',
  ENABLE_WALLET_FAILED: 'ENABLE_WALLET_FAILED',
} as const;

export type PredictErrorCode =
  (typeof PREDICT_ERROR_CODES)[keyof typeof PREDICT_ERROR_CODES];

/**
 * State shape for PredictController
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PredictControllerState = {
  // Eligibility (Geo-Blocking) per Provider
  eligibility: { [key: string]: boolean };

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;

  // Claim management
  claimTransaction: PredictClaim | null;

  // Persisted data
  // --------------
  // Setup
  isOnboarded: { [address: string]: boolean };
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  eligibility: {},
  lastError: null,
  lastUpdateTimestamp: 0,
  claimTransaction: null,
  isOnboarded: {},
});

/**
 * State metadata for the PredictController
 */
const metadata = {
  eligibility: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  claimTransaction: { persist: false, anonymous: false },
  isOnboarded: { persist: true, anonymous: false },
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
      type: 'PredictController:refreshEligibility';
      handler: PredictController['refreshEligibility'];
    }
  | {
      type: 'PredictController:placeOrder';
      handler: PredictController['placeOrder'];
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

    this.messagingSystem.subscribe(
      'TransactionController:transactionRejected',
      this.handleTransactionRejected.bind(this),
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
    const txId = _txMeta.id;

    if (!txId) {
      return;
    }

    const claimTransaction = this.state.claimTransaction;

    if (claimTransaction?.transactionId !== txId) {
      return;
    }

    this.update((state) => {
      if (!state.claimTransaction) {
        return;
      }
      state.claimTransaction.status = PredictClaimStatus.CONFIRMED;
    });
    return;
  }

  /**
   * Handle transaction failed event
   */
  private handleTransactionFailed(
    _event: TransactionControllerTransactionFailedEvent['payload'][0],
  ): void {
    const txId = _event.transactionMeta.id;

    if (!txId) {
      return;
    }

    const claimTransaction = this.state.claimTransaction;

    if (!claimTransaction) {
      return;
    }

    this.update((state) => {
      if (!state.claimTransaction) {
        return;
      }
      state.claimTransaction.status = PredictClaimStatus.ERROR;
    });
    return;
  }

  /**
   * Handle transaction rejected event
   */
  private handleTransactionRejected(
    _event: TransactionControllerTransactionRejectedEvent['payload'][0],
  ): void {
    // TODO: Implement transaction submission tracking
  }

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
   * Get detailed information for a single market
   */
  async getMarket({
    marketId,
    providerId,
  }: {
    marketId: string | number;
    providerId?: string;
  }): Promise<PredictMarket> {
    const resolvedMarketId = String(marketId);

    if (!resolvedMarketId) {
      throw new Error('marketId is required');
    }

    try {
      await this.initializeProviders();

      const targetProviderId = providerId ?? 'polymarket';
      const provider = this.providers.get(targetProviderId);

      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const market = await provider.getMarketDetails({
        marketId: resolvedMarketId,
      });

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return market;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED;

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(PREDICT_ERROR_CODES.MARKET_DETAILS_FAILED);
    }
  }

  /**
   * Get market price history
   */
  async getPriceHistory(
    params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]> {
    try {
      const providerIds = params.providerId
        ? [params.providerId]
        : Array.from(this.providers.keys());

      if (providerIds.some((id) => !this.providers.has(id))) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const histories = await Promise.all(
        providerIds.map((id: string) =>
          this.providers.get(id)?.getPriceHistory({
            ...params,
            providerId: id,
          }),
        ),
      );

      const priceHistory = histories.flatMap((history) => history ?? []);

      this.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });

      return priceHistory;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.PRICE_HISTORY_FAILED;

      this.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });

      throw error;
    }
  }

  /**
   * Get user positions
   */
  async getPositions(params: GetPositionsParams): Promise<PredictPosition[]> {
    try {
      const { address, providerId } = params;
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
            ...params,
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

  async placeOrder<T>(params: PlaceOrderParams): Promise<Result<T>> {
    try {
      const provider = this.providers.get(params.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      const { AccountsController, KeyringController } = Engine.context;
      const selectedAddress = AccountsController.getSelectedAccount().address;

      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          params: TypedMessageParams,
          version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(params, version),
        signPersonalMessage: (params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(params),
      };

      return await provider.placeOrder({ ...params, signer });
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_ORDER_FAILED,
      };
    }
  }

  async calculateBetAmounts(
    params: CalculateBetAmountsParams,
  ): Promise<CalculateBetAmountsResponse> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }
    return provider.calculateBetAmounts(params);
  }

  async calculateCashOutAmounts(
    params: CalculateCashOutAmountsParams,
  ): Promise<CalculateCashOutAmountsResponse> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }
    return provider.calculateCashOutAmounts(params);
  }

  async claim({ positions, providerId }: ClaimParams): Promise<PredictClaim> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    const { AccountsController, KeyringController, NetworkController } =
      Engine.context;
    const selectedAddress = AccountsController.getSelectedAccount().address;

    const signer = {
      address: selectedAddress,
      signTypedMessage: (
        params: TypedMessageParams,
        version: SignTypedDataVersion,
      ) => KeyringController.signTypedMessage(params, version),
      signPersonalMessage: (params: PersonalMessageParams) =>
        KeyringController.signPersonalMessage(params),
    };

    const claimTransaction = await provider.prepareClaim({
      positions,
      signer,
    });

    const { transactionMeta } = await addTransaction(
      {
        ...claimTransaction.transactionParams,
      },
      {
        networkClientId: NetworkController.findNetworkClientIdByChainId(
          numberToHex(claimTransaction.chainId),
        ),
        origin: ORIGIN_METAMASK,
        type: TransactionType.contractInteraction,
      },
    );

    const predictClaim: PredictClaim = {
      transactionId: transactionMeta.id,
      chainId: claimTransaction.chainId,
      status: PredictClaimStatus.PENDING,
      txParams: { ...claimTransaction.transactionParams, value: '0x0' },
    };

    this.update((state) => {
      state.claimTransaction = predictClaim;
    });

    return predictClaim;
  }

  /**
   * Refresh eligibility status
   */
  public async refreshEligibility(): Promise<void> {
    DevLogger.log('PredictController: Refreshing eligibility');
    for (const [providerId, provider] of this.providers) {
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

  /**
   * Test utility method to update state for testing purposes
   * @param updater - Function that updates the state
   */
  public updateStateForTesting(
    updater: (state: PredictControllerState) => void,
  ): void {
    this.update(updater);
  }

  public clearClaimTransactions(): void {
    this.update((state) => {
      state.claimTransaction = null;
    });
  }

  // TODO: We need to change to execute the transactions in the controller
  public async enableWallet(
    params: EnableWalletParams,
  ): Promise<EnableWalletResponse> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }

    const { AccountsController, KeyringController } = Engine.context;

    try {
      const selectedAddress = AccountsController.getSelectedAccount().address;
      const signer = {
        address: selectedAddress,
        signTypedMessage: (
          params: TypedMessageParams,
          version: SignTypedDataVersion,
        ) => KeyringController.signTypedMessage(params, version),
        signPersonalMessage: (params: PersonalMessageParams) =>
          KeyringController.signPersonalMessage(params),
      };

      const response = await provider.enableWallet({
        ...params,
        signer,
      });

      return response;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : PREDICT_ERROR_CODES.ENABLE_WALLET_FAILED,
      );
    }
  }

  public async getAccountState(
    params: GetAccountStateParams,
  ): Promise<AccountState> {
    const provider = this.providers.get(params.providerId);
    if (!provider) {
      throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
    }
    const { AccountsController } = Engine.context;
    const selectedAddress = AccountsController.getSelectedAccount().address;

    return provider.getAccountState({
      ...params,
      ownerAddress: selectedAddress,
    });
  }
}
