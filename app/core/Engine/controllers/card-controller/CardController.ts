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

  private markAuthenticated(): void {
    this.update((s) => {
      s.isAuthenticated = true;
    });
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
      this.markAuthenticated();
      return { isAuthenticated: true, location: tokens.location };
    }

    if (validity === 'needs_refresh') {
      try {
        const newTokens = await provider.refreshTokens(tokens);
        await CardTokenStore.set(pid, newTokens);
        this.markAuthenticated();
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
