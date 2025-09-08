import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  BaseController,
  type RestrictedMessenger,
} from '@metamask/base-controller';
import { successfulFetch } from '@metamask/controller-utils';
import { NetworkControllerGetStateAction } from '@metamask/network-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionType,
} from '@metamask/transaction-controller';
import { numberToHex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { addTransaction } from '../../../../util/transaction-controller';
import { PolymarketProvider } from '../providers/polymarket/PolymarketProvider';
import { GetMarketsParams, PredictProvider } from '../providers/types';
import {
  BuyParams,
  PredictMarket,
  PredictPosition,
  ToggleTestnetResult,
  GetPositionsParams,
  Result,
  PredictOrder,
  OffchainTradeResponse,
} from '../types';
import { fetchGeoBlockedRegionsFromContentful } from '../utils/contentful';
import {
  SignTypedDataVersion,
  TypedMessageParams,
} from '@metamask/keyring-controller';

/**
 * Get environment type for geo-blocking URLs
 */
const getEnvironment = (): 'DEV' | 'PROD' => {
  const env = process.env.NODE_ENV ?? 'production';
  return env === 'production' ? 'PROD' : 'DEV';
};

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
  SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED: 'SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED',
} as const;

export type PredictErrorCode =
  (typeof PREDICT_ERROR_CODES)[keyof typeof PREDICT_ERROR_CODES];

/**
 * Geo-blocking
 */
const ON_RAMP_GEO_BLOCKING_URLS = {
  DEV: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
  PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
};

// UNKNOWN is the default/fallback in case the location API call fails
export const DEFAULT_GEO_BLOCKED_REGIONS = [
  'US', // United States
  'GB', // United Kingdom
  'FR', // France
  'CA-ON', // Ontario, Canada
  'SG', // Singapore
  'PL', // Poland
  'TH', // Thailand
  'AU', // Australia
  'BE', // Belgium
  'TW', // Taiwan
  'UNKNOWN',
];

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

  // Eligibility (Geo-Blocking)
  isEligible: boolean;

  // Error handling
  lastError: string | null;
  lastUpdateTimestamp: number;
  activeOrders: { [key: string]: PredictOrder };
  lastSuccessfulTransaction: string | null;
};

/**
 * Get default PredictController state
 */
export const getDefaultPredictControllerState = (): PredictControllerState => ({
  isTestnet: __DEV__, // Default to testnet in dev
  connectionStatus: 'disconnected',
  markets: [],
  positions: [],
  isEligible: false,
  lastError: null,
  lastUpdateTimestamp: 0,
  activeOrders: {},
  lastSuccessfulTransaction: null,
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
  isEligible: { persist: false, anonymous: false },
  lastError: { persist: false, anonymous: false },
  lastUpdateTimestamp: { persist: false, anonymous: false },
  activeOrders: { persist: false, anonymous: false },
  lastSuccessfulTransaction: { persist: false, anonymous: false },
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

    fetchGeoBlockedRegionsFromContentful().then((blockedRegions) => {
      this.refreshEligibility(
        blockedRegions
          ? blockedRegions.map((r) => r.region)
          : DEFAULT_GEO_BLOCKED_REGIONS,
      ).catch((error) => {
        DevLogger.log('PredictController: Error refreshing eligibility', {
          error:
            error instanceof Error
              ? error.message
              : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
          timestamp: new Date().toISOString(),
        });
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
    const activeOrder = this.state.activeOrders[_txMeta.id];

    if (activeOrder) {
      const provider = this.providers.get(activeOrder.providerId);
      if (!provider) {
        throw new Error(PREDICT_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
      }

      if (activeOrder.offchainTradeParams) {
        if (!provider.submitOffchainTrade) {
          throw new Error(
            PREDICT_ERROR_CODES.SUBMIT_OFFCHAIN_TRADE_NOT_SUPPORTED,
          );
        }
        const { clobOrder, headers } = activeOrder.offchainTradeParams;
        const { success, response } = (await provider.submitOffchainTrade({
          clobOrder,
          headers,
        })) as OffchainTradeResponse;

        this.update((state) => {
          state.activeOrders[_txMeta.id].status = success ? 'filled' : 'error';
          state.activeOrders[_txMeta.id].error =
            (response as { error: string }).error ?? 'Unknown error';
        });
      } else {
        this.update((state) => {
          state.activeOrders[_txMeta.id].status = 'filled';
        });
      }
    }
  }

  /**
   * Handle transaction failed event
   */
  private handleTransactionFailed(
    _event: TransactionControllerTransactionFailedEvent['payload'][0],
  ): void {
    // TODO: Implement transaction failure tracking
    this.update((state) => {
      if (state.activeOrders[_event.transactionMeta.id]) {
        state.activeOrders[_event.transactionMeta.id].status = 'error';
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
    marketId,
    outcomeId,
    outcomeTokenId,
    amount,
    providerId,
  }: BuyParams): Promise<Result> {
    try {
      const provider = this.providers.get(providerId);
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
        marketId,
        outcomeId,
        outcomeTokenId,
        amount,
        isBuy: true,
      });

      const { chainId, to, data, value } = order.onchainTradeParams;

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        numberToHex(chainId),
      );

      const { transactionMeta } = await addTransaction(
        {
          from: selectedAddress,
          to,
          data,
          value,
        },
        {
          networkClientId,
          type: TransactionType.contractInteraction,
          requireApproval: true,
        },
      );

      this.update((state) => {
        state.activeOrders[transactionMeta.id] = order;
        state.activeOrders[transactionMeta.id].onchainTradeParams.txMeta =
          transactionMeta;
        state.activeOrders[transactionMeta.id].status = 'pending';
      });

      return {
        success: true,
        error: undefined,
        transactionId: transactionMeta.id,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.PLACE_BUY_ORDER_FAILED,
        transactionId: undefined,
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
   * Eligibility (Geo-Blocking)
   * Users in blocked regions are not eligible for Predict markets:
   * US, UK, France, Ontario (Canada), Singapore, Poland, Thailand, Australia, Belgium, Taiwan
   */

  /**
   * Fetch geo location
   *
   * Returned in Country or Country-Region format
   * Example: GB, FR, CA-ON, SG, PL
   */
  async #fetchGeoLocation(): Promise<string> {
    let location = 'UNKNOWN';

    try {
      const environment = getEnvironment();

      const response = await successfulFetch(
        ON_RAMP_GEO_BLOCKING_URLS[environment],
      );

      location = await response?.text();

      return location;
    } catch (e) {
      DevLogger.log('PredictController: Failed to fetch geo location', {
        error: e,
      });
      return location;
    }
  }

  /**
   * Refresh eligibility status
   */
  async refreshEligibility(
    blockedLocations = DEFAULT_GEO_BLOCKED_REGIONS,
  ): Promise<void> {
    // Default to false in case of error.
    let isEligible = false;

    try {
      DevLogger.log('PredictController: Refreshing eligibility');

      const geoLocation = await this.#fetchGeoLocation();

      isEligible = blockedLocations.every(
        (blockedLocation) => !geoLocation.startsWith(blockedLocation),
      );
    } catch (error) {
      DevLogger.log('PredictController: Eligibility refresh failed', {
        error:
          error instanceof Error
            ? error.message
            : PREDICT_ERROR_CODES.UNKNOWN_ERROR,
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.update((state) => {
        state.isEligible = isEligible;
      });
    }
  }
}
