import { BaseController, type StateMetadata } from '@metamask/base-controller';
import {
  TransactionType,
  WalletDevice,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { numberToHex, type Hex, type Json } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import {
  CARD_CONTROLLER_NAME,
  DEFAULT_CARD_PROVIDER_ID,
  type CardControllerMessenger,
  type CardControllerState,
} from './types';
import type {
  CardLocation,
  CardFundingToken,
} from '../../../../components/UI/Card/types';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardStatus,
  emptyCardHomeData,
  type CardAuthSession,
  type CardAuthResult,
  type CardAuthStep,
  type CardAuthTokens,
  type CardCredentials,
  type CardDetails,
  type CardFundingAsset,
  type CardFundingConfig,
  type CardHomeData,
  type CardProviderCapabilities,
  type CardSecureView,
  type CardSecureViewParams,
  type CashbackWalletResponse,
  type CashbackWithdrawEstimationResponse,
  type CashbackWithdrawParams,
  type CashbackWithdrawResponse,
  type DelegationSession,
  type FundingApprovalParams,
  type ICardProvider,
  type WalletOperations,
} from './provider-types';
import { CardTokenStore } from './CardTokenStore';
import { isEthAccount } from '../../../Multichain/utils';
import { pickPrimaryFromReordered, reorderAssets } from './utils/assetPriority';
import { EvmDelegationAdapter } from './delegation/EvmDelegationAdapter';
import {
  SolanaDelegationAdapter,
  SOLANA_WALLET_SNAP_ID,
} from './delegation/SolanaDelegationAdapter';
import type { IDelegationNetworkAdapter } from './delegation/IDelegationNetworkAdapter';
import { encodeApproveTransaction } from '../../../../components/UI/Card/util/encodeApproveTransaction';
import { toTokenMinimalUnit } from '../../../../util/number';
import { safeToChecksumAddress } from '../../../../util/address';
import TransactionTypes from '../../../../core/TransactionTypes';
import { SOLANA_CAIP_CHAIN_ID } from '../../../../components/UI/Card/constants';
import { HandlerType } from '@metamask/snaps-utils';
import { SolScope } from '@metamask/keyring-api';
import { SnapId } from '@metamask/snaps-sdk';

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
};

export const defaultCardControllerState: CardControllerState = {
  selectedCountry: null,
  activeProviderId: DEFAULT_CARD_PROVIDER_ID,
  isAuthenticated: false,
  cardholderAccounts: [],
  providerData: {},
  cardHomeData: null,
  cardHomeDataStatus: 'idle',
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
  private pendingDelegationSession: DelegationSession | null = null;

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
    // On app unlock: run both cardholder check AND session verification
    this.messenger.subscribe('KeyringController:unlock', () => {
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
      this.fetchCardHomeData().catch((error) =>
        Logger.error(error as Error, {
          tags: { feature: 'card' },
          context: {
            name: 'CardController',
            data: { method: '#handleAccountSwitch' },
          },
        }),
      );
    }
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
      const cardFeature = featureState.remoteFeatureFlags?.cardFeature as
        | { constants?: { accountsApiUrl?: string } }
        | undefined;
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

  private markUnauthenticated(): void {
    this.update((s) => {
      s.isAuthenticated = false;
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

  async initiateAuth(country: string): Promise<void> {
    this.currentSession = await this.getActiveProvider().initiateAuth(country);
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
        (s.providerData as unknown as Record<string, Record<string, string>>)[
          pid
        ] = { location: tokenSet.location };
      });
      this.fetchCardHomeData().catch((error) =>
        Logger.error(error as Error, {
          tags: { feature: 'card' },
          context: {
            name: 'CardController',
            data: { method: 'submitCredentials/fetchCardHomeData' },
          },
        }),
      );
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

    this.currentSession = null;
    await this.clearTokens();
    this.invalidateFetch();
    this.update((s) => {
      s.isAuthenticated = false;
      s.cardHomeData = null;
      s.cardHomeDataStatus = 'idle';
      (s.providerData as unknown as Record<string, Record<string, string>>)[
        pid
      ] = {};
    });
  }

  async validateAndRefreshSession(): Promise<{
    isAuthenticated: boolean;
    location?: string;
  }> {
    const tokens = await this.getValidTokens();

    // Always fetch card home data regardless of auth state: authenticated users
    // get full card data, unauthenticated users get on-chain asset state.
    this.fetchCardHomeData().catch((error) =>
      Logger.error(error as Error, {
        tags: { feature: 'card' },
        context: {
          name: 'CardController',
          data: { method: 'validateAndRefreshSession/fetchCardHomeData' },
        },
      }),
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
      this.markUnauthenticated();
      return null;
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
    this.markUnauthenticated();
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
      await this.clearTokens();
      this.markUnauthenticated();
      return null;
    }
  }

  #markAuthenticatedWithLocation(pid: string, location: string): void {
    this.update((s) => {
      s.isAuthenticated = true;
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
    const pid = this.state.activeProviderId ?? '';
    const provData = this.state.providerData[pid] as
      | { location?: string }
      | undefined;
    const location = provData?.location ?? '';
    return provider.resolveCapabilities?.(location) ?? provider.capabilities;
  }

  async getCardHomeData(address: string): Promise<CardHomeData> {
    const tokens = await this.getValidTokens();
    if (tokens) {
      return this.getActiveProvider().getCardHomeData(address, tokens);
    }
    const provider = this.getActiveProvider();
    return provider.getOnChainAssets?.(address) ?? emptyCardHomeData();
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
      const tokens = await this.requireValidTokens();
      await this.getActiveProvider().freezeCard(cardId, tokens);
      try {
        const freshCard = await this.getActiveProvider().getCardDetails(tokens);
        const current = this.state
          .cardHomeData as unknown as CardHomeData | null;
        if (freshCard && current) {
          this.update((s) => {
            (s as unknown as CardControllerState).cardHomeData = {
              ...current,
              card: freshCard,
            } as unknown as Record<string, Json>;
          });
        }
      } catch (refreshError) {
        // Optimistic update already applied; log so we know the refresh failed.
        Logger.error(refreshError as Error, {
          tags: { feature: 'card' },
          context: {
            name: 'CardController',
            data: { method: 'freezeCard/refresh' },
          },
        });
      }
    } catch (error) {
      this.update((s) => {
        (s as unknown as CardControllerState).cardHomeData =
          previous as unknown as Record<string, Json>;
      });
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
      const tokens = await this.requireValidTokens();
      await this.getActiveProvider().unfreezeCard(cardId, tokens);
      try {
        const freshCard = await this.getActiveProvider().getCardDetails(tokens);
        const current = this.state
          .cardHomeData as unknown as CardHomeData | null;
        if (freshCard && current) {
          this.update((s) => {
            (s as unknown as CardControllerState).cardHomeData = {
              ...current,
              card: freshCard,
            } as unknown as Record<string, Json>;
          });
        }
      } catch (refreshError) {
        // Optimistic update already applied; log so we know the refresh failed.
        Logger.error(refreshError as Error, {
          tags: { feature: 'card' },
          context: {
            name: 'CardController',
            data: { method: 'unfreezeCard/refresh' },
          },
        });
      }
    } catch (error) {
      this.update((s) => {
        (s as unknown as CardControllerState).cardHomeData =
          previous as unknown as Record<string, Json>;
      });
      throw error;
    }
  }

  async refreshCardStatus(): Promise<CardDetails | null> {
    try {
      const tokens = await this.requireValidTokens();
      return this.getActiveProvider().getCardDetails(tokens);
    } catch {
      return null;
    }
  }

  async getCardDetailsView(
    params: CardSecureViewParams,
  ): Promise<CardSecureView> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.getCardDetailsView) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card details view not supported',
      );
    }
    return provider.getCardDetailsView(tokens, params);
  }

  async getCardPinView(params: CardSecureViewParams): Promise<CardSecureView> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.getCardPinView) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Card PIN view not supported',
      );
    }
    return provider.getCardPinView(tokens, params);
  }

  async getFundingConfig(): Promise<CardFundingConfig> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.getFundingConfig) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Funding config not supported',
      );
    }
    return provider.getFundingConfig(tokens);
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
      const tokens = await this.requireValidTokens();
      const provider = this.getActiveProvider();
      if (!provider.updateAssetPriority) {
        throw new CardProviderError(
          CardProviderErrorCode.Unknown,
          'Asset priority not supported',
        );
      }
      await provider.updateAssetPriority(asset, allAssets, tokens);
    } catch (error) {
      this.update((s) => {
        (s as unknown as CardControllerState).cardHomeData =
          previous as unknown as Record<string, Json>;
      });
      throw error;
    }
  }

  async approveFunding(params: FundingApprovalParams): Promise<void> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.approveFunding) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Funding approval not supported',
      );
    }
    const wallet = this.#buildWalletOperations();
    return provider.approveFunding(params, tokens, wallet);
  }

  #buildWalletOperations(): WalletOperations {
    return {
      signMessage: async (address: string, message: string) => {
        const hex = `0x${Buffer.from(message, 'utf8').toString('hex')}`;
        return this.messenger.call('KeyringController:signPersonalMessage', {
          data: hex,
          from: address,
        });
      },
      submitTransaction: async (txParams, chainId) => {
        const chainNumber = parseInt(chainId.split(':')[1], 10);
        const hexChainId = numberToHex(chainNumber) as Hex;
        const networkClientId = this.messenger.call(
          'NetworkController:findNetworkClientIdByChainId',
          hexChainId,
        );
        const { result } = await this.messenger.call(
          'TransactionController:addTransaction',
          txParams,
          {
            networkClientId,
            origin: 'metamask',
            type: TransactionType.tokenMethodApprove,
            requireApproval: true,
          },
        );
        return result;
      },
    };
  }

  // -- Push Provisioning --

  async createGoogleWalletProvisioningRequest(): Promise<{
    opaquePaymentCard: string;
  }> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.createGoogleWalletProvisioningRequest) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Google Wallet provisioning not supported',
      );
    }
    return provider.createGoogleWalletProvisioningRequest(tokens);
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
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.createApplePayProvisioningRequest) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Apple Pay provisioning not supported',
      );
    }
    return provider.createApplePayProvisioningRequest(params, tokens);
  }

  // -- Cashback --

  async getCashbackWallet(): Promise<CashbackWalletResponse> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.getCashbackWallet) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Cashback not supported',
      );
    }
    return provider.getCashbackWallet(tokens);
  }

  async getCashbackWithdrawEstimation(): Promise<CashbackWithdrawEstimationResponse> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.getCashbackWithdrawEstimation) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Cashback not supported',
      );
    }
    return provider.getCashbackWithdrawEstimation(tokens);
  }

  async withdrawCashback(
    params: CashbackWithdrawParams,
  ): Promise<CashbackWithdrawResponse> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.withdrawCashback) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Cashback withdrawal not supported',
      );
    }
    return provider.withdrawCashback(params, tokens);
  }

  // -- Delegation --

  /**
   * Creates a network-specific delegation adapter.
   * Solana uses SnapController; all other chains use KeyringController signing.
   */
  #createDelegationAdapter(caipChainId: string): IDelegationNetworkAdapter {
    if (caipChainId === SOLANA_CAIP_CHAIN_ID) {
      return new SolanaDelegationAdapter(
        (args) =>
          this.messenger.call('SnapController:handleRequest', {
            snapId: SOLANA_WALLET_SNAP_ID as SnapId,
            origin: 'metamask',
            handler: HandlerType.OnClientRequest,
            request: args.request,
          }) as Promise<unknown>,
      );
    }
    return new EvmDelegationAdapter((params) =>
      this.messenger.call('KeyringController:signPersonalMessage', params),
    );
  }

  /**
   * Returns the token to delegate with.
   * If selectedToken is provided, use it; otherwise fetch the list and return
   * the first available token (flow-agnostic default).
   */
  async resolveDelegationToken(
    flow: 'onboarding' | 'manage' | 'enable',
    selectedToken?: CardFundingToken | null,
  ): Promise<CardFundingToken> {
    if (selectedToken) return selectedToken;

    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.getDelegationTokenList) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        `getDelegationTokenList not supported (flow: ${flow})`,
      );
    }
    const list = await provider.getDelegationTokenList(tokens);
    const first = list[0];
    if (!first) {
      throw new CardProviderError(
        CardProviderErrorCode.NotFound,
        'No delegation tokens available',
      );
    }
    return first;
  }

  /**
   * Encodes an ERC-20 approve tx and adds it to the TransactionController
   * approval queue. Returns the queued transactionId and the resolved from
   * address so the caller can pass both to prepareDelegationApproval.
   *
   * EVM only — Solana tx is submitted inline by prepareDelegationApproval.
   */
  async queueDelegationApproval(
    token: CardFundingToken,
    networkClientId: string,
    amount: string,
  ): Promise<{ transactionId: string; address: string }> {
    if (!token.delegationContract) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Token missing delegationContract',
      );
    }
    const tokenAddress = token.stagingTokenAddress || token.address;
    if (!tokenAddress) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Token missing address',
      );
    }

    const { internalAccounts } = this.messenger.call(
      'AccountsController:getState',
    );
    const selected =
      internalAccounts.accounts[internalAccounts.selectedAccount];
    const address = safeToChecksumAddress(selected?.address);
    if (!address) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'No EVM account selected',
      );
    }

    const amountInMinimalUnits = toTokenMinimalUnit(
      amount,
      token.decimals ?? 18,
    ).toString();

    const transactionData = encodeApproveTransaction(
      token.delegationContract,
      amountInMinimalUnits,
    );

    const { transactionMeta } = await this.messenger.call(
      'TransactionController:addTransaction',
      { from: address, to: tokenAddress, data: transactionData },
      {
        networkClientId,
        origin: TransactionTypes.MMM_CARD,
        type: 'cardDelegation' as TransactionType,
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        requireApproval: true,
        skipInitialGasEstimate: true,
      },
    );

    return { transactionId: transactionMeta.id, address };
  }

  /**
   * Prefetches a delegation session from the provider and caches it in memory.
   * Call on component mount so the session is ready when the user confirms.
   */
  async prefetchDelegationSession(
    caipChainId: string,
    address: string,
    useGasFaucet?: boolean,
  ): Promise<void> {
    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.initiateDelegation) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'initiateDelegation not supported',
      );
    }
    this.pendingDelegationSession = await provider.initiateDelegation(
      { chainId: caipChainId, address, useGasFaucet },
      tokens,
    );
  }

  /**
   * Main delegation orchestration:
   * 1. Use cached session or fetch a fresh one
   * 2. Build the SIWE message and sign it via the network adapter
   * 3. EVM: register a one-shot tx-confirmed listener → call provider.approveDelegation → refresh → publish event
   * Solana: submit via snap → wait for MultichainTransactionsController confirmation → approveDelegation → publish event
   */
  async prepareDelegationApproval(params: {
    caipChainId: string;
    address: string;
    accountId?: string;
    tokenSymbol: string;
    /** Solana token mint address (stagingTokenAddress || address). EVM: unused. */
    tokenMint?: string;
    /** On-chain delegation contract address. Required for Solana snap call. */
    delegationContract?: string;
    amount: string;
    /** EVM only — the pre-queued tx ID from queueDelegationApproval. Unused for Solana. */
    transactionId?: string;
    flow: 'onboarding' | 'manage' | 'enable' | null;
    useGasFaucet?: boolean;
  }): Promise<void> {
    const {
      caipChainId,
      address,
      accountId,
      tokenSymbol,
      tokenMint,
      delegationContract,
      amount,
      transactionId,
      flow,
      useGasFaucet,
    } = params;

    const tokens = await this.requireValidTokens();
    const provider = this.getActiveProvider();
    if (!provider.initiateDelegation || !provider.approveDelegation) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Delegation not supported by active provider',
      );
    }

    // Use prefetched session or fetch a fresh one
    const session =
      this.pendingDelegationSession ??
      (await provider.initiateDelegation(
        { chainId: caipChainId, address, useGasFaucet },
        tokens,
      ));
    this.pendingDelegationSession = null;

    const adapter = this.#createDelegationAdapter(caipChainId);
    const siweMessage = adapter.buildSignatureMessage(
      address,
      session.challenge,
      caipChainId,
    );
    const hexMessage = `0x${Buffer.from(siweMessage, 'utf8').toString('hex')}`;
    const proofSignature = await adapter.signMessage({
      accountId,
      address,
      hexMessage,
    });

    if (caipChainId === SOLANA_CAIP_CHAIN_ID) {
      await this.#executeSolanaDelegation({
        session,
        provider,
        tokens,
        address,
        accountId,
        tokenSymbol,
        tokenMint,
        delegationContract,
        amount,
        proofSignature,
        proofMessage: siweMessage,
        flow,
        caipChainId,
      });
    } else {
      if (!transactionId) {
        throw new Error('transactionId is required for EVM delegation');
      }
      this.#registerEvmDelegationListener({
        transactionId,
        session,
        provider,
        tokens,
        address,
        tokenSymbol,
        amount,
        proofSignature,
        proofMessage: siweMessage,
        caipChainId,
        flow,
      });
    }
  }

  /**
   * Registers a one-shot listener on TransactionController:transactionConfirmed
   * for the given transactionId. When it fires, calls provider.approveDelegation,
   * refreshes card home data, and publishes CardController:delegationCompleted.
   */
  #registerEvmDelegationListener(listenerParams: {
    transactionId: string;
    session: DelegationSession;
    provider: ICardProvider;
    tokens: CardAuthTokens;
    address: string;
    tokenSymbol: string;
    amount: string;
    proofSignature: string;
    proofMessage: string;
    caipChainId: string;
    flow: 'onboarding' | 'manage' | 'enable' | null;
  }): void {
    const {
      transactionId,
      session,
      provider,
      tokens,
      address,
      tokenSymbol,
      amount,
      proofSignature,
      proofMessage,
      caipChainId,
      flow,
    } = listenerParams;

    const delegationTxListeners = {
      unsubscribeBoth: () => {
        try {
          this.messenger.unsubscribe(
            'TransactionController:transactionConfirmed',
            delegationTxListeners.confirmedHandler,
          );
        } catch {
          // Already unsubscribed — safe to ignore
        }
        try {
          this.messenger.unsubscribe(
            'TransactionController:transactionFailed',
            delegationTxListeners.failedHandler,
          );
        } catch {
          // Already unsubscribed — safe to ignore
        }
      },
      confirmedHandler: (meta: TransactionMeta) => {
        if (meta.id !== transactionId) return;

        delegationTxListeners.unsubscribeBoth();

        provider
          .approveDelegation?.(
            {
              address,
              chainId: caipChainId,
              tokenSymbol,
              amount,
              txHash: meta.hash ?? '',
              proofSignature,
              proofMessage,
              sessionId: session.sessionId,
            },
            tokens,
          )
          .then(() => this.fetchCardHomeData())
          .then(() => {
            this.messenger.publish('CardController:delegationCompleted', {
              flow,
            });
          })
          .catch((error: Error) => {
            Logger.error(error, {
              tags: { feature: 'card' },
              context: {
                name: 'CardController',
                data: {
                  method: '#registerEvmDelegationListener/approveDelegation',
                },
              },
            });
          });
      },
      failedHandler: ({
        transactionMeta,
        error,
      }: {
        transactionMeta: TransactionMeta;
        error: string;
      }) => {
        if (transactionMeta.id !== transactionId) return;

        delegationTxListeners.unsubscribeBoth();

        this.messenger.publish('CardController:delegationFailed', {
          flow,
          error,
        });
      },
    };

    this.messenger.subscribe(
      'TransactionController:transactionConfirmed',
      delegationTxListeners.confirmedHandler,
    );
    this.messenger.subscribe(
      'TransactionController:transactionFailed',
      delegationTxListeners.failedHandler,
    );
  }

  /**
   * Executes Solana delegation inline:
   * 1. Submit approveCardAmount via SnapController
   * 2. Wait for MultichainTransactionsController to confirm the tx (10 s timeout)
   * 3. Call provider.approveDelegation
   * 4. Publish CardController:delegationCompleted
   */
  async #executeSolanaDelegation(solanaParams: {
    session: DelegationSession;
    provider: ICardProvider;
    tokens: CardAuthTokens;
    address: string;
    accountId?: string;
    tokenSymbol: string;
    tokenMint?: string;
    delegationContract?: string;
    amount: string;
    proofSignature: string;
    proofMessage: string;
    flow: 'onboarding' | 'manage' | 'enable' | null;
    caipChainId: string;
  }): Promise<void> {
    const {
      session,
      provider,
      tokens,
      address,
      accountId,
      tokenSymbol,
      tokenMint,
      delegationContract,
      amount,
      proofSignature,
      proofMessage,
      flow,
      caipChainId,
    } = solanaParams;

    // Submit the transaction via the Solana snap
    const snapResult = (await this.messenger.call(
      'SnapController:handleRequest',
      {
        snapId: SOLANA_WALLET_SNAP_ID as SnapId,
        origin: 'metamask',
        handler: HandlerType.OnClientRequest,
        request: {
          jsonrpc: '2.0',
          id: crypto.randomUUID(),
          method: 'approveCardAmount',
          params: {
            accountId,
            amount,
            mint: tokenMint,
            delegate: delegationContract,
            scope: SolScope.Mainnet,
          },
        },
      },
    )) as { signature: string } | null;

    if (!snapResult?.signature) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'No transaction signature returned from Solana snap',
      );
    }
    const txHash = snapResult.signature;

    // Wait for on-chain confirmation via MultichainTransactionsController
    await this.#waitForSolanaTxConfirmation(txHash);

    await provider.approveDelegation?.(
      {
        address,
        chainId: caipChainId,
        tokenSymbol,
        amount,
        txHash,
        proofSignature,
        proofMessage,
        sessionId: session.sessionId,
      },
      tokens,
    );

    await this.fetchCardHomeData();
    this.messenger.publish('CardController:delegationCompleted', { flow });
  }

  /**
   * Waits for a Solana tx (identified by its hash/signature) to appear as
   * confirmed or failed in MultichainTransactionsController state.
   * Rejects after 10 seconds if no confirmation is received.
   */
  #waitForSolanaTxConfirmation(txHash: string): Promise<void> {
    const TIMEOUT_MS = 10_000;

    const messenger = this.messenger;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      // Use a refs object so handleStateChange and the timeout callback share
      // a single mutable slot without triggering prefer-const or
      // no-use-before-define lint errors.
      const refs: {
        timeoutId?: ReturnType<typeof setTimeout>;
        unsubscribe?: () => void;
      } = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleStateChange = (controllerState: any) => {
        if (settled) return;

        const nonEvmTxs = controllerState?.nonEvmTransactions as Record<
          string,
          Record<string, { transactions?: { id: string; status: string }[] }>
        >;
        if (!nonEvmTxs) return;

        for (const accountTxs of Object.values(nonEvmTxs)) {
          for (const chainEntry of Object.values(accountTxs)) {
            const tx = chainEntry.transactions?.find((t) => t.id === txHash);
            if (!tx) continue;

            if (tx.status === 'confirmed') {
              settled = true;
              clearTimeout(refs.timeoutId);
              refs.unsubscribe?.();
              resolve();
              return;
            }
            if (tx.status === 'failed') {
              settled = true;
              clearTimeout(refs.timeoutId);
              refs.unsubscribe?.();
              reject(
                new Error('Solana delegation transaction failed on-chain'),
              );
              return;
            }
          }
        }
      };

      messenger.subscribe(
        'MultichainTransactionsController:stateChange',
        handleStateChange,
      );

      refs.unsubscribe = () => {
        try {
          messenger.unsubscribe(
            'MultichainTransactionsController:stateChange',
            handleStateChange,
          );
        } catch {
          // Already unsubscribed
        }
      };

      refs.timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          refs.unsubscribe?.();
          reject(new Error('Solana delegation tx confirmation timeout (10 s)'));
        }
      }, TIMEOUT_MS);
    });
  }
}
