import { BaseController, type StateMetadata } from '@metamask/base-controller';
import { numberToHex, type Hex, type Json } from '@metamask/utils';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import type { RootState } from '../../../../reducers';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../selectors/featureFlagController/gasFeesSponsored';
import {
  CARD_CONTROLLER_NAME,
  DEFAULT_CARD_PROVIDER_ID,
  type CardUnauthenticatedReason,
  type CardControllerMessenger,
  type CardControllerState,
} from './types';
import type { CardLocation } from '../../../../components/UI/Card/types';
import {
  CardLinkageInProgressError,
  CardProviderError,
  CardProviderErrorCode,
  CardStatus,
  emptyCardHomeData,
  type CardAuthSession,
  type CardAuthResult,
  type CardAuthStep,
  type CardAuthTokens,
  type CardCredentials,
  type CardContactDetails,
  type CardCreateResult,
  type CardDetails,
  type CardFundingAsset,
  type CardFundingSourceResult,
  type CardHomeData,
  type CardProviderCapabilities,
  type CardSecureView,
  type CardSecureViewParams,
  type CardSensitiveDetails,
  type CardSpendingPrerequisitesParams,
  type CardSpendingPrerequisitesResult,
  type CashbackWalletResponse,
  type CashbackWithdrawEstimationResponse,
  type CashbackWithdrawParams,
  type CashbackWithdrawResponse,
  type CreditWalletResponse,
  type CreditWithdrawEstimationResponse,
  type CreditWithdrawParams,
  type CreditWithdrawResponse,
  type DelegationChallengeResponse,
  type FundingApprovalParams,
  type ICardProvider,
  isCardAuthTokenError,
} from './provider-types';
import { CardTokenStore } from './CardTokenStore';
import { CardOnboardingStore } from './CardOnboardingStore';
import { resetCardState } from '../../../redux/slices/card';
import { isEthAccount } from '../../../Multichain/utils';
import { pickPrimaryFromReordered, reorderAssets } from './utils/assetPriority';
import { encodeErc20ApproveCalldata } from './utils/encodeErc20ApproveCalldata';
import {
  awaitTransactionConfirmed,
  type AwaitTransactionConfirmedMessenger,
} from './utils/awaitTransactionConfirmed';
import { resolveMoneyAccountCardToken } from './utils/moneyAccountCardToken';
import {
  MONEY_ACCOUNT_DELEGATION_NETWORK,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../../../../components/UI/Card/util/vedaToken';
import { safeToChecksumAddress } from '../../../../util/address';
import { toTokenMinimalUnit } from '../../../../util/number/bigint';
import TransactionTypes from '../../../../core/TransactionTypes';
import {
  resolveCardFeatureFlag,
  type CardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import {
  deriveCountryProviderMap,
  getProviderForCountry,
} from './provider-map';

const CARDHOLDER_BATCH_SIZE = 50;
const CARDHOLDER_MAX_BATCHES = 3;

const metadata: StateMetadata<CardControllerState> = {
  selectedCountry: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  activeProviderId: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  isAuthenticated: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  lastUnauthenticatedReason: {
    persist: false,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  cardholderAccounts: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  providerData: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  cardHomeData: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  cardHomeDataStatus: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
  moneyAccountCardLinkInProgress: {
    persist: false,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: true,
  },
};

export const defaultCardControllerState: CardControllerState = {
  selectedCountry: null,
  activeProviderId: DEFAULT_CARD_PROVIDER_ID,
  isAuthenticated: false,
  lastUnauthenticatedReason: null,
  cardholderAccounts: [],
  providerData: {},
  cardHomeData: null,
  cardHomeDataStatus: 'idle',
  moneyAccountCardLinkInProgress: false,
};

/**
 * CardController manages the MetaMask Card feature state.
 *
 * This is a thin coordination layer that will eventually delegate
 * to provider implementations. For now it owns the persisted state
 * (country, provider, auth status) and syncs it to Redux via the
 * standard Engine batcher.
 */
export class CardController extends BaseController<
  typeof CARD_CONTROLLER_NAME,
  CardControllerState,
  CardControllerMessenger
> {
  private readonly providers: Record<string, ICardProvider>;
  private currentSession: CardAuthSession | null = null;
  private refreshPromise: Promise<CardAuthTokens | null> | null = null;
  #cardholderCheckTimer: ReturnType<typeof setTimeout> | undefined;
  private fetchCardHomeDataPromise: Promise<void> | null = null;
  private fetchGeneration = 0;
  private previousEvmAddress: string | null = null;
  private resetInProgress = false;

  constructor({
    messenger,
    state,
    providers,
  }: {
    messenger: CardControllerMessenger;
    state?: Partial<CardControllerState>;
    providers: Record<string, ICardProvider>;
  }) {
    super({
      name: CARD_CONTROLLER_NAME,
      messenger,
      metadata,
      state: {
        ...defaultCardControllerState,
        ...state,
      },
    });
    this.providers = providers;
    this.#subscribeToEvents();
  }

  #subscribeToEvents(): void {
    this.messenger.subscribe('KeyringController:unlock', () => {
      if (this.resetInProgress) return;
      this.#triggerCardholderCheck();
      this.validateAndRefreshSession().catch((error) =>
        Logger.error(error as Error, {
          tags: { feature: 'card' },
          context: { name: 'CardController', data: { method: '#onUnlock' } },
        }),
      );
    });

    // Re-check when the account tree changes (account added/removed).
    // The selector traverses all wallet→group→account IDs so the handler fires
    // for both new wallets and new accounts added within an existing wallet.
    this.messenger.subscribe(
      'AccountTreeController:stateChange',
      (_key: string) => {
        if (this.resetInProgress) return;
        this.#triggerCardholderCheck();
        this.#handleAccountSwitch();
      },
      (state) =>
        Object.values(state.accountTree?.wallets ?? {})
          .flatMap((wallet) =>
            Object.values(wallet.groups ?? {}).flatMap(
              (group) => group.accounts ?? [],
            ),
          )
          .sort()
          .join(','),
    );

    this.messenger.subscribe(
      'RemoteFeatureFlagController:stateChange',
      (_cardFeatureKey: string) => {
        if (this.resetInProgress) return;
        this.#handleCardFeatureFlagChange();
      },
      (state) => JSON.stringify(state.remoteFeatureFlags?.cardFeature ?? {}),
    );
  }

  #fetchCardHomeDataWithLogging(method: string): void {
    this.fetchCardHomeData().catch((error) =>
      Logger.error(error as Error, {
        tags: { feature: 'card' },
        context: {
          name: 'CardController',
          data: { method },
        },
      }),
    );
  }

  #handleAccountSwitch(): void {
    const currentAddress = this.#getSelectedEvmAddress();

    if (currentAddress !== this.previousEvmAddress) {
      this.previousEvmAddress = currentAddress;
      this.invalidateFetch();
      this.update((s) => {
        s.cardHomeData = null;
        s.cardHomeDataStatus = 'idle';
      });
      this.#fetchCardHomeDataWithLogging('#handleAccountSwitch');
    }
  }

  #handleCardFeatureFlagChange(): void {
    const currentAddress = this.#getSelectedEvmAddress();
    if (!currentAddress) return;

    this.invalidateFetch();
    this.update((s) => {
      s.cardHomeData = null;
      s.cardHomeDataStatus = 'idle';
    });
    this.#fetchCardHomeDataWithLogging('#handleCardFeatureFlagChange');
  }

  #triggerCardholderCheck(): void {
    // Debounce: coalesce rapid consecutive triggers (e.g. KeyringController:unlock
    // and AccountTreeController:stateChange both fire on wallet unlock) into a
    // single API call. The account list is sampled inside the callback so it
    // always reflects the latest state.
    if (this.#cardholderCheckTimer !== undefined) {
      clearTimeout(this.#cardholderCheckTimer);
    }
    this.#cardholderCheckTimer = setTimeout(() => {
      this.#cardholderCheckTimer = undefined;

      const { internalAccounts } = this.messenger.call(
        'AccountsController:getState',
      );
      const evmAccounts = Object.values(internalAccounts.accounts).filter(
        (acc) => isEthAccount(acc),
      );
      if (!evmAccounts.length) return;

      const caipAccountIds = evmAccounts.map(
        (acc) => `eip155:0:${acc.address}` as `${string}:${string}:${string}`,
      );

      const featureState = this.messenger.call(
        'RemoteFeatureFlagController:getState',
      );
      const cardFeature = resolveCardFeatureFlag(
        featureState.remoteFeatureFlags?.cardFeature as
          | CardFeatureFlag
          | undefined,
      );
      const accountsApiUrl = cardFeature?.constants?.accountsApiUrl;
      if (!accountsApiUrl) return;

      this.checkCardholderAccounts(caipAccountIds, accountsApiUrl).catch(
        (error) =>
          Logger.error(error as Error, {
            tags: { feature: 'card' },
            context: {
              name: 'CardController',
              data: { method: '#triggerCardholderCheck' },
            },
          }),
      );
    }, 50);
  }

  /**
   * Records the user's pre-authentication location selection.
   * Written to providerData[activeProviderId].location — the same field
   * selectCardUserLocation reads, validateAndRefreshSession() overwrites
   * from tokens on unlock, and logout() clears.
   */
  setUserLocation(location: CardLocation): void {
    const pid = this.state.activeProviderId;
    if (!pid) return;
    this.update((s) => {
      (s.providerData as unknown as Record<string, Record<string, string>>)[
        pid
      ] = {
        ...((
          s.providerData as unknown as Record<string, Record<string, string>>
        )[pid] ?? {}),
        location,
      };
    });
  }

  setSelectedCountry(country: string): void {
    const providerId = this.#resolveProviderForCountry(country);
    const providerChanged =
      Boolean(providerId) && providerId !== this.state.activeProviderId;

    this.update((s) => {
      s.selectedCountry = country;
      if (providerId) {
        s.activeProviderId = providerId;
      }
      if (providerChanged) {
        s.cardHomeData = null;
        s.cardHomeDataStatus = 'idle';
      }
    });

    if (providerChanged) {
      this.invalidateFetch();
    }
  }

  #resolveProviderForCountry(country: string): string {
    const featureState = this.messenger.call(
      'RemoteFeatureFlagController:getState',
    );

    const cardFeature = resolveCardFeatureFlag(
      featureState.remoteFeatureFlags?.cardFeature as
        | CardFeatureFlag
        | undefined,
    );

    if (cardFeature.immersve?.enabled) {
      const immersveCountries = cardFeature.immersveCountries ?? [];
      const map = deriveCountryProviderMap(
        Object.fromEntries(
          immersveCountries.map((c) => [c, true] as [string, boolean]),
        ),
        'immersve',
      );
      const provider = getProviderForCountry(country, map);
      if (provider) {
        return provider;
      }
    }

    return DEFAULT_CARD_PROVIDER_ID;
  }

  /**
   * Checks which CAIP-10 account IDs are MetaMask Card holders and stores
   * the result in controller state. Processes up to 150 accounts (3 × 50).
   * Public for testability.
   */
  async checkCardholderAccounts(
    caipAccountIds: `${string}:${string}:${string}`[],
    accountsApiUrl: string,
  ): Promise<void> {
    if (!caipAccountIds?.length || !accountsApiUrl) return;

    const batches = this.#createBatches(
      caipAccountIds,
      CARDHOLDER_BATCH_SIZE,
      CARDHOLDER_MAX_BATCHES,
    );

    const settled = await Promise.allSettled(
      batches.map((batch) => this.#fetchCardholderBatch(batch, accountsApiUrl)),
    );

    const results: string[] = [];
    let anySucceeded = false;
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        anySucceeded = true;
        results.push(...outcome.value);
      } else {
        Logger.error(outcome.reason as Error, {
          tags: { feature: 'card', operation: 'checkCardholderAccounts' },
          context: {
            name: 'CardController',
            data: { accountCount: caipAccountIds.length },
          },
        });
      }
    }

    // Only update state if at least one batch succeeded. A total failure
    // (e.g. network outage) should leave the existing cached list intact.
    if (anySucceeded) {
      this.update((s) => {
        s.cardholderAccounts = results;
      });
    }
  }

  async #fetchCardholderBatch(
    accountIds: string[],
    accountsApiUrl: string,
  ): Promise<string[]> {
    const url = new URL('v1/metadata', accountsApiUrl);
    url.searchParams.set('accountIds', accountIds.join(',').toLowerCase());
    url.searchParams.set('label', 'card_user');
    const response = await fetch(url.toString());
    if (!response.ok)
      throw new Error(`Cardholder API error: ${response.status}`);
    const data = await response.json();
    return (data.is as string[]) ?? [];
  }

  #createBatches<T>(items: T[], size: number, maxBatches: number): T[][] {
    const batches: T[][] = [];
    for (
      let i = 0;
      i < items.length && batches.length < maxBatches;
      i += size
    ) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }

  private getActiveProvider(): ICardProvider {
    const pid = this.state.activeProviderId;
    const provider = pid ? this.providers[pid] : undefined;
    if (!provider) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        `No active provider: ${pid}`,
      );
    }
    return provider;
  }

  private markUnauthenticated(
    reason: CardUnauthenticatedReason | null = null,
  ): void {
    this.update((s) => {
      s.isAuthenticated = false;
      s.lastUnauthenticatedReason = reason;
    });
  }

  clearLastUnauthenticatedReason(): void {
    if (!this.state.lastUnauthenticatedReason) return;

    this.update((s) => {
      s.lastUnauthenticatedReason = null;
    });
  }

  // -- cardHomeData fetch --

  /**
   * Fetches card home data for the currently selected EVM account and stores
   * it in controller state. Concurrent callers share the same in-flight
   * request (same ??= pattern as refreshPromise). A generation counter
   * ensures stale responses (from a previous account or session) are dropped.
   */
  async fetchCardHomeData(): Promise<void> {
    this.fetchCardHomeDataPromise ??= this.#doFetchCardHomeData(
      this.fetchGeneration,
    ).finally(() => {
      this.fetchCardHomeDataPromise = null;
    });
    return this.fetchCardHomeDataPromise;
  }

  async #doFetchCardHomeData(generation: number): Promise<void> {
    const address = this.#getSelectedEvmAddress();
    if (!address) return;

    this.update((s) => {
      s.cardHomeDataStatus = 'loading';
    });
    try {
      const data = await this.getCardHomeData(address);
      if (generation === this.fetchGeneration) {
        this.update((s) => {
          (s as unknown as CardControllerState).cardHomeData =
            data as unknown as Record<string, Json>;
          s.cardHomeDataStatus = 'success';
        });
      }
    } catch (error) {
      if (generation === this.fetchGeneration) {
        Logger.error(error as Error, {
          tags: { feature: 'card' },
          context: {
            name: 'CardController',
            data: { method: 'fetchCardHomeData' },
          },
        });
        this.update((s) => {
          s.cardHomeDataStatus = 'error';
        });
      }
    }
  }

  /**
   * Increments the generation counter (dropping any in-flight response) and
   * clears the deduplication promise so the next fetchCardHomeData() starts
   * a fresh request. Call this before logout or account-switch state clears.
   */
  private invalidateFetch(): void {
    this.fetchGeneration++;
    this.fetchCardHomeDataPromise = null;
  }

  #getSelectedEvmAddress(): string | null {
    const { internalAccounts } = this.messenger.call(
      'AccountsController:getState',
    );
    const selected =
      internalAccounts.accounts[internalAccounts.selectedAccount];
    if (!selected || !isEthAccount(selected)) return null;
    return selected.address;
  }

  private async clearTokens(): Promise<void> {
    const pid = this.state.activeProviderId;
    if (pid) {
      await CardTokenStore.remove(pid);
    }
  }

  async initiateAuth(country: string, address?: string): Promise<void> {
    this.currentSession = await this.getActiveProvider().initiateAuth(
      country,
      address ? { address } : undefined,
    );
  }

  getCurrentAuthStep(): CardAuthStep | null {
    return this.currentSession?.currentStep ?? null;
  }

  async submitCredentials(
    credentials: CardCredentials,
  ): Promise<CardAuthResult> {
    if (!this.currentSession) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'submitCredentials: no active auth session',
      );
    }

    const provider = this.getActiveProvider();
    const pid = this.state.activeProviderId as string;
    const result = await provider.submitCredentials(
      this.currentSession,
      credentials,
    );

    if (result.nextStep) {
      this.currentSession = {
        ...this.currentSession,
        currentStep: result.nextStep,
      };
    } else {
      this.currentSession = null;
    }

    if (result.done && result.tokenSet) {
      const { tokenSet } = result;
      const stored = await CardTokenStore.set(pid, tokenSet);
      if (!stored) {
        Logger.error(new Error('Token store write failed after auth'), {
          tags: { feature: 'card', provider: pid },
          context: {
            name: 'CardController',
            data: { method: 'submitCredentials' },
          },
        });
      }
      this.update((s) => {
        s.isAuthenticated = true;
        s.lastUnauthenticatedReason = null;
        s.cardHomeData = null;
        s.cardHomeDataStatus = 'idle';
        (s.providerData as unknown as Record<string, Record<string, string>>)[
          pid
        ] = { location: tokenSet.location };
      });
      this.invalidateFetch();
      this.#fetchCardHomeDataWithLogging('submitCredentials/fetchCardHomeData');
    }

    return result;
  }

  async executeStepAction(): Promise<void> {
    if (!this.currentSession) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'executeStepAction: no active auth session',
      );
    }
    const provider = this.getActiveProvider();
    await provider.executeStepAction?.(this.currentSession);
  }

  async logout(): Promise<void> {
    const pid = this.state.activeProviderId;
    if (!pid) return;
    const tokens = await CardTokenStore.get(pid);

    if (tokens) {
      try {
        await this.getActiveProvider().logout(tokens);
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'card', provider: pid },
          context: { name: 'CardController', data: { method: 'logout' } },
        });
      }
    }

    await this.#clearLocalSession();
  }

  /**
   * Local session teardown shared by logout() and #handleSessionExpired().
   * Clears stored tokens, drops in-flight fetches, and resets auth state.
   * Does NOT call the provider's remote logout endpoint.
   */
  async #clearLocalSession(
    reason: CardUnauthenticatedReason | null = null,
  ): Promise<void> {
    const pid = this.state.activeProviderId;
    this.currentSession = null;
    await this.clearTokens();
    this.invalidateFetch();
    this.update((s) => {
      s.isAuthenticated = false;
      s.lastUnauthenticatedReason = reason;
      s.cardHomeData = null;
      s.cardHomeDataStatus = 'idle';
      if (pid) {
        (s.providerData as unknown as Record<string, Record<string, string>>)[
          pid
        ] = {};
      }
    });
  }

  /**
   * Forced logout for an unrecoverable session.
   */
  async #handleSessionExpired(
    reason: CardUnauthenticatedReason | null = null,
  ): Promise<void> {
    await this.#clearLocalSession(reason);
    this.#fetchCardHomeDataWithLogging('#handleSessionExpired');
  }

  /**
   * Toggles reset mode. While enabled, the controller ignores its reactive
   * triggers.
   * @param value - Whether to set reset in progress
   */
  setResetInProgress(value: boolean): void {
    this.resetInProgress = value;
  }

  /**
   * Wipes all Card data, returning it to a fresh-install state. Used by the
   * app reset / delete-wallet flow (see Authentication.resetWalletState).
   * @returns {Promise<void>}
   */
  async resetAll(): Promise<void> {
    try {
      for (const pid of Object.keys(this.providers)) {
        try {
          const tokens = await CardTokenStore.get(pid);
          if (tokens) {
            try {
              await this.providers[pid].logout(tokens);
            } catch (error) {
              Logger.error(error as Error, {
                tags: { feature: 'card', provider: pid },
                context: {
                  name: 'CardController',
                  data: { method: 'resetAll/providerLogout' },
                },
              });
            }
          }
          await CardTokenStore.remove(pid);
          await CardOnboardingStore.remove(pid);
        } catch (error) {
          Logger.error(error as Error, {
            tags: { feature: 'card', provider: pid },
            context: {
              name: 'CardController',
              data: { method: 'resetAll/providerCleanup' },
            },
          });
        }
      }

      this.currentSession = null;
      this.refreshPromise = null;
      this.invalidateFetch();
      if (this.#cardholderCheckTimer !== undefined) {
        clearTimeout(this.#cardholderCheckTimer);
        this.#cardholderCheckTimer = undefined;
      }
      this.update(() => ({ ...defaultCardControllerState }));

      ReduxService.store.dispatch(resetCardState());
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card' },
        context: { name: 'CardController', data: { method: 'resetAll' } },
      });
    }
  }

  async validateAndRefreshSession(): Promise<{
    isAuthenticated: boolean;
    location?: string;
  }> {
    const tokens = await this.getValidTokens();

    // Always fetch card home data regardless of auth state: authenticated users
    // get full card data, unauthenticated users get on-chain asset state.
    this.#fetchCardHomeDataWithLogging(
      'validateAndRefreshSession/fetchCardHomeData',
    );

    if (!tokens) return { isAuthenticated: false };
    return { isAuthenticated: true, location: tokens.location };
  }

  // -- Token helpers --

  /**
   * Returns valid auth tokens, refreshing if needed.
   * Returns null if no tokens exist or refresh fails (marks unauthenticated).
   * Concurrent callers share the same in-flight refresh to avoid token races.
   */
  private async getValidTokens(): Promise<CardAuthTokens | null> {
    const pid = this.state.activeProviderId;
    if (!pid) return null;

    const tokens = await CardTokenStore.get(pid);
    if (!tokens) {
      this.markUnauthenticated(this.state.lastUnauthenticatedReason);
      return null;
    }

    if (tokens.accountAddress) {
      const selected = this.#getSelectedEvmAddress();
      if (
        !selected ||
        selected.toLowerCase() !== tokens.accountAddress.toLowerCase()
      ) {
        this.markUnauthenticated(this.state.lastUnauthenticatedReason);
        return null;
      }
    }

    const provider = this.getActiveProvider();
    const validity = provider.validateTokens(tokens);

    if (validity === 'valid') {
      this.#markAuthenticatedWithLocation(pid, tokens.location);
      return tokens;
    }

    if (validity === 'needs_refresh') {
      this.refreshPromise ??= this.#doRefresh(pid, tokens).finally(() => {
        this.refreshPromise = null;
      });
      return this.refreshPromise;
    }

    // expired
    await this.clearTokens();
    this.markUnauthenticated(null);
    return null;
  }

  private async requireValidTokens(): Promise<CardAuthTokens> {
    const tokens = await this.getValidTokens();
    if (!tokens) {
      throw new CardProviderError(
        CardProviderErrorCode.InvalidCredentials,
        'Not authenticated',
      );
    }
    return tokens;
  }

  async #doRefresh(
    pid: string,
    tokens: CardAuthTokens,
  ): Promise<CardAuthTokens | null> {
    try {
      const fresh = await this.getActiveProvider().refreshTokens(tokens);
      await CardTokenStore.set(pid, fresh);
      this.#markAuthenticatedWithLocation(pid, fresh.location);
      return fresh;
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: pid },
        context: { name: 'CardController', data: { method: '#doRefresh' } },
      });
      if (
        error instanceof CardProviderError &&
        error.code === CardProviderErrorCode.InvalidCredentials
      ) {
        await this.#handleSessionExpired();
      }
      return null;
    }
  }

  /**
   * Forces a token refresh regardless of local clock validity.
   */
  async #forceRefresh(
    rejected: CardAuthTokens,
  ): Promise<CardAuthTokens | null> {
    const pid = this.state.activeProviderId;
    if (!pid) return null;

    const tokens = await CardTokenStore.get(pid);
    if (!tokens) {
      this.markUnauthenticated(this.state.lastUnauthenticatedReason);
      return null;
    }

    // Another caller may have refreshed while this request was in flight.
    if (tokens.accessToken !== rejected.accessToken) {
      return tokens;
    }

    if (!tokens.refreshToken) {
      // 401 with no refresh token to fall back on — session unrecoverable.
      await this.#handleSessionExpired('onboarding_token_revoked');
      return null;
    }

    this.refreshPromise ??= this.#doRefresh(pid, tokens).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  /**
   * Runs an authenticated provider operation with a single 401-retry.
   */
  async #executeWithAuthRetry<T>(
    tokens: CardAuthTokens,
    operation: (validTokens: CardAuthTokens) => Promise<T>,
  ): Promise<T> {
    try {
      return await operation(tokens);
    } catch (error) {
      if (!isCardAuthTokenError(error)) throw error;

      const fresh = await this.#forceRefresh(tokens);
      if (!fresh) throw error;

      try {
        return await operation(fresh);
      } catch (retryError) {
        if (isCardAuthTokenError(retryError)) {
          await this.#handleSessionExpired();
        }
        throw retryError;
      }
    }
  }

  /**
   * requireValidTokens + #executeWithAuthRetry: the standard wrapper for
   * every authenticated provider pass-through.
   */
  async #withAuthRetry<T>(
    operation: (validTokens: CardAuthTokens) => Promise<T>,
  ): Promise<T> {
    const tokens = await this.requireValidTokens();
    return this.#executeWithAuthRetry(tokens, operation);
  }

  #markAuthenticatedWithLocation(pid: string, location: string): void {
    this.update((s) => {
      s.isAuthenticated = true;
      s.lastUnauthenticatedReason = null;
      (s.providerData as unknown as Record<string, Record<string, string>>)[
        pid
      ] = {
        ...((
          s.providerData as unknown as Record<string, Record<string, string>>
        )[pid] ?? {}),
        location,
      };
    });
  }

  // -- Data pass-throughs --

  getCapabilities(): CardProviderCapabilities {
    const provider = this.getActiveProvider();
    return provider.capabilities;
  }

  async getCardHomeData(address: string): Promise<CardHomeData> {
    const tokens = await this.getValidTokens();
    const provider = this.getActiveProvider();
    if (tokens) {
      return this.#executeWithAuthRetry(tokens, (validTokens) =>
        provider.getCardHomeData(address, validTokens),
      );
    }
    return provider.getOnChainAssets?.(address) ?? emptyCardHomeData();
  }

  #restoreCardHomeDataAfterOptimisticFailure(
    previous: CardHomeData | null,
  ): void {
    if (!this.state.isAuthenticated) return;

    this.update((s) => {
      (s as unknown as CardControllerState).cardHomeData =
        previous as unknown as Record<string, Json>;
    });
  }

  async #refreshCardAfterStatusChange(method: string): Promise<void> {
    try {
      const freshCard = await this.#withAuthRetry((tokens) =>
        this.getActiveProvider().getCardDetails(tokens),
      );
      const current = this.state.cardHomeData as unknown as CardHomeData | null;
      if (freshCard && current) {
        this.update((s) => {
          (s as unknown as CardControllerState).cardHomeData = {
            ...current,
            card: freshCard,
          } as unknown as Record<string, Json>;
        });
      }
    } catch (refreshError) {
      if (!this.state.isAuthenticated) {
        throw refreshError;
      }

      Logger.error(refreshError as Error, {
        tags: { feature: 'card' },
        context: {
          name: 'CardController',
          data: { method },
        },
      });
    }
  }

  async freezeCard(cardId: string): Promise<void> {
    const previous = this.state.cardHomeData as unknown as CardHomeData | null;
    if (previous?.card) {
      this.update((s) => {
        (s as unknown as CardControllerState).cardHomeData = {
          ...previous,
          card: { ...previous.card, status: CardStatus.FROZEN } as CardDetails,
        } as unknown as Record<string, Json>;
      });
    }
    try {
      await this.#withAuthRetry((tokens) =>
        this.getActiveProvider().freezeCard(cardId, tokens),
      );
      await this.#refreshCardAfterStatusChange('freezeCard/refresh');
    } catch (error) {
      this.#restoreCardHomeDataAfterOptimisticFailure(previous);
      throw error;
    }
  }

  async unfreezeCard(cardId: string): Promise<void> {
    const previous = this.state.cardHomeData as unknown as CardHomeData | null;
    if (previous?.card) {
      this.update((s) => {
        (s as unknown as CardControllerState).cardHomeData = {
          ...previous,
          card: { ...previous.card, status: CardStatus.ACTIVE } as CardDetails,
        } as unknown as Record<string, Json>;
      });
    }
    try {
      await this.#withAuthRetry((tokens) =>
        this.getActiveProvider().unfreezeCard(cardId, tokens),
      );
      await this.#refreshCardAfterStatusChange('unfreezeCard/refresh');
    } catch (error) {
      this.#restoreCardHomeDataAfterOptimisticFailure(previous);
      throw error;
    }
  }

  async refreshCardStatus(): Promise<CardDetails | null> {
    try {
      return await this.#withAuthRetry((tokens) =>
        this.getActiveProvider().getCardDetails(tokens),
      );
    } catch {
      return null;
    }
  }

  async getCardDetailsView(
    params: CardSecureViewParams,
  ): Promise<CardSecureView> {
    const provider = this.getActiveProvider();
    const getCardDetailsView = provider.getCardDetailsView?.bind(provider);
    if (!getCardDetailsView) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card details view not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getCardDetailsView(tokens, params));
  }

  async getCardPinView(params: CardSecureViewParams): Promise<CardSecureView> {
    const provider = this.getActiveProvider();
    const getCardPinView = provider.getCardPinView?.bind(provider);
    if (!getCardPinView) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card PIN view not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getCardPinView(tokens, params));
  }

  async getCardSensitiveDetails(): Promise<CardSensitiveDetails> {
    const provider = this.getActiveProvider();
    const getCardSensitiveDetails =
      provider.getCardSensitiveDetails?.bind(provider);
    if (!getCardSensitiveDetails) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card sensitive details not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getCardSensitiveDetails(tokens));
  }

  async createFundingSource(): Promise<CardFundingSourceResult> {
    const provider = this.getActiveProvider();
    const createFundingSource = provider.createFundingSource?.bind(provider);
    if (!createFundingSource) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Funding source creation not supported',
      );
    }
    return this.#withAuthRetry((tokens) => createFundingSource(tokens));
  }

  async getFundingSources(): Promise<CardFundingSourceResult[]> {
    const provider = this.getActiveProvider();
    const getFundingSources = provider.getFundingSources?.bind(provider);
    if (!getFundingSources) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Listing funding sources not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getFundingSources(tokens));
  }

  async getSpendingPrerequisites(
    fundingSourceId: string,
    params: CardSpendingPrerequisitesParams,
  ): Promise<CardSpendingPrerequisitesResult> {
    const provider = this.getActiveProvider();
    const getSpendingPrerequisites =
      provider.getSpendingPrerequisites?.bind(provider);
    if (!getSpendingPrerequisites) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Spending prerequisites not supported',
      );
    }
    return this.#withAuthRetry((tokens) =>
      getSpendingPrerequisites(fundingSourceId, params, tokens),
    );
  }

  async createCard(fundingSourceId: string): Promise<CardCreateResult> {
    const provider = this.getActiveProvider();
    const createCard = provider.createCard?.bind(provider);
    if (!createCard) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card creation not supported',
      );
    }
    return this.#withAuthRetry((tokens) => createCard(fundingSourceId, tokens));
  }

  async patchContactDetails(details: CardContactDetails): Promise<void> {
    const provider = this.getActiveProvider();
    const patchContactDetails = provider.patchContactDetails?.bind(provider);
    if (!patchContactDetails) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Contact details update not supported',
      );
    }
    return this.#withAuthRetry((tokens) =>
      patchContactDetails(details, tokens),
    );
  }

  async updateAssetPriority(
    asset: CardFundingAsset,
    allAssets: CardFundingAsset[],
  ): Promise<void> {
    const previous = this.state.cardHomeData as unknown as CardHomeData | null;
    if (previous) {
      const reordered = reorderAssets(asset, allAssets);
      const newPrimary = pickPrimaryFromReordered(reordered);
      const reorderedSupported = reorderAssets(
        asset,
        previous.availableFundingAssets,
      );
      this.update((s) => {
        (s as unknown as CardControllerState).cardHomeData = {
          ...previous,
          fundingAssets: reordered,
          primaryFundingAsset: newPrimary,
          availableFundingAssets: reorderedSupported,
        } as unknown as Record<string, Json>;
      });
    }
    try {
      const provider = this.getActiveProvider();
      const updateAssetPriority = provider.updateAssetPriority?.bind(provider);
      if (!updateAssetPriority) {
        throw new CardProviderError(
          CardProviderErrorCode.Unknown,
          'Asset priority not supported',
        );
      }
      await this.#withAuthRetry((tokens) =>
        updateAssetPriority(asset, allAssets, tokens),
      );
    } catch (error) {
      this.#restoreCardHomeDataAfterOptimisticFailure(previous);
      throw error;
    }
  }

  async approveFunding(params: FundingApprovalParams): Promise<void> {
    const provider = this.getActiveProvider();
    const approveFunding = provider.approveFunding?.bind(provider);
    if (!approveFunding) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Funding approval not supported',
      );
    }
    return this.#withAuthRetry((tokens) => approveFunding(params, tokens));
  }

  async fetchDelegationChallenge(params: {
    network: string;
    address: string;
    faucet?: boolean;
  }): Promise<DelegationChallengeResponse> {
    const provider = this.getActiveProvider();
    const fetchDelegationChallenge =
      provider.fetchDelegationChallenge?.bind(provider);
    if (!fetchDelegationChallenge) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Delegation challenge not supported',
      );
    }
    return this.#withAuthRetry((tokens) =>
      fetchDelegationChallenge(params, tokens),
    );
  }

  /**
   * Builds the provider-specific SIWE message used to prove address ownership
   * before a Card delegation approval. Active provider owns wording,
   * chain-id mapping, and any EVM/Solana variants.
   */
  generateCardDelegationSignatureMessage(params: {
    network: string;
    address: string;
    nonce: string;
    caipChainId?: string;
  }): string {
    const provider = this.getActiveProvider();
    if (!provider.generateCardDelegationSignatureMessage) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card delegation signature message not supported',
      );
    }
    return provider.generateCardDelegationSignatureMessage(params);
  }

  /**
   * Links a primary Money Account to Card by approving a Monad USDC allowance
   * to the active provider's delegation contract and completing the provider's
   * funding flow. The approval transaction is submitted via
   * `TransactionController:addTransactionBatch` with `requireApproval: false`
   * and `isGasFeeSponsored: true`, so it never opens the Confirmations modal
   * and the money account doesn't pay MON gas — Sentinel sponsors the relayer
   * fee. This is the background linkage path UI hooks consume.
   *
   * Pre-flight enforces one invariant before submission: the Monad gas
   * sponsorship feature flag must be enabled (the relay must accept
   * sponsorship for this chain).
   *
   * EIP-7702 upgrade is handled atomically by `Delegation7702PublishHook`:
   * when the Money Account has no existing delegation, the hook auto-signs a
   * 7702 authorization and bundles it in the same Sentinel relay request as
   * the approve. No separate upgrade step is required here.
   *
   * Race-safe by construction: subscribes to
   * `TransactionController:transactionConfirmed` BEFORE submitting the
   * transaction (see `awaitTransactionConfirmed`).
   *
   *
   * @param params.moneyAccountAddress - The primary Money Account address.
   * @param params.delegationAmountHuman - Allowance in human-readable units
   * (e.g. `"2199023255551"`); converted to minimal units using the token's
   * decimals. Pass `"0"` to revoke.
   */
  async linkMoneyAccountCard(params: {
    moneyAccountAddress: string;
    delegationAmountHuman: string;
  }): Promise<void> {
    if (this.state.moneyAccountCardLinkInProgress) {
      throw new CardLinkageInProgressError();
    }
    this.update((state) => {
      state.moneyAccountCardLinkInProgress = true;
    });
    try {
      await this.#linkMoneyAccountCardUnsafe(params);
    } finally {
      this.update((state) => {
        state.moneyAccountCardLinkInProgress = false;
      });
    }
  }

  isLinkageInProgress(): boolean {
    return this.state.moneyAccountCardLinkInProgress;
  }

  async #linkMoneyAccountCardUnsafe(params: {
    moneyAccountAddress: string;
    delegationAmountHuman: string;
  }): Promise<void> {
    const { moneyAccountAddress, delegationAmountHuman } = params;

    let fromAddress: string;
    try {
      const checksummed = safeToChecksumAddress(moneyAccountAddress);
      if (!checksummed) throw new Error();
      fromAddress = checksummed;
    } catch {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Invalid Money account address',
      );
    }

    if (!delegationAmountHuman) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Delegation amount is required',
      );
    }

    // Fail fast before any transaction work when there is no usable session.
    await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (
      !provider.fetchDelegationChallenge ||
      !provider.approveFunding ||
      !provider.generateCardDelegationSignatureMessage
    ) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money account card delegation is not supported for this provider',
      );
    }

    const cardToken = await this.#resolveMoneyAccountCardTokenOrRefetch();
    if (!cardToken) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money Account Card spending token unavailable',
      );
    }

    const tokenAddress = cardToken.stagingTokenAddress ?? cardToken.address;
    if (!tokenAddress) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money Account Card spending token address missing',
      );
    }
    if (!cardToken.delegationContract) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money Account Card delegation contract missing',
      );
    }

    const amountInMinimalUnits = toTokenMinimalUnit(
      delegationAmountHuman,
      cardToken.decimals ?? 6,
    ).toString();
    const data = encodeErc20ApproveCalldata(
      cardToken.delegationContract,
      amountInMinimalUnits,
    );

    const chainNumber = parseInt(
      cardToken.caipChainId?.split(':')[1] ?? '143',
      10,
    );
    const hexChainId = numberToHex(chainNumber) as Hex;
    const networkClientId = this.messenger.call(
      'NetworkController:findNetworkClientIdByChainId',
      hexChainId,
    );

    // Pre-flight 1: Monad gas sponsorship feature flag must be on. The card
    // link approve is submitted with `isGasFeeSponsored: true`, so if the
    // server-side sponsorship is disabled we must refuse before the relay
    // call — otherwise the publish hook would reject and the user would see
    // a generic link-failed toast with no actionable reason.
    const isMonadSponsorshipEnabled = getGasFeesSponsoredNetworkEnabled(
      ReduxService.store.getState() as RootState,
    )(hexChainId);
    if (!isMonadSponsorshipEnabled) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Monad gas sponsorship unavailable',
      );
    }

    // Public wrappers carry the 401 refresh-retry; the transaction flow in
    // between can outlive the access token that passed the guard above.
    const { delegationToken, nonce } = await this.fetchDelegationChallenge({
      network: 'monad',
      address: fromAddress,
    });

    const signatureMessage = this.generateCardDelegationSignatureMessage({
      network: 'monad',
      address: fromAddress,
      nonce,
      caipChainId: cardToken.caipChainId ?? 'eip155:143',
    });

    const sigHash = await this.messenger.call(
      'KeyringController:signPersonalMessage',
      {
        data: `0x${Buffer.from(signatureMessage, 'utf8').toString('hex')}`,
        from: fromAddress,
      },
    );

    const { transactionMeta: confirmedMeta } = await awaitTransactionConfirmed({
      messenger: this
        .messenger as unknown as AwaitTransactionConfirmedMessenger,
      submit: async () => {
        const { batchId } = await this.messenger.call(
          'TransactionController:addTransactionBatch',
          {
            from: fromAddress as Hex,
            networkClientId,
            origin: TransactionTypes.MMM_CARD,
            requireApproval: false,
            disableHook: true,
            disableSequential: true,
            isGasFeeSponsored: true,
            transactions: [
              {
                params: {
                  to: tokenAddress as Hex,
                  data: data as Hex,
                  value: '0x0' as Hex,
                },
                type: TransactionType.tokenMethodApprove,
              },
            ],
          },
        );

        const innerTx = await this.#findInnerTxForBatch(batchId);
        return {
          result: Promise.resolve(''),
          transactionMeta: innerTx,
        };
      },
    });

    const txHash = confirmedMeta.hash ?? '';

    await this.approveFunding({
      address: fromAddress,
      network: MONEY_ACCOUNT_DELEGATION_NETWORK,
      currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
      amount: delegationAmountHuman,
      txHash,
      sigHash,
      sigMessage: signatureMessage,
      token: delegationToken,
    });

    try {
      await this.fetchCardHomeData();
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'CardController.linkMoneyAccountCard: post-link refresh failed',
      );
    }
  }

  async #resolveMoneyAccountCardTokenOrRefetch() {
    const fromState = () => {
      const data = this.state.cardHomeData as unknown as CardHomeData | null;
      return resolveMoneyAccountCardToken(data?.delegationSettings ?? null);
    };
    const existing = fromState();
    if (existing) return existing;

    await this.fetchCardHomeData();
    return fromState();
  }

  /**
   * Resolves the inner `TransactionMeta` created by `addTransactionBatch` for
   * a given `batchId`. `addTransactionBatch` returns only the batch id, but
   * `awaitTransactionConfirmed` needs the inner transaction id to match the
   * `transactionConfirmed` event. Polls the TransactionController state with
   * a small bounded retry — the inner tx is emitted into state synchronously
   * during the batch add path, so this almost always resolves on the first
   * read; the retry exists purely to absorb micro-task ordering with the
   * batch-id resolution.
   */
  async #findInnerTxForBatch(batchId: string): Promise<TransactionMeta> {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 50;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { transactions } = this.messenger.call(
        'TransactionController:getState',
      );
      const match = transactions.find((tx) => tx.batchId === batchId);
      if (match) return match;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS),
        );
      }
    }
    throw new CardProviderError(
      CardProviderErrorCode.Unknown,
      `Could not find inner transaction for batch ${batchId}`,
    );
  }

  // -- Push Provisioning --

  async createGoogleWalletProvisioningRequest(): Promise<{
    opaquePaymentCard: string;
  }> {
    const provider = this.getActiveProvider();
    const createGoogleWalletProvisioningRequest =
      provider.createGoogleWalletProvisioningRequest?.bind(provider);
    if (!createGoogleWalletProvisioningRequest) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Google Wallet provisioning not supported',
      );
    }
    return this.#withAuthRetry((tokens) =>
      createGoogleWalletProvisioningRequest(tokens),
    );
  }

  async createApplePayProvisioningRequest(params: {
    leafCertificate: string;
    intermediateCertificate: string;
    nonce: string;
    nonceSignature: string;
  }): Promise<{
    encryptedPassData: string;
    activationData: string;
    ephemeralPublicKey: string;
  }> {
    const provider = this.getActiveProvider();
    const createApplePayProvisioningRequest =
      provider.createApplePayProvisioningRequest?.bind(provider);
    if (!createApplePayProvisioningRequest) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Apple Pay provisioning not supported',
      );
    }
    return this.#withAuthRetry((tokens) =>
      createApplePayProvisioningRequest(params, tokens),
    );
  }

  // -- Cashback --

  async getCashbackWallet(): Promise<CashbackWalletResponse> {
    const provider = this.getActiveProvider();
    const getCashbackWallet = provider.getCashbackWallet?.bind(provider);
    if (!getCashbackWallet) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Cashback not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getCashbackWallet(tokens));
  }

  async getCashbackWithdrawEstimation(): Promise<CashbackWithdrawEstimationResponse> {
    const provider = this.getActiveProvider();
    const getCashbackWithdrawEstimation =
      provider.getCashbackWithdrawEstimation?.bind(provider);
    if (!getCashbackWithdrawEstimation) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Cashback not supported',
      );
    }
    return this.#withAuthRetry((tokens) =>
      getCashbackWithdrawEstimation(tokens),
    );
  }

  async withdrawCashback(
    params: CashbackWithdrawParams,
  ): Promise<CashbackWithdrawResponse> {
    const provider = this.getActiveProvider();
    const withdrawCashback = provider.withdrawCashback?.bind(provider);
    if (!withdrawCashback) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Cashback withdrawal not supported',
      );
    }
    return this.#withAuthRetry((tokens) => withdrawCashback(params, tokens));
  }

  // -- Credit --

  async getCreditWallet(): Promise<CreditWalletResponse> {
    const provider = this.getActiveProvider();
    const getCreditWallet = provider.getCreditWallet?.bind(provider);
    if (!getCreditWallet) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Credit not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getCreditWallet(tokens));
  }

  async getCreditWithdrawEstimation(): Promise<CreditWithdrawEstimationResponse> {
    const provider = this.getActiveProvider();
    const getCreditWithdrawEstimation =
      provider.getCreditWithdrawEstimation?.bind(provider);
    if (!getCreditWithdrawEstimation) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Credit not supported',
      );
    }
    return this.#withAuthRetry((tokens) => getCreditWithdrawEstimation(tokens));
  }

  async withdrawCredit(
    params: CreditWithdrawParams,
  ): Promise<CreditWithdrawResponse> {
    const provider = this.getActiveProvider();
    const withdrawCredit = provider.withdrawCredit?.bind(provider);
    if (!withdrawCredit) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Credit withdrawal not supported',
      );
    }
    return this.#withAuthRetry((tokens) => withdrawCredit(params, tokens));
  }
}
