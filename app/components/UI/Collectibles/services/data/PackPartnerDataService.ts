import type {
  PackPartnerOpeningFilters,
  PackPartnerOpening,
} from '../../providers/pack-partner/types/openings';
import {
  BaseDataService,
  createServicePolicy,
  handleWhen,
  type DataServiceActions,
  type DataServiceEvents,
  type QueryKey,
  type ServicePolicy,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import type { Json } from '@metamask/utils';
import {
  array,
  is,
  literal,
  number,
  type as struct,
} from '@metamask/superstruct';
import type {
  StorageServiceGetItemAction,
  StorageServiceSetItemAction,
  StorageServiceClearAction,
} from '@metamask/storage-service';
import {
  hashKey,
  partialMatchKey,
  onlineManager,
  QueryCache,
  type InvalidateOptions,
  type InvalidateQueryFilters,
} from '@tanstack/query-core';
import Logger from '../../../../../util/Logger';
import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../../providers/pack-partner/constants/environment';
import { PACK_PARTNER_TIMINGS } from '../../providers/pack-partner/constants/packPartner';
import type { PackPartnerApi } from '../clients/PackPartnerApiClient';
import { throwIfReadAborted } from '../clients/PackPartnerApiClient.utils';
import {
  createPackPartnerError,
  toPackPartnerError,
} from '../../providers/pack-partner/services/errors';
import {
  PpWalletCardStruct,
  type PpWalletCard,
} from '../../providers/pack-partner/schemas/packPartner';
import type {
  PackPartnerBuyback,
  PackPartnerCard,
  PackPartnerPack,
} from '../../providers/pack-partner/types/packPartner';
import type {
  PackPartnerInventoryCard,
  PackPartnerInventoryPage,
} from '../../providers/pack-partner/types/inventory';
import {
  createLimiter,
  mapWithConcurrency,
} from '../../providers/pack-partner/utils/async';
import {
  buybackFromAvailability,
  cardFromWalletCard,
  inventoryCardFromNft,
  isInBuybackWindow,
  sortOwnedCards,
} from '../../providers/pack-partner/utils/cards';
import { openingsFromWinners } from '../../providers/pack-partner/utils/openings';
import { toPacks } from '../../providers/pack-partner/utils/packs';
import { packPartnerQueries } from './packPartnerQueries';

export const PACK_PARTNER_DATA_SERVICE_NAME = 'PackPartnerDataService' as const;
type Name = typeof PACK_PARTNER_DATA_SERVICE_NAME;

// Persist only complete ownership responses, not catalogue entries, offers or
// operations. Reuse transport validation when restoring a local snapshot.
const OwnedCardsSnapshotStruct = struct({
  version: literal(1),
  updatedAt: number(),
  cards: array(PpWalletCardStruct),
});
const ownedCardsStorageKey = (
  environment: PackPartnerEnvironment,
  address: string,
): string => `ownedCards:${environment}:${address}`;

/** Number of packs whose first inventory page is read at once for Greatest Hits. */
const GREATEST_HITS_CONCURRENCY = 3;

/** Size of the Greatest Hits ranking. */
const GREATEST_HITS_LIMIT = 20;

/**
 * How long a read's circuit stays open after repeated retryable failures. Short,
 * so a brief PackPartner outage never blocks a screen for long.
 */
const CIRCUIT_BREAK_DURATION = 30_000;

/** Bound on the remembered read keys that invalidation refreshes. */
const MAX_READ_KEYS = 128;

/**
 * Whether a read key matches invalidation filters, with the key matching
 * TanStack uses: keyless filters match everything, exact filters compare
 * hashes, otherwise the key must extend the filter key.
 *
 * @param queryKey - Key of a read.
 * @param filters - Invalidation filters.
 * @returns True when the read must be refreshed.
 */
const matchesReadFilters = (
  queryKey: QueryKey,
  filters?: InvalidateQueryFilters<QueryKey>,
): boolean => {
  const filterKey = filters?.queryKey;
  if (!filterKey) {
    return true;
  }
  if (filters.exact) {
    return hashKey(queryKey) === hashKey(filterKey);
  }
  return partialMatchKey(queryKey, filterKey);
};

/**
 * Whether a read error is safe to retry: network failures, timeouts, rate
 * limits and 5xx responses, normalized as `PackPartnerError`.
 *
 * @param error - Error thrown by the HTTP client.
 * @returns True for retryable errors.
 */
const isRetryableRead = (error: unknown): boolean =>
  !(error instanceof Error && error.name === 'AbortError') &&
  toPackPartnerError(error).retryable;

export interface PackPartnerDataServiceGetPacksAction {
  type: `${Name}:getPacks`;
  handler: PackPartnerDataService['getPacks'];
}

export interface PackPartnerDataServiceGetPackInventoryAction {
  type: `${Name}:getPackInventory`;
  handler: PackPartnerDataService['getPackInventory'];
}

export interface PackPartnerDataServiceGetGreatestHitsAction {
  type: `${Name}:getGreatestHits`;
  handler: PackPartnerDataService['getGreatestHits'];
}

export interface PackPartnerDataServiceGetOwnedCardsAction {
  type: `${Name}:getOwnedCards`;
  handler: PackPartnerDataService['getOwnedCards'];
}

export interface PackPartnerDataServiceGetBuybackOfferAction {
  type: `${Name}:getBuybackOffer`;
  handler: PackPartnerDataService['getBuybackOffer'];
}

export interface PackPartnerDataServiceGetRecentOpeningsAction {
  type: `${Name}:getRecentOpenings`;
  handler: PackPartnerDataService['getRecentOpenings'];
}

export type PackPartnerDataServiceActions =
  | PackPartnerDataServiceGetPacksAction
  | PackPartnerDataServiceGetPackInventoryAction
  | PackPartnerDataServiceGetGreatestHitsAction
  | PackPartnerDataServiceGetOwnedCardsAction
  | PackPartnerDataServiceGetBuybackOfferAction
  | PackPartnerDataServiceGetRecentOpeningsAction
  | DataServiceActions<Name>
  | StorageServiceGetItemAction
  | StorageServiceSetItemAction
  | StorageServiceClearAction;

export type PackPartnerDataServiceEvents = DataServiceEvents<Name>;

export type PackPartnerDataServiceMessenger = Messenger<
  Name,
  PackPartnerDataServiceActions,
  PackPartnerDataServiceEvents
>;

export interface PackPartnerDataServiceOptions {
  messenger: PackPartnerDataServiceMessenger;
  /** Validated PackPartner HTTP client, used for reads only. */
  api: PackPartnerApi;
  now?: () => number;
}

/**
 * Owns the cached, retryable PackPartner server reads: the pack catalogue,
 * pack pools, Greatest Hits, public openings, the cards a wallet owns and
 * buyback offers. Each read maps PackPartner payloads to Collectibles types.
 * Writes and settlement checks belong to the purchase and sale workflow, which
 * uses its own uncached client. `usePackPartnerOpenings` polls this service
 * and owns only the bounded presentation queue.
 */
export class PackPartnerDataService extends BaseDataService<
  Name,
  PackPartnerDataServiceMessenger
> {
  readonly #api: PackPartnerApi;
  readonly #now: () => number;
  readonly #queryCache: QueryCache;
  readonly #packsPolicy: ServicePolicy;
  readonly #inventoryPolicy: ServicePolicy;
  readonly #ownedCardsPolicy: ServicePolicy;
  readonly #buybackPolicy: ServicePolicy;
  readonly #openingsPolicy: ServicePolicy;
  /** Offer reads in flight are bounded: PackPartner reads them one NFT at a time. */
  readonly #offerSlots = createLimiter(
    PACK_PARTNER_TIMINGS.BUYBACK_CHECK_CONCURRENCY,
  );
  /**
   * Keys of the reads served recently, most recent last. Invalidation refreshes
   * from this list, not from the cache, so a read a screen still shows is
   * refreshed even after its background entry was collected.
   */
  readonly #readKeys = new Map<string, QueryKey>();
  #cacheGeneration = 0;
  // Serialize disk writes and reset so an earlier write cannot resurrect a wallet.
  #storageWrites: Promise<void> = Promise.resolve();

  constructor({
    messenger,
    api,
    now = Date.now,
  }: PackPartnerDataServiceOptions) {
    const queryCache = new QueryCache();
    super({
      name: PACK_PARTNER_DATA_SERVICE_NAME,
      messenger,
      queryClientConfig: {
        queryCache,
        // The background client is never mounted, so a fetch paused while
        // offline would never resume. Offline requests fail fast instead and
        // the read policies retry them; the UI gates reads on connectivity.
        defaultOptions: {
          queries: { gcTime: 5 * 60_000, networkMode: 'always' },
        },
      },
      // Inert pass-through policy. Retries and circuit breaking live in the
      // per-read policies below, so one failing endpoint cannot open the
      // circuit for the others.
      policyOptions: {
        maxRetries: 0,
        maxConsecutiveFailures: Number.MAX_SAFE_INTEGER,
        retryFilterPolicy: handleWhen(isRetryableRead),
        isServiceFailure: isRetryableRead,
      },
    });
    this.#api = api;
    this.#now = now;
    this.#queryCache = queryCache;
    this.#packsPolicy = this.#createReadPolicy();
    this.#inventoryPolicy = this.#createReadPolicy();
    this.#ownedCardsPolicy = this.#createReadPolicy();
    this.#buybackPolicy = this.#createReadPolicy();
    this.#openingsPolicy = this.#createReadPolicy();

    messenger.registerActionHandler(
      `${PACK_PARTNER_DATA_SERVICE_NAME}:getPacks`,
      this.getPacks.bind(this),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER_DATA_SERVICE_NAME}:getPackInventory`,
      this.getPackInventory.bind(this),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER_DATA_SERVICE_NAME}:getGreatestHits`,
      this.getGreatestHits.bind(this),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER_DATA_SERVICE_NAME}:getOwnedCards`,
      this.getOwnedCards.bind(this),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER_DATA_SERVICE_NAME}:getBuybackOffer`,
      this.getBuybackOffer.bind(this),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER_DATA_SERVICE_NAME}:getRecentOpenings`,
      this.getRecentOpenings.bind(this),
    );
  }

  #createReadPolicy(): ServicePolicy {
    return createServicePolicy({
      maxRetries: 2,
      circuitBreakDuration: CIRCUIT_BREAK_DURATION,
      retryFilterPolicy: handleWhen(isRetryableRead),
      isServiceFailure: isRetryableRead,
    });
  }

  /**
   * Public, currently open packs.
   *
   * @param environment - PackPartner environment of the caller.
   * @returns The packs, sorted for display.
   */
  getPacks(environment: PackPartnerEnvironment): Promise<PackPartnerPack[]> {
    this.#assertEnvironment(environment);
    const descriptor = packPartnerQueries.getPacks(environment);
    this.#rememberRead(descriptor.queryKey);
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      gcTime: 0,
      queryFn: ({ signal }) =>
        this.#packsPolicy.execute(
          () => this.#readPacks(signal) as Promise<Json & PackPartnerPack[]>,
        ),
    });
  }

  /**
   * One page of a pack's live pool. Public data, never holdings.
   *
   * @param environment - PackPartner environment of the caller.
   * @param packCode - Pack machine code.
   * @param cursor - Cursor of the page, undefined for the first page.
   * @returns The page.
   */
  getPackInventory(
    environment: PackPartnerEnvironment,
    packCode: string,
    cursor?: string,
  ): Promise<PackPartnerInventoryPage> {
    this.#assertEnvironment(environment);
    const descriptor = packPartnerQueries.getPackInventory(
      environment,
      packCode,
    );
    this.#rememberRead(descriptor.queryKey);
    return this.fetchInfiniteQuery(
      {
        queryKey: descriptor.queryKey,
        staleTime: descriptor.staleTime,
        maxPages: 10,
        initialPageParam: null as string | null,
        queryFn: ({ pageParam, signal }) =>
          this.#inventoryPolicy.execute(() =>
            this.#readPackInventory(packCode, pageParam ?? undefined, signal),
          ),
        getNextPageParam: (page) => page.nextCursor ?? null,
      },
      cursor ?? null,
    );
  }

  /**
   * The highest insured values in the current pools of open packs, one entry
   * per mint. Not an all-time ranking.
   *
   * @param environment - PackPartner environment of the caller.
   * @returns The ranking.
   */
  getGreatestHits(
    environment: PackPartnerEnvironment,
  ): Promise<PackPartnerInventoryCard[]> {
    this.#assertEnvironment(environment);
    const descriptor = packPartnerQueries.getGreatestHits(environment);
    this.#rememberRead(descriptor.queryKey);
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      // Reuses the catalogue and first-page pool entries: a screen loading
      // both never reads the same endpoints twice.
      queryFn: async ({ signal }) => {
        const packs = await this.getPacks(environment);
        throwIfReadAborted(signal);
        const pages = await mapWithConcurrency(
          packs,
          GREATEST_HITS_CONCURRENCY,
          async (pack) => {
            // Child entries may serve another screen: stop scheduling this
            // ranking's reads without cancelling shared catalogue/pool reads.
            throwIfReadAborted(signal);
            return (await this.getPackInventory(environment, pack.code)).cards;
          },
        );
        return [
          ...new Map(pages.flat().map((card) => [card.mint, card])).values(),
        ]
          .sort((a, b) => (b.insuredValue ?? 0) - (a.insuredValue ?? 0))
          .slice(0, GREATEST_HITS_LIMIT) as Json & PackPartnerInventoryCard[];
      },
    });
  }

  /**
   * The cards a wallet owns, newest first, as PackPartner's cards API
   * reports them. That inventory is authoritative: it is read only when
   * complete, and is never merged with local state. Offers are not copied in:
   * each one is its own `getBuybackOffer` read. A card's buyback is `unknown`
   * while PackPartner may still buy it back, `unavailable` after the window.
   *
   * @param environment - PackPartner environment of the caller.
   * @param address - Solana address of the wallet.
   * @returns The owned cards.
   */
  async getOwnedCards(
    environment: PackPartnerEnvironment,
    address: string,
  ): Promise<PackPartnerCard[]> {
    this.#assertEnvironment(environment);
    const generation = this.#cacheGeneration;
    const descriptor = packPartnerQueries.getOwnedCards(environment, address);
    const storageKey = ownedCardsStorageKey(environment, address);
    this.#rememberRead(descriptor.queryKey);
    let query = this.#queryCache.find({
      queryKey: descriptor.queryKey,
      exact: true,
    });

    if (!query?.state.data) {
      // Lazy disk hydration also runs offline. It publishes through the normal
      // DataService query bridge before an online refresh starts.
      try {
        await this.#storageWrites;
        const { result } = await this.messenger.call(
          'StorageService:getItem',
          this.name,
          storageKey,
        );
        if (generation !== this.#cacheGeneration)
          throw new Error('Collection reset');
        if (
          is(result, OwnedCardsSnapshotStruct) &&
          Number.isFinite(result.updatedAt) &&
          result.updatedAt > 0
        ) {
          const restoredCards = this.#mapOwnedCards(result.cards) as Json &
            PackPartnerCard[];
          const existing = this.#queryCache.find({
            queryKey: descriptor.queryKey,
            exact: true,
          });
          if (existing?.state.data === undefined) {
            if (existing) {
              // A prior failed read may already have created this query.
              // Restore its data without resetting an online refresh
              // that is already in flight.
              existing.setData(restoredCards, {
                updatedAt: result.updatedAt,
                manual: true,
              });
            } else {
              await this.fetchQuery<Json & PackPartnerCard[]>({
                queryKey: descriptor.queryKey,
                initialData: restoredCards,
                initialDataUpdatedAt: result.updatedAt,
                staleTime: Infinity,
                queryFn: () => {
                  throw new Error('Snapshot restoration must not fetch');
                },
              });
            }
            // Always revalidate restored data, including after a device clock change.
            await super.invalidateQueries({
              queryKey: descriptor.queryKey,
              exact: true,
              refetchType: 'none',
            });
          }
        }
      } catch {
        // A missing/unreadable snapshot must never prevent an online read.
      }
      query = this.#queryCache.find({
        queryKey: descriptor.queryKey,
        exact: true,
      });
    }
    if (generation !== this.#cacheGeneration) {
      throw createPackPartnerError({ code: 'NETWORK_ERROR' });
    }
    if (!onlineManager.isOnline()) {
      if (query?.state.data !== undefined) {
        await super.invalidateQueries({
          queryKey: descriptor.queryKey,
          exact: true,
          refetchType: 'none',
        });
        return query.state.data as PackPartnerCard[];
      }
      throw createPackPartnerError({ code: 'NETWORK_ERROR' });
    }
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      // The disk snapshot survives normal query garbage collection.
      queryFn: async ({ signal }) => {
        const walletCards = await this.#ownedCardsPolicy.execute(() =>
          this.#api.getWalletCards({ address }, { signal }),
        );
        throwIfReadAborted(signal);
        if (generation !== this.#cacheGeneration)
          throw createPackPartnerError({ code: 'NETWORK_ERROR' });
        const snapshot = {
          version: 1,
          updatedAt: this.#now(),
          cards: walletCards,
        };
        this.#storageWrites = this.#storageWrites
          .then(async () => {
            if (generation === this.#cacheGeneration) {
              await this.messenger.call(
                'StorageService:setItem',
                this.name,
                storageKey,
                snapshot as Json,
              );
            }
          })
          .catch(() => {
            Logger.error(
              new Error('Owned collection snapshot write failed'),
              'Collectibles: collection persistence',
            );
          });
        return this.#mapOwnedCards(walletCards) as Json & PackPartnerCard[];
      },
    });
  }

  #mapOwnedCards(walletCards: PpWalletCard[]): PackPartnerCard[] {
    const now = this.#now();
    return sortOwnedCards(
      walletCards.map((walletCard) => {
        const card = cardFromWalletCard(walletCard);
        return isInBuybackWindow(card, now)
          ? card
          : { ...card, buyback: { status: 'unavailable' as const } };
      }),
    );
  }

  /**
   * PackPartner's current buyback offer for a card. It does not prove
   * ownership, and is not the amount a sale signs: the sale re-checks the
   * offer and the refund of the buyback transaction itself.
   *
   * @param environment - PackPartner environment of the caller.
   * @param mint - Card mint.
   * @returns The offer.
   */
  getBuybackOffer(
    environment: PackPartnerEnvironment,
    mint: string,
  ): Promise<PackPartnerBuyback> {
    this.#assertEnvironment(environment);
    const descriptor = packPartnerQueries.getBuybackOffer(environment, mint);
    this.#rememberRead(descriptor.queryKey);
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: ({ signal }) =>
        this.#offerSlots(() =>
          this.#buybackPolicy.execute(
            async () =>
              buybackFromAvailability(
                await this.#api.getBuybackAvailability({ mint }, { signal }),
              ) as Json & PackPartnerBuyback,
          ),
        ),
    });
  }

  /**
   * Public opening snapshots for all endpoint filters. Sequential reads are
   * always fresh; concurrent identical reads coalesce. The UI hook owns polling
   * and bounded, paced presentation. Public data, never holdings.
   *
   * @param environment - PackPartner environment of the caller.
   * @param filters - Endpoint filters; omit packType for every pack.
   * @returns The openings, newest first.
   */
  getRecentOpenings(
    environment: PackPartnerEnvironment,
    filters: PackPartnerOpeningFilters,
  ): Promise<PackPartnerOpening[]> {
    this.#assertEnvironment(environment);
    const descriptor = packPartnerQueries.getRecentOpenings(
      environment,
      filters,
    );
    this.#rememberRead(descriptor.queryKey);
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: ({ signal }) =>
        this.#openingsPolicy.execute(
          async () =>
            openingsFromWinners(
              await this.#api.getRecentOpenings(filters, { signal }),
              filters.wallet || filters.perTier ? '' : (filters.packType ?? ''),
              Infinity,
            ) as Json & PackPartnerOpening[],
        ),
    });
  }

  /**
   * Refreshes the reads named by `filters` and republishes them. The base
   * implementation only marks entries stale: this cache is never observed, so
   * its refetch-on-invalidate is inert and the `cacheUpdated` events the UI
   * query client hydrates from would keep the old data.
   *
   * Every recently served read whose key matches is re-read through the
   * action its key names (the react-data-query contract: `[action,
   * ...arguments]`), which republishes it with a newer `dataUpdatedAt`, even
   * when its background entry was already collected. A read in flight began
   * before the change: the refresh would join it, so it is read once more
   * after it settles.
   *
   * @param filters - Optional filter for selecting specific reads.
   * @param options - Additional optional options for query invalidations.
   */
  async invalidateQueries(
    filters?: InvalidateQueryFilters<QueryKey>,
    options?: InvalidateOptions,
  ): Promise<void> {
    const generation = this.#cacheGeneration;
    const keys = [...this.#readKeys.values()].filter((queryKey) =>
      matchesReadFilters(queryKey, filters),
    );
    const inFlight = new Set(
      keys
        .filter(
          (queryKey) =>
            this.#queryCache.find({ queryKey, exact: true })?.state
              .fetchStatus === 'fetching',
        )
        .map((queryKey) => hashKey(queryKey)),
    );
    await super.invalidateQueries({ ...filters, refetchType: 'none' }, options);
    // A wallet reset must discard this refresh as well as the cached entries.
    if (generation !== this.#cacheGeneration) {
      return;
    }
    // A failed refresh keeps the prior data and must not fail the caller: the
    // read stays stale only until its next fetch.
    await Promise.all(
      keys.map(async (queryKey) => {
        try {
          await this.#reread(queryKey);
          if (
            generation === this.#cacheGeneration &&
            inFlight.has(hashKey(queryKey))
          ) {
            await super.invalidateQueries({
              queryKey,
              exact: true,
              refetchType: 'none',
            });
            if (generation === this.#cacheGeneration) {
              await this.#reread(queryKey);
            }
          }
        } catch (error) {
          Logger.error(
            toPackPartnerError(error),
            'Collectibles: failed to refresh a PackPartner read on invalidation',
          );
        }
      }),
    );
  }

  /**
   * Drops every cached read when the wallet resets. Entries are removed, not
   * invalidated: a stale entry would republish the previous wallet's data.
   *
   * @returns Completion of pending snapshot writes and namespace deletion.
   */
  clearCache(): Promise<void> {
    this.#cacheGeneration += 1;
    this.#queryCache.clear();
    this.#readKeys.clear();
    const reset = this.#storageWrites.then(() =>
      this.messenger.call('StorageService:clear', this.name),
    );
    this.#storageWrites = reset.catch(() => undefined);
    return reset;
  }

  /**
   * Remembers a served read for invalidation, as the most recent one, and
   * forgets the least recently served read past the bound.
   *
   * @param queryKey - Key of the read.
   */
  #rememberRead(queryKey: QueryKey): void {
    const hash = hashKey(queryKey);
    this.#readKeys.delete(hash);
    this.#readKeys.set(hash, queryKey);
    if (this.#readKeys.size > MAX_READ_KEYS) {
      const oldest = this.#readKeys.keys().next();
      if (!oldest.done) {
        this.#readKeys.delete(oldest.value);
      }
    }
  }

  async #readPacks(signal: AbortSignal): Promise<PackPartnerPack[]> {
    const [machines, status] = await Promise.all([
      this.#api.getMachines({ signal }),
      this.#api.getStatus({ signal }),
    ]);
    return toPacks(machines, status);
  }

  /** One inventory projection for both pack pages and Greatest Hits. */
  async #readPackInventory(
    packCode: string,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<Json & PackPartnerInventoryPage> {
    const page = await this.#api.getInventory(
      { code: packCode, cursor },
      { signal },
    );
    return {
      cards: page.nfts.map((nft) => ({
        ...inventoryCardFromNft(nft),
        sourcePackCode: packCode,
      })),
      ...(page.hasMore && page.nextCursor
        ? { nextCursor: page.nextCursor }
        : {}),
    } as Json & PackPartnerInventoryPage;
  }

  /**
   * Reads a cached entry again through the action its key names.
   *
   * @param queryKey - Key of the entry: the action, then its arguments.
   * @returns The read, or nothing for a key of no known read.
   */
  async #reread(queryKey: QueryKey): Promise<unknown> {
    const [action, environment, argument] = queryKey as readonly [
      string,
      PackPartnerEnvironment,
      string | undefined,
    ];
    switch (action) {
      case `${PACK_PARTNER_DATA_SERVICE_NAME}:getPacks`:
        return this.getPacks(environment);
      case `${PACK_PARTNER_DATA_SERVICE_NAME}:getPackInventory`:
        return this.getPackInventory(environment, argument ?? '');
      case `${PACK_PARTNER_DATA_SERVICE_NAME}:getGreatestHits`:
        return this.getGreatestHits(environment);
      case `${PACK_PARTNER_DATA_SERVICE_NAME}:getOwnedCards`:
        return this.getOwnedCards(environment, argument ?? '');
      case `${PACK_PARTNER_DATA_SERVICE_NAME}:getBuybackOffer`:
        return this.getBuybackOffer(environment, argument ?? '');
      case `${PACK_PARTNER_DATA_SERVICE_NAME}:getRecentOpenings`:
        return this.getRecentOpenings(
          environment,
          queryKey[2] as PackPartnerOpeningFilters,
        );
      default:
        return undefined;
    }
  }

  #assertEnvironment(environment: PackPartnerEnvironment): void {
    if (environment !== PACK_PARTNER_ENVIRONMENT) {
      throw new Error('PackPartner environment mismatch.');
    }
  }
}
