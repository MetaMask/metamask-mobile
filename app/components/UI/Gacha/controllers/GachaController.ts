import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangedEvent,
  type StateMetadata,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import {
  CollectorCryptProvider,
  type CollectorCryptProviderOptions,
} from '../providers/collector-crypt';
import {
  getDefaultCollectorCryptState,
  getPersistedCollectorCryptState,
  type CollectorCryptState,
} from '../providers/collector-crypt/state';
import type { GachaControllerMethodActions } from './GachaController-method-action-types';

export const GACHA_CONTROLLER_NAME = 'GachaController';

// State-bearing shapes must be type aliases to satisfy Json.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GachaControllerState = {
  hasCompletedOnboarding: boolean;
  collectorCrypt: CollectorCryptState;
};

/** Creates the feature state, keeping each provider's data separate. */
export const getDefaultGachaControllerState = (): GachaControllerState => ({
  hasCompletedOnboarding: false,
  collectorCrypt: getDefaultCollectorCryptState(),
});

export type GachaControllerGetStateAction = ControllerGetStateAction<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerState
>;

export type GachaControllerActions =
  | GachaControllerGetStateAction
  | GachaControllerMethodActions;

export type GachaControllerEvents = ControllerStateChangedEvent<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerState
>;

export type GachaControllerMessenger = Messenger<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerActions | SnapControllerHandleRequestAction,
  GachaControllerEvents
>;

const MESSENGER_EXPOSED_METHODS = [
  'completeOnboarding',
  'resetOnboarding',
  'getPacks',
  'generatePack',
  'completePack',
  'dismissOperation',
  'recoverOperations',
  'syncCards',
  'refreshBuyback',
  'sellCard',
] as const;

interface GachaControllerOptions {
  messenger: GachaControllerMessenger;
  state?: Partial<GachaControllerState>;
  collectorCrypt?: Omit<
    CollectorCryptProviderOptions,
    'getState' | 'updateState' | 'requestSnap'
  >;
}

/** Owns Gacha state and delegates business operations to its providers. */
export class GachaController extends BaseController<
  typeof GACHA_CONTROLLER_NAME,
  GachaControllerState,
  GachaControllerMessenger
> {
  readonly #collectorCrypt: CollectorCryptProvider;

  constructor({
    messenger,
    state,
    collectorCrypt = {},
  }: GachaControllerOptions) {
    const now = collectorCrypt.now ?? Date.now;
    const metadata: StateMetadata<GachaControllerState> = {
      hasCompletedOnboarding: {
        persist: true,
        includeInStateLogs: true,
        includeInDebugSnapshot: true,
        usedInUi: true,
      },
      collectorCrypt: {
        persist: (providerState) =>
          getPersistedCollectorCryptState(providerState, now()),
        includeInStateLogs: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
      },
    };
    super({
      name: GACHA_CONTROLLER_NAME,
      metadata,
      messenger,
      state: {
        hasCompletedOnboarding: state?.hasCompletedOnboarding ?? false,
        collectorCrypt: {
          ...getDefaultCollectorCryptState(),
          ...state?.collectorCrypt,
        },
      },
    });
    this.#collectorCrypt = new CollectorCryptProvider({
      ...collectorCrypt,
      getState: () => this.state.collectorCrypt,
      updateState: (recipe) => {
        this.update((draft) => {
          const nextState = recipe(draft.collectorCrypt);
          if (nextState !== undefined) {
            draft.collectorCrypt = nextState;
          }
        });
      },
      requestSnap: (args) =>
        this.messenger.call('SnapController:handleRequest', args),
    });
    this.messenger.registerMethodActionHandlers(
      this,
      MESSENGER_EXPOSED_METHODS,
    );
  }

  /**
   * Records onboarding completion once for the wallet, across all accounts.
   */
  completeOnboarding(): void {
    this.update((draft) => {
      draft.hasCompletedOnboarding = true;
    });
  }

  /**
   * Allows onboarding to be replayed without changing provider data.
   */
  resetOnboarding(): void {
    this.update((draft) => {
      draft.hasCompletedOnboarding = false;
    });
  }

  /**
   * Returns the packs available from the current provider.
   */
  getPacks() {
    return this.#collectorCrypt.getPacks();
  }

  /**
   * Prepares a purchase with the pack's provider.
   *
   * @param params - Account and pack to buy.
   */
  generatePack(params: Parameters<CollectorCryptProvider['generatePack']>[0]) {
    return this.#collectorCrypt.generatePack(params);
  }

  /**
   * Completes a purchase through its provider.
   *
   * @param params - Account and purchase memo.
   */
  completePack(params: Parameters<CollectorCryptProvider['completePack']>[0]) {
    return this.#collectorCrypt.completePack(params);
  }

  /**
   * Lets the provider dismiss a finished operation.
   *
   * @param params - Account and operation memo.
   */
  dismissOperation(
    params: Parameters<CollectorCryptProvider['dismissOperation']>[0],
  ) {
    return this.#collectorCrypt.dismissOperation(params);
  }

  /**
   * Asks the provider to recover its interrupted operations.
   *
   * @param params - Account to recover.
   */
  recoverOperations(
    params: Parameters<CollectorCryptProvider['recoverOperations']>[0],
  ) {
    return this.#collectorCrypt.recoverOperations(params);
  }

  /**
   * Synchronizes the account's cards through the provider.
   *
   * @param params - Account to synchronize, and whether to bypass the NFT API cache.
   */
  syncCards(params: Parameters<CollectorCryptProvider['syncCards']>[0]) {
    return this.#collectorCrypt.syncCards(params);
  }

  /**
   * Refreshes a card's buyback offer through its provider.
   *
   * @param params - Account and card mint.
   */
  refreshBuyback(
    params: Parameters<CollectorCryptProvider['refreshBuyback']>[0],
  ) {
    return this.#collectorCrypt.refreshBuyback(params);
  }

  /**
   * Sells a card through its provider at no less than the confirmed amount.
   *
   * @param params - Account, card mint and the refund shown to the user.
   */
  sellCard(params: Parameters<CollectorCryptProvider['sellCard']>[0]) {
    return this.#collectorCrypt.sellCard(params);
  }

  /**
   * Invalidates provider work and clears feature state when the wallet resets.
   */
  clearState(): void {
    this.#collectorCrypt.clearState();
    this.resetOnboarding();
  }
}
