import { persistCollectiblesNow } from '../../../../store/persistConfig/collectiblesPersistence';
import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../providers/pack-partner/constants/environment';
import {
  BaseController,
  deriveStateFromMetadata,
  type ControllerGetStateAction,
  type ControllerStateChangedEvent,
  type StateMetadata,
} from '@metamask/base-controller';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import type { KeyringControllerUnlockEvent } from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';
import { isObject } from '@metamask/utils';
import { PackPartnerProvider } from '../providers/pack-partner/PackPartnerProvider';
import type { PackPartnerApi } from '../services/clients/PackPartnerApiClient';
import {
  getPersistedPackPartnerState,
  restorePackPartnerState,
  type PackPartnerState,
} from '../providers/pack-partner/state';

export const COLLECTIBLES_CONTROLLER_NAME = 'CollectiblesController';

// State-bearing shapes must be type aliases to satisfy Json.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesControllerState = {
  hasCompletedOnboarding: boolean;
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
    hasCompletedOnboarding: false,
    packPartner: restorePackPartnerState(undefined),
    packPartnerEnvironment: PACK_PARTNER_ENVIRONMENT,
    packPartnerByEnvironment: {},
  });

export type CollectiblesControllerGetStateAction = ControllerGetStateAction<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState
>;

export type CollectiblesControllerActions =
  CollectiblesControllerGetStateAction;

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

interface CollectiblesControllerOptions {
  messenger: CollectiblesControllerMessenger;
  state?: Partial<CollectiblesControllerState>;
  persist?: (state: unknown) => Promise<void>;
  packPartner: { api: PackPartnerApi; now?: () => number };
}

/**
 * Restores a development build's single provider namespace after a rename.
 * Only keys change: operation restoration and persistence remain standard.
 * Reject layouts whose operations cannot be attributed to one provider and network.
 *
 * @param state - Stored controller projection.
 * @returns The projection with the current provider keys.
 */
const normalizeProviderKeys = (
  state: Partial<CollectiblesControllerState> | undefined,
): Partial<CollectiblesControllerState> | undefined => {
  if (state === undefined) return state;
  if (!isObject(state)) throw new Error('Invalid Collectibles provider state');
  const entries = Object.entries(state).filter(
    ([key]) => key !== 'hasCompletedOnboarding',
  );
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
  if (!entries.length) return state;
  if (
    !prefix ||
    entries.some(
      ([key]) =>
        key !== prefix &&
        key !== `${prefix}Environment` &&
        key !== `${prefix}ByEnvironment`,
    )
  )
    throw new Error('Unrecognized Collectibles provider state');
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
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    packPartner: journal,
    packPartnerEnvironment: environment,
    packPartnerByEnvironment: archives,
  } as Partial<CollectiblesControllerState>;
};

/** Restore the active network and its archives before exposing anything to Redux. */
const restoreControllerState = (
  persistedState: Partial<CollectiblesControllerState> | undefined,
): CollectiblesControllerState => {
  const state = normalizeProviderKeys(persistedState);
  const previousEnvironment = state?.packPartnerEnvironment ?? 'mainnet';
  const archived = { ...state?.packPartnerByEnvironment };
  if (state?.packPartner && previousEnvironment !== PACK_PARTNER_ENVIRONMENT) {
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
  return {
    hasCompletedOnboarding: state?.hasCompletedOnboarding === true,
    packPartnerEnvironment: PACK_PARTNER_ENVIRONMENT,
    packPartnerByEnvironment: restoredArchive,
    packPartner: restorePackPartnerState(activeState),
  };
};

/** Hydrates and resets the wallet journal shared with Engine persistence. */
export class CollectiblesController extends BaseController<
  typeof COLLECTIBLES_CONTROLLER_NAME,
  CollectiblesControllerState,
  CollectiblesControllerMessenger
> {
  protected readonly packPartner: PackPartnerProvider;

  readonly #checkpoint: () => Promise<void>;

  #journalQuarantined: boolean;

  /** Filesystem persistence must preserve an unreadable journal until a wallet reset succeeds. */
  get isJournalQuarantined(): boolean {
    return this.#journalQuarantined;
  }

  constructor({
    persist = persistCollectiblesNow,
    messenger,
    state: persistedState,
    packPartner,
  }: CollectiblesControllerOptions) {
    let state: CollectiblesControllerState;
    let quarantined = false;
    try {
      state = restoreControllerState(persistedState);
    } catch {
      // Keep the unreadable journal on disk. Other wallet features can still start.
      state = getDefaultCollectiblesControllerState();
      quarantined = true;
    }
    const now = packPartner.now ?? Date.now;
    const metadata: StateMetadata<CollectiblesControllerState> = {
      hasCompletedOnboarding: {
        persist: true,
        includeInStateLogs: true,
        includeInDebugSnapshot: true,
        usedInUi: true,
      },
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
      state,
    });
    this.#journalQuarantined = quarantined;
    this.#checkpoint = async () => {
      const projection = deriveStateFromMetadata(
        this.state,
        metadata,
        'persist',
      );
      // BaseController can omit a field when its metadata deriver throws.
      if (
        !Object.hasOwn(projection, 'packPartner') ||
        !Object.hasOwn(projection, 'packPartnerByEnvironment')
      ) {
        throw new Error('Incomplete Collectibles recovery journal');
      }
      return persist(projection);
    };
    this.packPartner = new PackPartnerProvider(packPartner.api);
  }

  /**
   * Invalidates provider work and clears feature state when the wallet resets.
   */
  async clearState(): Promise<void> {
    // Reset every network archive as well as the active provider. Otherwise a
    // later environment switch could restore the previous wallet's operations.
    this.update(() => getDefaultCollectiblesControllerState());
    await this.#checkpoint();
    this.#journalQuarantined = false;
  }
}
