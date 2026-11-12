import type { PackPartnerOpeningFilters } from '../../../app/components/UI/Collectibles/providers/pack-partner/types/openings';
import { MockCollectiblesApiClient } from '../../../app/components/UI/Collectibles/services/clients/MockCollectiblesApiClient';
import { MockCollectiblesSocialApiClient } from '../../../app/components/UI/Collectibles/services/clients/MockCollectiblesSocialApiClient';
import Engine from '../../../app/core/Engine';
import { BaseDataService, type QueryKey } from '@metamask/base-data-service';
import type { Json } from '@metamask/utils';
import {
  hashKey,
  partialMatchKey,
  type InvalidateOptions,
  type InvalidateQueryFilters,
} from '@tanstack/query-core';
import type { CollectiblesApiClient } from '../../../app/components/UI/Collectibles/services/clients/CollectiblesApiClient';
import type { CollectiblesSocialApiClient } from '../../../app/components/UI/Collectibles/services/clients/CollectiblesSocialApiClient';
import type {
  CollectiblesBuyback,
  CollectiblesCard,
  CollectiblesPack,
  CollectiblesInventoryCard,
  CollectiblesInventoryPage,
  CollectiblesOpening,
} from '../../../app/components/UI/Collectibles/types';
import type { PackPartnerEnvironment } from '../../../app/components/UI/Collectibles/providers/pack-partner/constants';
import {
  CollectiblesApiDataService,
  type CollectiblesApiDataServiceActions,
  type CollectiblesApiDataServiceEvents,
} from '../../../app/components/UI/Collectibles/services/data/CollectiblesApiDataService';
import {
  CollectiblesSocialApiDataService,
  type CollectiblesSocialApiDataServiceActions,
  type CollectiblesSocialApiDataServiceEvents,
} from '../../../app/components/UI/Collectibles/services/data/CollectiblesSocialApiDataService';
import type {
  PackPartnerDataServiceActions,
  PackPartnerDataServiceEvents,
  PackPartnerDataServiceMessenger,
} from '../../../app/components/UI/Collectibles/services/data/PackPartnerDataService';
import {
  packPartnerQueries,
  type PackPartnerQueryDescriptor,
} from '../../../app/components/UI/Collectibles/services/data/packPartnerQueries';
import { Messenger } from '@metamask/messenger';

const PACK_PARTNER = 'PackPartnerDataService';

/** Clients supplied to the real optional data services at the Engine boundary. */
interface CollectiblesFixtureClients {
  collectiblesApi: CollectiblesApiClient;
  socialApi: CollectiblesSocialApiClient;
}

let fixtureClients: CollectiblesFixtureClients = {
  collectiblesApi: new MockCollectiblesApiClient(),
  socialApi: new MockCollectiblesSocialApiClient(),
};

/**
 * Supplies endpoint responses without inventing read methods on the Controller.
 *
 * @param clients - Clients injected into the real optional data services.
 */
export const setCollectiblesFixtureClients = (
  clients: CollectiblesFixtureClients,
): void => {
  fixtureClients = clients;
};

/**
 * PackPartner's answers to the `PackPartnerDataService` reads, one mock
 * per read, called with the read's parameters after the environment. An
 * answer configured on a mock always wins; a mock without an answer serves
 * the data passed to `serveOwnedCards` / `serveBuybackOffers` /
 * `serveRecentOpenings`, else nothing: no pack, an empty pool, no owned card,
 * no offer and no opening. Reset before each test.
 */
export const packPartnerReads = {
  getPacks: jest.fn<Promise<CollectiblesPack[]>, []>(),
  getPackInventory: jest.fn<
    Promise<CollectiblesInventoryPage>,
    [packCode: string, cursor?: string | null]
  >(),
  getGreatestHits: jest.fn<Promise<CollectiblesInventoryCard[]>, []>(),
  getOwnedCards: jest.fn<Promise<CollectiblesCard[]>, [address: string]>(),
  getBuybackOffer: jest.fn<Promise<CollectiblesBuyback>, [mint: string]>(),
  getRecentOpenings: jest.fn<
    Promise<CollectiblesOpening[]>,
    [filters: PackPartnerOpeningFilters]
  >(),
};

const servedOwnedCards = new Map<string, CollectiblesCard[]>();
const servedOffers = new Map<string, CollectiblesBuyback>();
const servedOpenings = new Map<string, CollectiblesOpening[]>();

/**
 * Sets the cards PackPartner reports for a wallet, newest first, as
 * `getOwnedCards` returns them. Replaces the previous list of that wallet.
 *
 * @param address - Solana address of the wallet.
 * @param cards - Owned cards.
 */
export const serveOwnedCards = (
  address: string,
  cards: CollectiblesCard[],
): void => {
  servedOwnedCards.set(address, cards);
};

/**
 * Sets PackPartner's current buyback offers, by mint, as
 * `getBuybackOffer` returns them. A mint without an offer is unavailable.
 *
 * @param offers - Offers by mint.
 */
export const serveBuybackOffers = (
  offers: Record<string, CollectiblesBuyback>,
): void => {
  Object.entries(offers).forEach(([mint, offer]) =>
    servedOffers.set(mint, offer),
  );
};

/**
 * Sets the REST snapshot of a pack's latest public openings, newest first, as
 * `getRecentOpenings` returns it. An empty code is the every-pack feed.
 *
 * @param packCode - Pack machine code, empty for every pack.
 * @param openings - Openings of the snapshot.
 */
export const serveRecentOpenings = (
  packCode: string,
  openings: CollectiblesOpening[],
): void => {
  servedOpenings.set(packCode, openings);
};

beforeEach(() => {
  Object.values(packPartnerReads).forEach((read) => read.mockReset());
  servedOwnedCards.clear();
  servedOffers.clear();
  servedOpenings.clear();
  fixtureClients = {
    collectiblesApi: new MockCollectiblesApiClient(),
    socialApi: new MockCollectiblesSocialApiClient(),
  };
});

/**
 * The answer a test configured on a read mock, else its default.
 *
 * @param answer - Return value of the read mock, undefined without an answer.
 * @param fallback - Default answer.
 * @returns The answer.
 */
const answerWith = (
  answer: Promise<unknown> | undefined,
  fallback: () => unknown,
): Promise<unknown> => answer ?? Promise.resolve(fallback());

/**
 * Answers one PackPartner read, the environment already dropped.
 *
 * @param method - `PackPartnerDataService` read name.
 * @param params - Read parameters after the environment.
 * @returns The read result.
 */
const readPackPartner = (
  method: string,
  params: unknown[],
): Promise<unknown> => {
  switch (method) {
    case 'getPacks':
      return answerWith(packPartnerReads.getPacks(), () => []);
    case 'getGreatestHits':
      return answerWith(packPartnerReads.getGreatestHits(), () => []);
    case 'getPackInventory': {
      const [packCode, cursor] = params as [string, string | null | undefined];
      return answerWith(
        packPartnerReads.getPackInventory(packCode, cursor),
        () => ({ cards: [] }),
      );
    }
    case 'getOwnedCards': {
      const [address] = params as [string];
      return answerWith(
        packPartnerReads.getOwnedCards(address),
        () => servedOwnedCards.get(address) ?? [],
      );
    }
    case 'getBuybackOffer': {
      const [mint] = params as [string];
      return answerWith(
        packPartnerReads.getBuybackOffer(mint),
        () => servedOffers.get(mint) ?? { status: 'unavailable' },
      );
    }
    case 'getRecentOpenings': {
      const [filters] = params as [PackPartnerOpeningFilters];
      return answerWith(
        packPartnerReads.getRecentOpenings(filters),
        () => servedOpenings.get(filters.packType ?? '') ?? [],
      );
    }
    default:
      return Promise.reject(
        new Error(`Missing Collectibles fixture: ${method}`),
      );
  }
};

const invoke = (target: unknown, method: string, args: unknown[]): unknown => {
  const handler = (target as Record<string, unknown> | undefined)?.[method];
  if (typeof handler !== 'function')
    throw new Error(`Missing Collectibles fixture: ${method}`);
  return (handler as (...parameters: unknown[]) => unknown).apply(target, args);
};

/** Test-only adapter for domain fixtures, used through the production query descriptors. */
export async function callCollectiblesFixture(
  action: string,
  ...args: unknown[]
): Promise<Json> {
  const [service, method] = action.split(':');
  if (method === 'invalidateQueries') return null;
  if (service === PACK_PARTNER) {
    return (await readPackPartner(method, args.slice(1))) as Json;
  }
  const context =
    service === 'CollectiblesApiDataService'
      ? fixtureClients.collectiblesApi
      : fixtureClients.socialApi;
  const request = {
    ...(args[1] as object),
    ...(args[2] ? { cursor: args[2] } : {}),
  };
  return (await invoke(context, method, [request])) as Json;
}

/**
 * Whether a cached read matches invalidation filters, as TanStack matches
 * keys: no key matches everything, `exact` compares hashes, otherwise the
 * read key must extend the filter key.
 *
 * @param queryKey - Key of the cached read.
 * @param filters - Invalidation filters.
 * @returns True when the read must be refreshed.
 */
const matchesFilters = (
  queryKey: QueryKey,
  filters?: InvalidateQueryFilters<QueryKey>,
): boolean => {
  const filterKey = filters?.queryKey;
  if (!filterKey) return true;
  if (filters.exact) return hashKey(queryKey) === hashKey(filterKey);
  return partialMatchKey(queryKey, filterKey);
};

/**
 * `PackPartnerDataService` as the UI sees it, answering from
 * `packPartnerReads`. Owned cards, offers and openings snapshots are
 * cached with their production stale times and publish `cacheUpdated`, so a
 * refresh after a workflow outcome (`refreshPackPartnerReads`) reaches
 * mounted screens. Public catalogue reads are passed through uncached.
 */
class PackPartnerFixtureDataService extends BaseDataService<
  typeof PACK_PARTNER,
  PackPartnerDataServiceMessenger
> {
  readonly #reads = new Map<
    string,
    { queryKey: QueryKey; refresh: () => Promise<unknown> }
  >();

  constructor(messenger: PackPartnerDataServiceMessenger) {
    super({
      name: PACK_PARTNER,
      messenger,
      // Fixture failures describe PackPartner outcomes: never retried,
      // and they never open the circuit for the next scenario step.
      policyOptions: {
        maxRetries: 0,
        maxConsecutiveFailures: Number.MAX_SAFE_INTEGER,
      },
    });
    messenger.registerActionHandler(
      `${PACK_PARTNER}:getPacks`,
      () => readPackPartner('getPacks', []) as Promise<CollectiblesPack[]>,
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER}:getPackInventory`,
      (_environment, packCode, cursor) =>
        readPackPartner('getPackInventory', [
          packCode,
          cursor,
        ]) as Promise<CollectiblesInventoryPage>,
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER}:getGreatestHits`,
      () =>
        readPackPartner('getGreatestHits', []) as Promise<
          CollectiblesInventoryCard[]
        >,
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER}:getOwnedCards`,
      (environment, address) =>
        this.#read<CollectiblesCard[]>(
          packPartnerQueries.getOwnedCards(environment, address),
          'getOwnedCards',
          [address],
        ),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER}:getBuybackOffer`,
      (environment, mint) =>
        this.#read<CollectiblesBuyback>(
          packPartnerQueries.getBuybackOffer(environment, mint),
          'getBuybackOffer',
          [mint],
        ),
    );
    messenger.registerActionHandler(
      `${PACK_PARTNER}:getRecentOpenings`,
      (environment, filters) =>
        this.#read<CollectiblesOpening[]>(
          packPartnerQueries.getRecentOpenings(environment, filters),
          'getRecentOpenings',
          [filters],
        ),
    );
  }

  /**
   * Marks the matching reads stale, then reads them again, like the
   * production service: the UI hydrates the republished entries.
   *
   * @param filters - Reads to refresh.
   * @param options - Invalidation options.
   */
  async invalidateQueries(
    filters?: InvalidateQueryFilters<QueryKey>,
    options?: InvalidateOptions,
  ): Promise<void> {
    await super.invalidateQueries({ ...filters, refetchType: 'none' }, options);
    await Promise.all(
      [...this.#reads.values()]
        .filter((read) => matchesFilters(read.queryKey, filters))
        .map((read) => read.refresh().catch(() => undefined)),
    );
  }

  destroy(): void {
    this.#reads.clear();
    super.destroy();
  }

  #read<Value>(
    descriptor: PackPartnerQueryDescriptor<[string, ...Json[]]>,
    method: string,
    params: unknown[],
  ): Promise<Value> {
    const refresh = () => this.#read<Value>(descriptor, method, params);
    this.#reads.set(hashKey(descriptor.queryKey), {
      queryKey: descriptor.queryKey,
      refresh,
    });
    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: async () => (await readPackPartner(method, params)) as Json,
    }) as Promise<Value>;
  }
}

/**
 * Refreshes PackPartner reads the way the purchase and sale workflow does
 * after a terminal outcome: through `PackPartnerDataService:invalidateQueries`.
 * Mounted screens receive the new answers of `packPartnerReads`.
 *
 * @param queryKey - Key or key prefix of the reads, from `packPartnerQueries`.
 */
export const refreshPackPartnerReads = async (
  queryKey: readonly [string, ...string[]],
): Promise<void> => {
  await (
    Engine.controllerMessenger.call as unknown as (
      action: string,
      filters: { queryKey: readonly [string, ...string[]] },
    ) => Promise<void>
  )(`${PACK_PARTNER}:invalidateQueries`, { queryKey });
};

/** Install only the mocked Engine boundary. Data-service query and mutation policies stay real. */
let disposeServices: (() => void) | undefined;
afterEach(() => disposeServices?.());

export function installCollectiblesFixtureServices() {
  disposeServices?.();
  // Let the global fixed unit clock progress for cache hydration, retaining the
  // fixture time origin so previously prepared offer/operation expiries remain valid.
  const previousNow = Date.now;
  const clockOrigin = previousNow();
  const startedAt = new Date().getTime();
  Date.now = () => clockOrigin + new Date().getTime() - startedAt;
  const dataMessenger = new Messenger<
    'CollectiblesFixture',
    | CollectiblesApiDataServiceActions
    | CollectiblesSocialApiDataServiceActions
    | PackPartnerDataServiceActions,
    | CollectiblesApiDataServiceEvents
    | CollectiblesSocialApiDataServiceEvents
    | PackPartnerDataServiceEvents
  >({ namespace: 'CollectiblesFixture' });
  const api = new CollectiblesApiDataService({
    messenger: new Messenger({
      namespace: 'CollectiblesApiDataService',
      parent: dataMessenger,
    }),
    client: fixtureClients.collectiblesApi,
  });
  const social = new CollectiblesSocialApiDataService({
    messenger: new Messenger({
      namespace: 'CollectiblesSocialApiDataService',
      parent: dataMessenger,
    }),
    client: fixtureClients.socialApi,
  });
  const packPartner = new PackPartnerFixtureDataService(
    new Messenger({ namespace: PACK_PARTNER, parent: dataMessenger }),
  );
  Object.assign(Engine.context, {
    CollectiblesApiDataService: api,
    CollectiblesSocialApiDataService: social,
  });
  const isDataServiceEvent = (event: string) =>
    event.startsWith('CollectiblesApiDataService:') ||
    event.startsWith('CollectiblesSocialApiDataService:') ||
    event.startsWith(`${PACK_PARTNER}:`);
  const messenger = Engine.controllerMessenger;
  jest
    .mocked(messenger.call)
    .mockImplementation(((action: string, ...params: unknown[]) =>
      (
        dataMessenger.call.bind(dataMessenger) as (
          action: string,
          ...args: unknown[]
        ) => unknown
      )(action, ...params)) as typeof messenger.call);
  jest.mocked(messenger.subscribe).mockImplementation(((
    event: string,
    listener: (...args: unknown[]) => void,
  ) => {
    if (isDataServiceEvent(event))
      dataMessenger.subscribe(
        event as Parameters<typeof dataMessenger.subscribe>[0],
        listener,
      );
  }) as typeof messenger.subscribe);
  jest.mocked(messenger.unsubscribe).mockImplementation(((
    event: string,
    listener: (...args: unknown[]) => void,
  ) => {
    if (isDataServiceEvent(event))
      dataMessenger.unsubscribe(
        event as Parameters<typeof dataMessenger.unsubscribe>[0],
        listener,
      );
  }) as typeof messenger.unsubscribe);
  disposeServices = () => {
    api.destroy();
    social.destroy();
    packPartner.destroy();
    Date.now = previousNow;
    disposeServices = undefined;
  };
  return disposeServices;
}
