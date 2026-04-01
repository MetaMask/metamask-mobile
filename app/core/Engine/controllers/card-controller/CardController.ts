import { BaseController, type StateMetadata } from '@metamask/base-controller';
import Logger from '../../../../util/Logger';
import {
  CARD_CONTROLLER_NAME,
  type CardControllerMessenger,
  type CardControllerState,
} from './types';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardAuthSession,
  type CardAuthResult,
  type CardAuthStep,
  type CardCredentials,
  type ICardProvider,
} from './provider-types';
import { CardTokenStore } from './CardTokenStore';
import { isEthAccount } from '../../../Multichain/utils';

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
};

export const defaultCardControllerState: CardControllerState = {
  selectedCountry: null,
  activeProviderId: 'baanx',
  isAuthenticated: false,
  cardholderAccounts: [],
  providerData: {},
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
  #cardholderCheckTimer: ReturnType<typeof setTimeout> | undefined;

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

    try {
      const results = await Promise.all(
        batches.map((batch) =>
          this.#fetchCardholderBatch(batch, accountsApiUrl),
        ),
      );
      this.update((s) => {
        s.cardholderAccounts = results.flat();
      });
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', operation: 'checkCardholderAccounts' },
        context: {
          name: 'CardController',
          data: { accountCount: caipAccountIds.length },
        },
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
    this.update((s) => {
      s.isAuthenticated = false;
      (s.providerData as unknown as Record<string, Record<string, string>>)[
        pid
      ] = {};
    });
  }

  async validateAndRefreshSession(): Promise<{
    isAuthenticated: boolean;
    location?: string;
  }> {
    const pid = this.state.activeProviderId;
    if (!pid) {
      this.markUnauthenticated();
      return { isAuthenticated: false };
    }
    const tokens = await CardTokenStore.get(pid);

    if (!tokens) {
      this.markUnauthenticated();
      return { isAuthenticated: false };
    }

    const provider = this.getActiveProvider();
    const validity = provider.validateTokens(tokens);

    if (validity === 'valid') {
      this.update((s) => {
        s.isAuthenticated = true;
        (s.providerData as unknown as Record<string, Record<string, string>>)[
          pid
        ] = {
          ...((
            s.providerData as unknown as Record<string, Record<string, string>>
          )[pid] ?? {}),
          location: tokens.location,
        };
      });
      return { isAuthenticated: true, location: tokens.location };
    }

    if (validity === 'needs_refresh') {
      try {
        const newTokens = await provider.refreshTokens(tokens);
        await CardTokenStore.set(pid, newTokens);
        this.update((s) => {
          s.isAuthenticated = true;
          (s.providerData as unknown as Record<string, Record<string, string>>)[
            pid
          ] = {
            ...((
              s.providerData as unknown as Record<
                string,
                Record<string, string>
              >
            )[pid] ?? {}),
            location: newTokens.location,
          };
        });
        return { isAuthenticated: true, location: newTokens.location };
      } catch (error) {
        Logger.error(error as Error, {
          tags: { feature: 'card', provider: pid },
          context: {
            name: 'CardController',
            data: { method: 'validateAndRefreshSession' },
          },
        });
        await this.clearTokens();
        this.markUnauthenticated();
        return { isAuthenticated: false };
      }
    }

    // expired
    await this.clearTokens();
    this.markUnauthenticated();
    return { isAuthenticated: false };
  }
}
