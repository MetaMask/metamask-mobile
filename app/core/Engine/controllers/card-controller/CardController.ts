import { BaseController } from '@metamask/base-controller';
import Logger from '../../../../util/Logger';
import { store } from '../../../../store';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { CardDataService } from './services';
import {
  storeCardBaanxToken,
  removeCardBaanxToken,
} from '../../../../components/UI/Card/util/cardTokenVault';
import type { CardControllerMessenger } from '../../messengers/card-controller-messenger';
import {
  getCardControllerDefaultState,
  type CardControllerState,
  type CardAccountState,
  type CardTokenData,
  type SupportedToken,
  type CardDetailsResponse,
  type CardExchangeTokenResponse,
  type CardLoginResponse,
  type CardLoginInitiateResponse,
  type CardAuthorizeResponse,
  type CardExternalWalletDetailsResponse,
  type CardTokenAllowanceState,
  type GetPriorityTokenParams,
  type GetSupportedTokensAllowancesParams,
  type GetCardDetailsParams,
  type GetExternalWalletDetailsParams,
  type AuthenticateParams,
  type InitiateLoginParams,
  type ExchangeTokenParams,
  type AuthorizeParams,
  type CheckCardholderParams,
  type GetGeoLocationParams,
  type RefreshTokenParams,
} from './types';

// Re-export the messenger type for convenience
export type { CardControllerMessenger };

const controllerName = 'CardController';

// Cache thresholds
const CARDHOLDER_CACHE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes
const GEOLOCATION_CACHE_THRESHOLD_MS = 1000 * 60 * 60; // 1 hour
const PRIORITY_TOKEN_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute
const CARD_DETAILS_CACHE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes
const EXTERNAL_WALLET_CACHE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes
const SUPPORTED_TOKENS_ALLOWANCES_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

/**
 * State metadata for the CardController
 */
const metadata = {
  accounts: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  global: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  activeAccount: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  loadingPhase: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
  lastError: {
    includeInStateLogs: true,
    persist: false,
    anonymous: false,
    usedInUi: true,
  },
};

type CacheReader<T> = (
  key: string,
) => { payload: T; lastFetched?: number } | undefined;
type CacheWriter<T> = (key: string, payload: T) => void;

interface CacheOptions<T> {
  key: string;
  ttl: number;
  readCache: CacheReader<T>;
  fetchFresh: () => Promise<T>;
  writeCache: CacheWriter<T>;
  swrCallback?: (old: T, fresh: T) => void;
}

/**
 * Get a value from cache if it exists and is fresh, otherwise fetch fresh data
 */
async function wrapWithCache<T>({
  key,
  ttl,
  readCache,
  fetchFresh,
  writeCache,
  swrCallback,
}: CacheOptions<T>): Promise<T> {
  // Try cache
  try {
    const cached = readCache(key);

    if (cached) {
      const isStale =
        !cached.lastFetched || Date.now() - cached.lastFetched > ttl;

      // If cache is fresh, return it immediately and do NOT trigger SWR
      if (!isStale) return cached.payload;

      // If stale and SWR enabled → return stale data + background refresh
      if (swrCallback) {
        (async () => {
          try {
            const fresh = await fetchFresh();
            writeCache(key, fresh);
            swrCallback(cached.payload, fresh);
          } catch (err) {
            Logger.log(
              'SWR revalidation failed:',
              err instanceof Error ? err.message : String(err),
            );
          }
        })();
        return cached.payload;
      }
    }
  } catch (error) {
    Logger.log(
      'CardController: wrapWithCache cache read failed, fetching fresh',
      error instanceof Error ? error.message : String(error),
    );
  }

  // Fetch fresh
  const freshValue = await fetchFresh();

  // Write cache
  try {
    writeCache(key, freshValue);
  } catch (error) {
    Logger.log(
      'CardController: wrapWithCache writeCache failed',
      error instanceof Error ? error.message : String(error),
    );
  }

  return freshValue;
}

/**
 * Controller for managing Card functionality including authentication, data fetching, and state management
 */
export class CardController extends BaseController<
  typeof controllerName,
  CardControllerState,
  CardControllerMessenger
> {
  #dataService: CardDataService | null = null;

  constructor({
    messenger,
    state,
  }: {
    messenger: CardControllerMessenger;
    state?: Partial<CardControllerState>;
  }) {
    super({
      name: controllerName,
      metadata,
      messenger,
      state: {
        ...getCardControllerDefaultState(),
        ...state,
      },
    });

    this.#registerActionHandlers();
    this.#initializeDataService();
  }

  /**
   * Initialize the Card data service with current feature flag settings
   */
  #initializeDataService(): void {
    try {
      const cardFeatureFlag = selectCardFeatureFlag(store.getState());
      if (cardFeatureFlag) {
        this.#dataService = new CardDataService({
          cardFeatureFlag,
          enableLogs: process.env.NODE_ENV === 'development',
        });

        // Update global state with feature flag info
        this.update((state) => {
          state.global.isFeatureEnabled =
            this.#dataService?.isCardEnabled ?? false;
          state.global.isBaanxLoginEnabled =
            this.#dataService?.isBaanxLoginEnabled ?? false;
        });

        Logger.log('CardController: Data service initialized');
      } else {
        Logger.log('CardController: Card feature flag not available');
      }
    } catch (error) {
      Logger.log('CardController: Failed to initialize data service:', error);
    }
  }

  /**
   * Register action handlers for this controller
   */
  #registerActionHandlers(): void {
    this.messagingSystem.registerActionHandler(
      'CardController:getAccountState',
      this.getAccountState.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:isCardholder',
      this.isCardholder.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:isAuthenticated',
      this.isAuthenticated.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getIsCardholder',
      this.getIsCardholder.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getIsAuthenticated',
      this.getIsAuthenticated.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getPriorityToken',
      this.getPriorityToken.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getSupportedTokensAllowances',
      this.getSupportedTokensAllowances.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getCardDetails',
      async (params) => {
        const result = await this.getCardDetails(params);
        return result ? JSON.stringify(result) : null;
      },
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getExternalWalletDetails',
      async (params) => {
        const result = await this.getExternalWalletDetails(params);
        return result ? JSON.stringify(result) : null;
      },
    );
    this.messagingSystem.registerActionHandler(
      'CardController:checkCardholder',
      this.checkCardholder.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getGeoLocation',
      this.getGeoLocation.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:initiateLogin',
      this.initiateLogin.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:authenticate',
      this.authenticate.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:authorize',
      this.authorize.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:exchangeToken',
      this.exchangeToken.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:refreshToken',
      this.refreshToken.bind(this),
    );
    this.messagingSystem.registerActionHandler('CardController:logout', () =>
      this.logout(),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:setActiveAccount',
      this.setActiveAccount.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:isFeatureEnabled',
      this.isFeatureEnabled.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:isBaanxLoginEnabled',
      this.isBaanxLoginEnabled.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:getSupportedTokens',
      this.getSupportedTokens.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'CardController:resetState',
      this.resetState.bind(this),
    );
  }

  /**
   * Reset controller state to default
   */
  resetState(): void {
    this.update(() => getCardControllerDefaultState());
  }

  /**
   * Get account state for a given address
   */
  getAccountState(address: string): CardAccountState | null {
    return this.state.accounts[address] || null;
  }

  /**
   * Check if an address is a cardholder (per-wallet on-chain data)
   */
  isCardholder(address: string): boolean {
    const accountState = this.getAccountState(address);
    return accountState?.isCardholder ?? false;
  }

  /**
   * Check if the user is authenticated (global authentication state)
   */
  isAuthenticated(): boolean {
    return this.state.global.isAuthenticated;
  }

  /**
   * Get cardholder status for an address (same as isCardholder)
   */
  getIsCardholder(address: string): boolean {
    return this.isCardholder(address);
  }

  /**
   * Get authentication status (same as isAuthenticated)
   */
  getIsAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Check if the Card feature is enabled
   */
  isFeatureEnabled(): boolean {
    return this.state.global.isFeatureEnabled;
  }

  /**
   * Check if Baanx login is enabled
   */
  isBaanxLoginEnabled(): boolean {
    return this.state.global.isBaanxLoginEnabled;
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): SupportedToken[] {
    return this.#dataService?.supportedTokens ?? [];
  }

  /**
   * Set the active account
   */
  setActiveAccount(address: string | null): void {
    this.update((state) => {
      state.activeAccount = address;
    });
  }

  /**
   * Create or update account state
   */
  #ensureAccountState(address: string): void {
    if (!this.state.accounts[address]) {
      this.update((state) => {
        state.accounts[address] = {
          address,
          isCardholder: false,
          cardholderLastChecked: null,
          priorityToken: null,
          priorityTokenLastFetched: null,
          cardDetailsJson: null,
          cardDetailsLastFetched: null,
          externalWalletDetailsJson: null,
          externalWalletDetailsLastFetched: null,
          supportedTokensAllowancesJson: null,
          supportedTokensAllowancesLastFetched: null,
          needsProvisioning: false,
        };
      });
    }
  }

  /**
   * Check cardholder status for multiple accounts
   */
  async checkCardholder(params: CheckCardholderParams): Promise<string[]> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    const { accounts, forceRefresh = false } = params;

    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cached = this.state.global.cardholderAccountsLastFetched;
      if (cached && Date.now() - cached < CARDHOLDER_CACHE_THRESHOLD_MS) {
        return this.state.global.cardholderAccounts;
      }
    }

    try {
      const cardholderAccounts = await this.#dataService.checkCardholder(
        params,
      );

      // Update cache
      this.update((state) => {
        state.global.cardholderAccounts = cardholderAccounts;
        state.global.cardholderAccountsLastFetched = Date.now();
      });

      // Update cardholder status for all affected accounts
      accounts.forEach((account) => {
        const address = account.split(':')[2]; // Extract address from CAIP format
        if (address) {
          this.#ensureAccountState(address);

          const isCardholder = cardholderAccounts.includes(account);
          const currentIsCardholder = this.isCardholder(address);

          if (currentIsCardholder !== isCardholder) {
            this.update((state) => {
              state.accounts[address].isCardholder = isCardholder;
              state.accounts[address].cardholderLastChecked = Date.now();
            });

            Logger.log(
              'CardController: Updated cardholder status in checkCardholder',
              {
                address,
                isCardholder,
                previousValue: currentIsCardholder,
              },
            );

            // Emit cardholder changed event
            this.messagingSystem.publish('CardController:cardholderChanged', {
              address,
              isCardholder,
            });
          }
        }
      });

      // Emit event
      this.messagingSystem.publish('CardController:cardholderStatusUpdated', {
        accounts: accounts
          .map((account) => account.split(':')[2])
          .filter(Boolean),
        cardholderAccounts: cardholderAccounts
          .map((account) => account.split(':')[2])
          .filter(Boolean),
      });

      return cardholderAccounts;
    } catch (error) {
      Logger.log('CardController: Failed to check cardholder status:', error);
      throw error;
    }
  }

  /**
   * Get geolocation
   */
  async getGeoLocation(params: GetGeoLocationParams): Promise<string> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    const { forceRefresh = false } = params;

    return await wrapWithCache({
      key: 'geolocation',
      ttl: GEOLOCATION_CACHE_THRESHOLD_MS,
      readCache: () => {
        if (
          !forceRefresh &&
          this.state.global.geoLocation &&
          this.state.global.geoLocationLastFetched
        ) {
          return {
            payload: this.state.global.geoLocation,
            lastFetched: this.state.global.geoLocationLastFetched,
          };
        }
        return undefined;
      },
      fetchFresh: async () => {
        Logger.log('CardController: Fetching fresh geolocation data');
        if (!this.#dataService) {
          throw new Error('Card data service not initialized');
        }
        return await this.#dataService.getGeoLocation(params);
      },
      writeCache: (_key, payload) => {
        this.update((state) => {
          state.global.geoLocation = payload;
          state.global.geoLocationLastFetched = Date.now();
        });
      },
    });
  }

  /**
   * Get priority token for an address
   */
  async getPriorityToken(
    params: GetPriorityTokenParams,
  ): Promise<CardTokenAllowanceState | null> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    const { address, forceRefresh = false } = params;
    this.#ensureAccountState(address);

    return await wrapWithCache({
      key: `priorityToken:${address}`,
      ttl: PRIORITY_TOKEN_CACHE_THRESHOLD_MS,
      readCache: () => {
        const accountState = this.state.accounts[address];
        if (
          !forceRefresh &&
          accountState?.priorityToken !== undefined &&
          accountState?.priorityTokenLastFetched
        ) {
          return {
            payload: accountState.priorityToken,
            lastFetched: accountState.priorityTokenLastFetched,
          };
        }
        return undefined;
      },
      fetchFresh: async () => {
        if (!this.#dataService) {
          throw new Error('Card data service not initialized');
        }

        const isAuthenticated = this.state.global.isAuthenticated;

        if (isAuthenticated) {
          // Authenticated: Get priority token from API via external wallet details
          Logger.log(
            'CardController: Fetching priority token from API (authenticated user)',
            { address },
          );

          const externalWalletDetails =
            await this.#dataService.getExternalWalletDetails({});

          if (!externalWalletDetails || externalWalletDetails.length === 0) {
            Logger.log('CardController: No external wallet details found', {
              address,
            });
            return null;
          }

          // Find the wallet detail with the highest priority for this address
          const addressWallets = externalWalletDetails.filter(
            (wallet) =>
              wallet.walletAddress?.toLowerCase() === address.toLowerCase(),
          );

          if (addressWallets.length === 0) {
            Logger.log('CardController: No wallet details found for address', {
              address,
            });
            return null;
          }

          const priorityWallet = addressWallets.reduce((highest, current) =>
            current.priority > highest.priority ? current : highest,
          );

          if (!priorityWallet || priorityWallet.priority === 0) {
            Logger.log(
              'CardController: No priority wallet found in external wallet details',
              { address },
            );
            return null;
          }

          Logger.log('CardController: Found priority wallet from API', {
            address,
            tokenAddress: priorityWallet.address,
            priority: priorityWallet.priority,
          });

          // Get token metadata from supported tokens
          const supportedTokens = this.#dataService.supportedTokens;
          const tokenMetadata = supportedTokens.find(
            (token) =>
              token.address?.toLowerCase() ===
              priorityWallet.address.toLowerCase(),
          );

          return {
            allowanceState: 'enabled',
            allowance: priorityWallet.allowance || '0',
            address: priorityWallet.address,
            decimals: tokenMetadata?.decimals || null,
            symbol: tokenMetadata?.symbol || priorityWallet.currency || null,
            name: tokenMetadata?.name || null,
          } as CardTokenAllowanceState;
        }

        // Not authenticated: Get priority token on-chain
        Logger.log(
          'CardController: Fetching priority token on-chain (non-authenticated user)',
          { address },
        );

        const token = await this.#dataService.getPriorityToken(params);

        if (!token) {
          Logger.log('CardController: No on-chain priority token found', {
            address,
          });
          return null;
        }

        Logger.log(
          'CardController: Successfully fetched on-chain priority token, marking as cardholder',
          {
            address,
            tokenAddress: token.address,
          },
        );

        return {
          allowanceState: 'enabled',
          allowance: '0',
          address: token.address,
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
        } as CardTokenAllowanceState;
      },
      writeCache: (_key, payload) => {
        const wasCardholder =
          this.state.accounts[address]?.isCardholder || false;

        this.update((state) => {
          state.accounts[address].priorityToken = payload;
          state.accounts[address].priorityTokenLastFetched = Date.now();

          // Successfully getting priority token means cardholder (both on-chain and API)
          if (payload) {
            state.accounts[address].isCardholder = true;
            state.accounts[address].cardholderLastChecked = Date.now();
          }
        });

        // Emit cardholder changed event if status updated
        if (payload && !wasCardholder) {
          Logger.log(
            'CardController: Updated cardholder status after successful priority token fetch',
            {
              address,
              isCardholder: true,
              wasAuthenticated: this.state.global.isAuthenticated,
              fetchSource: this.state.global.isAuthenticated
                ? 'API'
                : 'on-chain',
              previousValue: wasCardholder,
            },
          );

          this.messagingSystem.publish('CardController:cardholderChanged', {
            address,
            isCardholder: true,
          });
        }

        // Emit priority token event
        this.messagingSystem.publish('CardController:priorityTokenUpdated', {
          address,
          tokenAddress: payload?.address || null,
          tokenSymbol: payload?.symbol || null,
        });
      },
    });
  }

  /**
   * Get supported tokens allowances
   */
  async getSupportedTokensAllowances(
    params: GetSupportedTokensAllowancesParams,
  ): Promise<
    {
      address: string;
      usAllowance: string;
      globalAllowance: string;
    }[]
  > {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    const { address, forceRefresh = false } = params;
    this.#ensureAccountState(address);

    return await wrapWithCache({
      key: `supportedTokensAllowances:${address}`,
      ttl: SUPPORTED_TOKENS_ALLOWANCES_CACHE_THRESHOLD_MS,
      readCache: () => {
        const accountState = this.state.accounts[address];
        if (
          !forceRefresh &&
          accountState?.supportedTokensAllowancesJson &&
          accountState?.supportedTokensAllowancesLastFetched
        ) {
          return {
            payload: JSON.parse(accountState.supportedTokensAllowancesJson),
            lastFetched: accountState.supportedTokensAllowancesLastFetched,
          };
        }
        return undefined;
      },
      fetchFresh: async () => {
        Logger.log(
          'CardController: Fetching fresh supported tokens allowances for',
          address,
        );
        if (!this.#dataService) {
          throw new Error('Card data service not initialized');
        }
        return await this.#dataService.getSupportedTokensAllowances(params);
      },
      writeCache: (_key, payload) => {
        this.update((state) => {
          state.accounts[address].supportedTokensAllowancesJson = payload
            ? JSON.stringify(payload)
            : null;
          state.accounts[address].supportedTokensAllowancesLastFetched =
            Date.now();
        });
      },
    });
  }

  /**
   * Get card details (requires authentication)
   */
  async getCardDetails(
    params: GetCardDetailsParams,
  ): Promise<CardDetailsResponse | null> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    const { forceRefresh = false } = params;
    const activeAddress = this.state.activeAccount;

    if (!activeAddress) {
      throw new Error('No active account set');
    }

    this.#ensureAccountState(activeAddress);

    return await wrapWithCache({
      key: `cardDetails:${activeAddress}`,
      ttl: CARD_DETAILS_CACHE_THRESHOLD_MS,
      readCache: () => {
        const accountState = this.state.accounts[activeAddress];
        if (
          !forceRefresh &&
          accountState?.cardDetailsJson &&
          accountState?.cardDetailsLastFetched
        ) {
          return {
            payload: JSON.parse(accountState.cardDetailsJson),
            lastFetched: accountState.cardDetailsLastFetched,
          };
        }
        return undefined;
      },
      fetchFresh: async () => {
        Logger.log(
          'CardController: Fetching fresh card details for',
          activeAddress,
        );
        try {
          if (!this.#dataService) {
            throw new Error('Card data service not initialized');
          }
          return await this.#dataService.getCardDetails(params);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('User has no card')
          ) {
            // Handle case where user needs card provisioning
            this.update((state) => {
              state.accounts[activeAddress].needsProvisioning = true;
            });
            return null;
          }
          throw error;
        }
      },
      writeCache: (_key, payload) => {
        this.update((state) => {
          state.accounts[activeAddress].cardDetailsJson = payload
            ? JSON.stringify(payload)
            : null;
          state.accounts[activeAddress].cardDetailsLastFetched = Date.now();
          state.accounts[activeAddress].needsProvisioning = payload === null;
        });

        // Emit event
        this.messagingSystem.publish('CardController:cardDetailsUpdated', {
          address: activeAddress,
          cardDetailsJson: payload ? JSON.stringify(payload) : null,
          needsProvisioning: payload === null,
        });
      },
    });
  }

  /**
   * Get external wallet details (requires authentication)
   */
  async getExternalWalletDetails(
    params: GetExternalWalletDetailsParams,
  ): Promise<CardExternalWalletDetailsResponse | null> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    const { forceRefresh = false } = params;
    const activeAddress = this.state.activeAccount;

    if (!activeAddress) {
      throw new Error('No active account set');
    }

    this.#ensureAccountState(activeAddress);

    return await wrapWithCache({
      key: `externalWalletDetails:${activeAddress}`,
      ttl: EXTERNAL_WALLET_CACHE_THRESHOLD_MS,
      readCache: () => {
        const accountState = this.state.accounts[activeAddress];
        if (
          !forceRefresh &&
          accountState?.externalWalletDetailsJson &&
          accountState?.externalWalletDetailsLastFetched
        ) {
          return {
            payload: JSON.parse(accountState.externalWalletDetailsJson),
            lastFetched: accountState.externalWalletDetailsLastFetched,
          };
        }
        return undefined;
      },
      fetchFresh: async () => {
        Logger.log(
          'CardController: Fetching fresh external wallet details for',
          activeAddress,
        );
        if (!this.#dataService) {
          throw new Error('Card data service not initialized');
        }
        return await this.#dataService.getExternalWalletDetails(params);
      },
      writeCache: (_key, payload) => {
        this.update((state) => {
          state.accounts[activeAddress].externalWalletDetailsJson = payload
            ? JSON.stringify(payload)
            : null;
          state.accounts[activeAddress].externalWalletDetailsLastFetched =
            Date.now();
        });
      },
    });
  }

  /**
   * Initiate login process
   */
  async initiateLogin(
    params: InitiateLoginParams,
  ): Promise<CardLoginInitiateResponse> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    try {
      return await this.#dataService.initiateLogin(params);
    } catch (error) {
      Logger.log('CardController: Failed to initiate login:', error);
      this.#setLastError(
        error instanceof Error ? error.message : 'Failed to initiate login',
      );
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticate(params: AuthenticateParams): Promise<CardLoginResponse> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    try {
      return await this.#dataService.authenticate(params);
    } catch (error) {
      Logger.log('CardController: Failed to authenticate:', error);
      this.#setLastError(
        error instanceof Error ? error.message : 'Authentication failed',
      );
      throw error;
    }
  }

  /**
   * Authorize user after login
   */
  async authorize(params: AuthorizeParams): Promise<CardAuthorizeResponse> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    try {
      return await this.#dataService.authorize(params);
    } catch (error) {
      Logger.log('CardController: Failed to authorize:', error);
      this.#setLastError(
        error instanceof Error ? error.message : 'Authorization failed',
      );
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(
    params: ExchangeTokenParams,
  ): Promise<CardExchangeTokenResponse> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    try {
      const tokenResponse = await this.#dataService.exchangeToken(params);

      // Store token and update authentication state
      await this.#storeTokenAndUpdateAuthState(tokenResponse, params.location);

      return tokenResponse;
    } catch (error) {
      Logger.log('CardController: Failed to exchange token:', error);
      this.#setLastError(
        error instanceof Error ? error.message : 'Token exchange failed',
      );
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    params: RefreshTokenParams,
  ): Promise<CardExchangeTokenResponse> {
    if (!this.#dataService) {
      throw new Error('Card data service not initialized');
    }

    try {
      const tokenResponse = await this.#dataService.refreshToken(params);

      // Store token and update authentication state
      await this.#storeTokenAndUpdateAuthState(tokenResponse, params.location);

      return tokenResponse;
    } catch (error) {
      Logger.log('CardController: Failed to refresh token:', error);
      this.#setLastError(
        error instanceof Error ? error.message : 'Token refresh failed',
      );
      throw error;
    }
  }

  /**
   * Store token and update authentication state
   */
  async #storeTokenAndUpdateAuthState(
    tokenResponse: CardExchangeTokenResponse,
    location: 'us' | 'international',
  ): Promise<void> {
    const tokenData: CardTokenData = {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresAt: Date.now() + tokenResponse.expiresIn * 1000,
      location,
      tokenType: tokenResponse.tokenType,
      expiresIn: tokenResponse.expiresIn,
      refreshTokenExpiresIn: tokenResponse.refreshTokenExpiresIn,
    };

    Logger.log('CardController: Storing token and updating auth state', {
      location,
      activeAccount: this.state.activeAccount,
      hasAccessToken: !!tokenResponse.accessToken,
    });

    await storeCardBaanxToken(tokenData);

    // Update global authentication state
    this.update((state) => {
      state.global.isAuthenticated = true;
      state.global.userLocation = location;
      state.global.authTokenJson = JSON.stringify(tokenData);
      state.global.authTokenExpiresAt = tokenData.expiresAt;
    });

    const activeAddress = this.state.activeAccount;
    if (activeAddress) {
      // Ensure the active account is marked as a cardholder (authentication implies cardholder status)
      this.#ensureAccountState(activeAddress);
      this.update((state) => {
        state.accounts[activeAddress].isCardholder = true;
        state.accounts[activeAddress].cardholderLastChecked = Date.now();
      });

      Logger.log('CardController: Authentication state updated', {
        activeAddress,
        isAuthenticated: this.isAuthenticated(),
        isCardholder: this.isCardholder(activeAddress),
      });

      // Emit cardholder changed event
      this.messagingSystem.publish('CardController:cardholderChanged', {
        address: activeAddress,
        isCardholder: true,
      });

      // Also emit cardholder status update since we updated it
      this.messagingSystem.publish('CardController:cardholderStatusUpdated', {
        accounts: [activeAddress],
        cardholderAccounts: [activeAddress], // User is now confirmed as cardholder
      });
    }

    // Emit global authentication event
    this.messagingSystem.publish('CardController:authenticationChanged', {
      isAuthenticated: true,
      userLocation: location,
    });

    Logger.log('CardController: Global authentication state updated');
  }

  /**
   * Logout user and clear authentication state
   */
  async logout(): Promise<void> {
    try {
      // Remove stored token
      await removeCardBaanxToken();

      // Clear global authentication state
      this.update((state) => {
        state.global.isAuthenticated = false;
        state.global.userLocation = null;
        state.global.authTokenJson = null;
        state.global.authTokenExpiresAt = null;
      });

      // Clear cached authentication-required data for all accounts
      Object.keys(this.state.accounts).forEach((address) => {
        this.update((state) => {
          // Clear cached data that requires authentication
          state.accounts[address].cardDetailsJson = null;
          state.accounts[address].cardDetailsLastFetched = null;
          state.accounts[address].externalWalletDetailsJson = null;
          state.accounts[address].externalWalletDetailsLastFetched = null;
        });
      });

      // Emit global authentication event
      this.messagingSystem.publish('CardController:authenticationChanged', {
        isAuthenticated: false,
        userLocation: null,
      });

      Logger.log('CardController: Logout completed');
    } catch (error) {
      Logger.log('CardController: Failed to logout:', error);
      throw error;
    }
  }

  /**
   * Set the last error state
   */
  #setLastError(error: string): void {
    this.update((state) => {
      state.lastError = error;
    });

    // Emit error event
    this.messagingSystem.publish('CardController:errorOccurred', {
      error,
    });
  }

  /**
   * Clear the last error state
   */
  clearLastError(): void {
    this.update((state) => {
      state.lastError = null;
    });
  }
}
export { getCardControllerDefaultState };
