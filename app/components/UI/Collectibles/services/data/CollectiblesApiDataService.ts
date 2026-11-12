import { collectiblesQueries, uniqueBatch } from './collectiblesQueries';
import {
  BaseDataService,
  type DataServiceActions,
  type DataServiceEvents,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import { QueryCache } from '@tanstack/query-core';
import type { Json } from '@metamask/utils';
import type { CollectiblesApiClient } from '../clients/CollectiblesApiClient';

const NAME = 'CollectiblesApiDataService';
type Client = CollectiblesApiClient;
type Result<Key extends keyof Client> = Awaited<ReturnType<Client[Key]>>;
type Request<Key extends keyof Client> = Parameters<Client[Key]>[0];
type Method =
  | 'getPackInsights'
  | 'getLastOpened'
  | 'getWalletHistory'
  | 'getPokedex'
  | 'getWalletSummary';
export type CollectiblesApiDataServiceActions =
  | {
      [Key in Method]: {
        type: `${typeof NAME}:${Key}`;
        handler: CollectiblesApiDataService[Key];
      };
    }[Method]
  | DataServiceActions<typeof NAME>;
export type CollectiblesApiDataServiceEvents = DataServiceEvents<typeof NAME>;
export type CollectiblesApiDataServiceMessenger = Messenger<
  typeof NAME,
  CollectiblesApiDataServiceActions,
  CollectiblesApiDataServiceEvents
>;

/** Background-owned API cache. The transport client is injected at initialization. */
export class CollectiblesApiDataService extends BaseDataService<
  typeof NAME,
  CollectiblesApiDataServiceMessenger
> {
  readonly #client: Client;
  readonly #cache: QueryCache;

  constructor(options: {
    messenger: CollectiblesApiDataServiceMessenger;
    client: Client;
  }) {
    const cache = new QueryCache();
    super({
      name: NAME,
      messenger: options.messenger,
      queryClientConfig: {
        queryCache: cache,
        // This background client is not mounted: reads must reach the transport
        // rather than pause waiting for a reconnect it cannot observe.
        defaultOptions: {
          queries: { gcTime: 5 * 60_000, networkMode: 'always' },
        },
      },
      // Surface failed reads to the caller; mutations are never retried here.
      policyOptions: { maxRetries: 0 },
    });
    this.#client = options.client;
    this.#cache = cache;
    options.messenger.registerActionHandler(
      'CollectiblesApiDataService:getPackInsights',
      this.getPackInsights.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesApiDataService:getLastOpened',
      this.getLastOpened.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesApiDataService:getWalletHistory',
      this.getWalletHistory.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesApiDataService:getPokedex',
      this.getPokedex.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesApiDataService:getWalletSummary',
      this.getWalletSummary.bind(this),
    );
  }

  getPackInsights(
    scope: string,
    request: Request<'getPackInsights'>,
  ): Promise<Result<'getPackInsights'>> {
    const normalized = {
      ...request,
      packTypes: uniqueBatch(request.packTypes),
    };
    return this.fetchQuery({
      queryKey: collectiblesQueries.api('getPackInsights', scope, normalized),
      staleTime: 2000,
      queryFn: () =>
        this.#client.getPackInsights(normalized) as Promise<
          Json & Result<'getPackInsights'>
        >,
    });
  }

  getLastOpened(
    scope: string,
    request: Request<'getLastOpened'>,
  ): Promise<Result<'getLastOpened'>> {
    const normalized = { ...request, cardIds: uniqueBatch(request.cardIds) };
    return this.fetchQuery({
      queryKey: collectiblesQueries.api('getLastOpened', scope, normalized),
      staleTime: 10000,
      queryFn: () =>
        this.#client.getLastOpened(normalized) as Promise<
          Json & Result<'getLastOpened'>
        >,
    });
  }

  getWalletHistory(
    scope: string,
    request: Omit<Request<'getWalletHistory'>, 'cursor'>,
    cursor?: string,
  ): Promise<Result<'getWalletHistory'>> {
    return this.fetchInfiniteQuery(
      {
        queryKey: collectiblesQueries.api('getWalletHistory', scope, request),
        staleTime: 10000,
        gcTime: 5 * 60_000,
        maxPages: 10,
        initialPageParam: null as string | null,
        queryFn: ({ pageParam }) =>
          this.#client.getWalletHistory({
            ...request,
            cursor: pageParam ?? undefined,
          }) as Promise<Json & Result<'getWalletHistory'>>,
        getNextPageParam: (page) => page.nextCursor,
      },
      cursor ?? null,
    );
  }

  getPokedex(
    scope: string,
    request: Request<'getPokedex'>,
  ): Promise<Result<'getPokedex'>> {
    return this.fetchQuery({
      queryKey: collectiblesQueries.api('getPokedex', scope, request),
      staleTime: 10000,
      queryFn: () =>
        this.#client.getPokedex(request) as Promise<
          Json & Result<'getPokedex'>
        >,
    });
  }

  getWalletSummary(
    scope: string,
    request: Request<'getWalletSummary'>,
  ): Promise<Result<'getWalletSummary'>> {
    return this.fetchQuery({
      queryKey: collectiblesQueries.api('getWalletSummary', scope, request),
      staleTime: 10000,
      queryFn: () =>
        this.#client.getWalletSummary(request) as Promise<
          Json & Result<'getWalletSummary'>
        >,
    });
  }

  /** Clear server data when the wallet is reset; nothing is persisted. */
  clearCache(): void {
    this.#cache.clear();
  }
}
