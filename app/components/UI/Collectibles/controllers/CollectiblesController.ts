import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../providers/pack-partner/constants/environment';
import {
  BaseController,
  type ControllerGetStateAction,
  type ControllerStateChangedEvent,
  type StateMetadata,
} from '@metamask/base-controller';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { KeyringControllerUnlockEvent } from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import { isObject } from '@metamask/utils';
import {
  PackPartnerProvider,
  type PackPartnerProviderOptions,
} from '../providers/pack-partner/PackPartnerProvider';
import {
  getPersistedPackPartnerState,
  restorePackPartnerState,
  type PackPartnerState,
} from '../providers/pack-partner/state';
import type { CollectiblesControllerMethodActions } from './CollectiblesController-method-action-types';

export const COLLECTIBLES_CONTROLLER_NAME = 'CollectiblesController';

// State-bearing shapes must be type aliases to satisfy Json.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesControllerState = {
  packPartner: PackPartnerState;
  /** Legacy data without a marker belongs to mainnet. */
  packPartnerEnvironment?: PackPartnerEnvironment;
  packPartnerByEnvironment?: Partial<
    Record<PackPartnerEnvironment, PackPartnerState>
  >;
};

/** Creates the feature state, keeping each provider's data separate. */
export const getDefaultCollectiblesControllerState =
  (): CollectiblesControllerState => ({
    packPartner: restorePackPartnerState(undefined),
    packPartnerEnvironment: PACK_PARTNER_ENVIRONMENT,
    packPartnerByEnvironment: {},
  });

export type CollectiblesControllerGetStateAction = ControllerGetStateAction<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState
>;

export type CollectiblesControllerActions =
  | CollectiblesControllerGetStateAction
  | CollectiblesControllerMethodActions;

export type CollectiblesControllerEvents = ControllerStateChangedEvent<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState
>;

export type CollectiblesControllerMessenger = Messenger<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  | CollectiblesControllerActions
  | SnapControllerHandleRequestAction
  // Consumed: a terminal outcome refreshes the reads it changed. The cache
  // itself stays owned by the data service.
  | DataServiceInvalidateQueriesAction<'PackPartnerDataService'>,
  CollectiblesControllerEvents | KeyringControllerUnlockEvent
>;

const MESSENGER_EXPOSED_METHODS = [
  'generatePack',
  'completePack',
  'completePacks',
  'markPackRevealed',
  'sellCards',
  'dismissOperation',
  'recoverOperations',
  'checkSales',
  'sellCard',
] as const;

interface CollectiblesControllerOptions {
  messenger: CollectiblesControllerMessenger;
  state?: Partial<CollectiblesControllerState>;
  packPartner: Omit<
    PackPartnerProviderOptions,
    'getState' | 'updateState' | 'requestSnap' | 'invalidateQueries'
  >;
}

/**
 * Restores a development build's single provider namespace after a rename.
 * Only keys change: operation restoration and persistence remain standard.
 * Ambiguous journals must stop initialization before persistence can erase one.
 *
 * @param state - Stored controller projection.
 * @returns The projection with the current provider keys.
 */
const normalizeProviderKeys = (
  state: Partial<CollectiblesControllerState> | undefined,
): Partial<CollectiblesControllerState> | undefined => {
  if (!state) return state;
  const entries = Object.entries(state);
  const prefixes = new Set(
    entries.flatMap(([key, value]) => {
      if (key === 'packPartner') return [key];
      if (key.endsWith('Environment'))
        return [key.replace(/(?:By)?Environment$/u, '')];
      return isObject(value) && ('operations' in value || 'sales' in value)
        ? [key]
        : [];
    }),
  );
  if (prefixes.size > 1)
    throw new Error('Ambiguous Collectibles provider state');
  const [prefix] = prefixes;
  if (!prefix) return state;
  const stored: Record<string, unknown> = state;
  const journal = stored[prefix];
  const environment =
    stored[`${prefix}Environment`] === undefined
      ? 'mainnet'
      : stored[`${prefix}Environment`];
  const archives =
    stored[`${prefix}ByEnvironment`] === undefined
      ? {}
      : stored[`${prefix}ByEnvironment`];
  const isJournal = (value: unknown) =>
    isObject(value) &&
    isObject(value.operations) &&
    (value.sales === undefined || isObject(value.sales));
  if (
    (journal !== undefined && !isJournal(journal)) ||
    (environment !== 'mainnet' && environment !== 'devnet') ||
    !isObject(archives) ||
    Object.entries(archives).some(
      ([network, value]) =>
        (network !== 'mainnet' && network !== 'devnet') || !isJournal(value),
    ) ||
    (journal !== undefined && Object.hasOwn(archives, environment))
  ) {
    throw new Error('Invalid Collectibles provider network state');
  }
  // Shapes are checked above; existing restorePackPartnerState owns operations.
  return {
    packPartner: journal,
    packPartnerEnvironment: environment,
    packPartnerByEnvironment: archives,
  } as Partial<CollectiblesControllerState>;
};

/**
 * Owns the Collectibles operation journal and runs its workflows: pack
 * purchases, openings and buybacks. Server reads (catalogue, pools, owned
 * cards, offers) are not state: they belong to `PackPartnerDataService`.
 * Interrupted operations resume when the wallet unlocks, whichever screen is
 * shown.
 */
export class CollectiblesController extends BaseController<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState,
  CollectiblesControllerMessenger
> {
  readonly #packPartner: PackPartnerProvider;

  constructor({
    messenger,
    state: persistedState,
    packPartner,
  }: CollectiblesControllerOptions) {
    const state = normalizeProviderKeys(persistedState);
    const now = packPartner.now ?? Date.now;
    const previousEnvironment = state?.packPartnerEnvironment ?? 'mainnet';
    const archived = { ...state?.packPartnerByEnvironment };
    if (
      state?.packPartner &&
      previousEnvironment !== PACK_PARTNER_ENVIRONMENT
    ) {
      archived[previousEnvironment] = state.packPartner;
    }
    const activeState =
      previousEnvironment === PACK_PARTNER_ENVIRONMENT
        ? (state?.packPartner ?? archived[PACK_PARTNER_ENVIRONMENT])
        : archived[PACK_PARTNER_ENVIRONMENT];
    delete archived[PACK_PARTNER_ENVIRONMENT];
    const restoredArchive = Object.fromEntries(
      Object.entries(archived).map(([environment, providerState]) => [
        environment,
        restorePackPartnerState(providerState),
      ]),
    );
    const metadata: StateMetadata<CollectiblesControllerState> = {
      packPartnerEnvironment: {
        persist: true,
        includeInStateLogs: true,
        includeInDebugSnapshot: true,
        usedInUi: false,
      },
      packPartnerByEnvironment: {
        persist: (environments) =>
          Object.fromEntries(
            Object.entries(environments ?? {}).map(
              ([environment, providerState]) => [
                environment,
                getPersistedPackPartnerState(providerState, now()),
              ],
            ),
          ),
        includeInStateLogs: false,
        includeInDebugSnapshot: false,
        usedInUi: false,
      },
      packPartner: {
        persist: (providerState) =>
          getPersistedPackPartnerState(providerState, now()),
        includeInStateLogs: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
      },
    };
    super({
      name: COLLECTIBLES_CONTROLLER_NAME,
      metadata,
      messenger,
      state: {
        packPartnerEnvironment: PACK_PARTNER_ENVIRONMENT,
        packPartnerByEnvironment: restoredArchive,
        packPartner: restorePackPartnerState(activeState),
      },
    });
    this.#packPartner = new PackPartnerProvider({
      ...packPartner,
      environment: PACK_PARTNER_ENVIRONMENT,
      invalidateQueries: (queryKey) =>
        this.messenger.call('PackPartnerDataService:invalidateQueries', {
          queryKey,
        }),
      getState: () => this.state.packPartner,
      updateState: (recipe) => {
        this.update((draft) => {
          const nextState = recipe(draft.packPartner);
          if (nextState !== undefined) {
            draft.packPartner = nextState;
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
    // Recovery is tied to the wallet, not to a screen: a purchase or sale
    // interrupted by a crash resumes as soon as the wallet is unlocked again.
    this.messenger.subscribe('KeyringController:unlock', () => {
      this.#recoverAllAccounts().catch(() => undefined);
    });
  }

  /** Resumes the interrupted operations of every account with a journal. */
  async #recoverAllAccounts(): Promise<void> {
    const { operations, sales } = this.state.packPartner;
    const addresses = new Set([
      ...Object.keys(operations),
      ...Object.keys(sales),
    ]);
    await Promise.all(
      [...addresses].map((address) =>
        this.#packPartner.recoverOperations({ address }),
      ),
    );
  }

  /**
   * Prepares a purchase with the pack's provider.
   *
   * @param params - Account and pack to buy.
   */
  generatePack(params: Parameters<PackPartnerProvider['generatePack']>[0]) {
    return this.#packPartner.generatePack(params);
  }

  /**
   * Completes a purchase through its provider.
   *
   * @param params - Account and purchase memo.
   */
  completePack(params: Parameters<PackPartnerProvider['completePack']>[0]) {
    return this.#packPartner.completePack(params);
  }

  /**
   * Completes each transaction of the already reviewed purchase.
   *
   * @param params - Account and batch entry memo.
   */
  completePacks(params: Parameters<PackPartnerProvider['completePacks']>[0]) {
    return this.#packPartner.completePacks(params);
  }

  /**
   * Saves the reveal position independently of payment and opening.
   */
  markPackRevealed(
    params: Parameters<PackPartnerProvider['markPackRevealed']>[0],
  ): void {
    this.#packPartner.markPackRevealed(params);
  }

  /**
   * Sells the selected cards at their individually confirmed minimum amounts.
   *
   * @param params - Account and reviewed mint/amount pairs.
   */
  sellCards(params: Parameters<PackPartnerProvider['sellCards']>[0]) {
    return this.#packPartner.sellCards(params);
  }

  /**
   * Lets the provider dismiss a finished operation.
   *
   * @param params - Account and operation memo.
   */
  dismissOperation(
    params: Parameters<PackPartnerProvider['dismissOperation']>[0],
  ) {
    return this.#packPartner.dismissOperation(params);
  }

  /**
   * Resumes the account's interrupted purchases and buybacks by memo. Never
   * signs, never submits and never throws.
   *
   * @param params - Solana address to recover.
   */
  recoverOperations(
    params: Parameters<PackPartnerProvider['recoverOperations']>[0],
  ) {
    return this.#packPartner.recoverOperations(params);
  }

  /**
   * Checks the account's pending buybacks by memo, without waiting on
   * purchases. Never signs, never submits and never throws.
   *
   * @param params - Solana address whose sales are checked.
   */
  checkSales(params: Parameters<PackPartnerProvider['checkSales']>[0]) {
    return this.#packPartner.checkSales(params);
  }

  /**
   * Sells a card through its provider at no less than the confirmed amount.
   *
   * @param params - Account, card mint, its standard and the refund shown to the user.
   */
  sellCard(params: Parameters<PackPartnerProvider['sellCard']>[0]) {
    return this.#packPartner.sellCard(params);
  }

  /**
   * Invalidates provider work and clears feature state when the wallet resets.
   */
  clearState(): void {
    this.#packPartner.clearState();
    // Reset every network archive as well as the active provider. Otherwise a
    // later environment switch could restore the previous wallet's operations.
    this.update(() => getDefaultCollectiblesControllerState());
  }
}
