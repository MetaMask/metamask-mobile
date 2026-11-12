import { collectiblesQueries, uniqueBatch } from './collectiblesQueries';
import { isCollectiblesFollowQuery } from './queryKeys';
import {
  isSocialEngagementQuery,
  isSocialPublicationQuery,
} from './socialInvalidation';
import {
  BaseDataService,
  type DataServiceActions,
  type DataServiceEvents,
} from '@metamask/base-data-service';
import type { Messenger } from '@metamask/messenger';
import { QueryCache, type Query } from '@tanstack/query-core';
import type { Json } from '@metamask/utils';
import type { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';

const NAME = 'CollectiblesSocialApiDataService';
type Client = CollectiblesSocialApiClient;
type Result<Key extends keyof Client> = Awaited<ReturnType<Client[Key]>>;
type Request<Key extends keyof Client> = Parameters<Client[Key]>[0];
type Method =
  | 'getPackSocialContext'
  | 'getLeaderboard'
  | 'getFeed'
  | 'getProfile'
  | 'setFollow'
  | 'getProfileFavoritePacks'
  | 'getProfileCollectibles'
  | 'getProfilePokedex'
  | 'getComments'
  | 'addComment'
  | 'setReaction'
  | 'shareCards';
export type CollectiblesSocialApiDataServiceActions =
  | {
      [Key in Method]: {
        type: `${typeof NAME}:${Key}`;
        handler: CollectiblesSocialApiDataService[Key];
      };
    }[Method]
  | DataServiceActions<typeof NAME>;
export type CollectiblesSocialApiDataServiceEvents = DataServiceEvents<
  typeof NAME
>;
export type CollectiblesSocialApiDataServiceMessenger = Messenger<
  typeof NAME,
  CollectiblesSocialApiDataServiceActions,
  CollectiblesSocialApiDataServiceEvents
>;

/** Background-owned API cache. The transport client is injected at initialization. */
export class CollectiblesSocialApiDataService extends BaseDataService<
  typeof NAME,
  CollectiblesSocialApiDataServiceMessenger
> {
  readonly #client: Client;
  readonly #cache: QueryCache;

  constructor(options: {
    messenger: CollectiblesSocialApiDataServiceMessenger;
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
      'CollectiblesSocialApiDataService:getPackSocialContext',
      this.getPackSocialContext.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getLeaderboard',
      this.getLeaderboard.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getFeed',
      this.getFeed.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getProfile',
      this.getProfile.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:setFollow',
      this.setFollow.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getProfileFavoritePacks',
      this.getProfileFavoritePacks.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getProfileCollectibles',
      this.getProfileCollectibles.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getProfilePokedex',
      this.getProfilePokedex.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:getComments',
      this.getComments.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:addComment',
      this.addComment.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:setReaction',
      this.setReaction.bind(this),
    );
    options.messenger.registerActionHandler(
      'CollectiblesSocialApiDataService:shareCards',
      this.shareCards.bind(this),
    );
  }

  getPackSocialContext(
    scope: string,
    request: Request<'getPackSocialContext'>,
  ): Promise<Result<'getPackSocialContext'>> {
    const normalized = {
      ...request,
      packTypes: uniqueBatch(request.packTypes),
    };
    return this.fetchQuery({
      queryKey: collectiblesQueries.social(
        'getPackSocialContext',
        scope,
        normalized,
      ),
      staleTime: 10000,
      queryFn: () =>
        this.#client.getPackSocialContext(normalized) as Promise<
          Json & Result<'getPackSocialContext'>
        >,
    });
  }

  getLeaderboard(
    scope: string,
    request: Omit<Request<'getLeaderboard'>, 'cursor'>,
    cursor?: string,
  ): Promise<Result<'getLeaderboard'>> {
    return this.fetchInfiniteQuery(
      {
        queryKey: collectiblesQueries.social('getLeaderboard', scope, request),
        staleTime: 300000,
        gcTime: 5 * 60_000,
        maxPages: 10,
        initialPageParam: null as string | null,
        queryFn: ({ pageParam }) =>
          this.#client.getLeaderboard({
            ...request,
            cursor: pageParam ?? undefined,
          }) as Promise<Json & Result<'getLeaderboard'>>,
        getNextPageParam: (page) => page.nextCursor,
      },
      cursor ?? null,
    );
  }

  getFeed(
    scope: string,
    request: Omit<Request<'getFeed'>, 'cursor'>,
    cursor?: string,
  ): Promise<Result<'getFeed'>> {
    return this.fetchInfiniteQuery(
      {
        queryKey: collectiblesQueries.social('getFeed', scope, request),
        staleTime: 10000,
        gcTime: 5 * 60_000,
        maxPages: 10,
        initialPageParam: null as string | null,
        queryFn: ({ pageParam }) =>
          this.#client.getFeed({
            ...request,
            cursor: pageParam ?? undefined,
          }) as Promise<Json & Result<'getFeed'>>,
        getNextPageParam: (page) => page.nextCursor,
      },
      cursor ?? null,
    );
  }

  getProfile(
    scope: string,
    request: Request<'getProfile'>,
  ): Promise<Result<'getProfile'>> {
    return this.fetchQuery({
      queryKey: collectiblesQueries.social('getProfile', scope, request),
      staleTime: 10000,
      queryFn: () =>
        this.#client.getProfile(request) as Promise<
          Json & Result<'getProfile'>
        >,
    });
  }

  async setFollow(
    scope: string,
    request: Request<'setFollow'>,
  ): Promise<Result<'setFollow'>> {
    const result = await this.#client.setFollow(request);
    await this.#refreshChangedQueries((query) =>
      isCollectiblesFollowQuery(scope, query, request.profileId),
    );
    return result;
  }

  getProfileFavoritePacks(
    scope: string,
    request: Request<'getProfileFavoritePacks'>,
  ): Promise<Result<'getProfileFavoritePacks'>> {
    return this.fetchQuery({
      queryKey: collectiblesQueries.social(
        'getProfileFavoritePacks',
        scope,
        request,
      ),
      staleTime: 30_000,
      queryFn: () =>
        this.#client.getProfileFavoritePacks(request) as Promise<
          Json & Result<'getProfileFavoritePacks'>
        >,
    });
  }

  getProfileCollectibles(
    scope: string,
    request: Omit<Request<'getProfileCollectibles'>, 'cursor'>,
    cursor?: string,
  ): Promise<Result<'getProfileCollectibles'>> {
    return this.fetchInfiniteQuery(
      {
        queryKey: collectiblesQueries.social(
          'getProfileCollectibles',
          scope,
          request,
        ),
        staleTime: 10_000,
        maxPages: 10,
        initialPageParam: null as string | null,
        queryFn: ({ pageParam }) =>
          this.#client.getProfileCollectibles({
            ...request,
            cursor: pageParam ?? undefined,
          }) as Promise<Json & Result<'getProfileCollectibles'>>,
        getNextPageParam: (page) => page.nextCursor,
      },
      cursor ?? null,
    );
  }

  getProfilePokedex(
    scope: string,
    request: Request<'getProfilePokedex'>,
  ): Promise<Result<'getProfilePokedex'>> {
    return this.fetchQuery({
      queryKey: collectiblesQueries.social('getProfilePokedex', scope, request),
      staleTime: 10000,
      queryFn: () =>
        this.#client.getProfilePokedex(request) as Promise<
          Json & Result<'getProfilePokedex'>
        >,
    });
  }

  getComments(
    scope: string,
    request: Omit<Request<'getComments'>, 'cursor'>,
    cursor?: string,
  ): Promise<Result<'getComments'>> {
    return this.fetchInfiniteQuery(
      {
        queryKey: collectiblesQueries.social('getComments', scope, request),
        staleTime: 10000,
        gcTime: 5 * 60_000,
        maxPages: 10,
        initialPageParam: null as string | null,
        queryFn: ({ pageParam }) =>
          this.#client.getComments({
            ...request,
            cursor: pageParam ?? undefined,
          }) as Promise<Json & Result<'getComments'>>,
        getNextPageParam: (page) => page.nextCursor,
      },
      cursor ?? null,
    );
  }

  async addComment(
    scope: string,
    request: Request<'addComment'>,
  ): Promise<Result<'addComment'>> {
    const result = await this.#client.addComment(request);
    await this.#refreshChangedQueries((query) =>
      isSocialEngagementQuery(scope, request, true, query),
    );
    return result;
  }

  async setReaction(
    scope: string,
    request: Request<'setReaction'>,
  ): Promise<Result<'setReaction'>> {
    const result = await this.#client.setReaction(request);
    await this.#refreshChangedQueries((query) =>
      isSocialEngagementQuery(scope, request, false, query),
    );
    return result;
  }

  async shareCards(
    scope: string,
    request: Request<'shareCards'>,
  ): Promise<Result<'shareCards'>> {
    const result = await this.#client.shareCards(request);
    await this.#refreshChangedQueries((query) =>
      isSocialPublicationQuery(scope, result, query),
    );
    return result;
  }

  /** Background queries have no UI observers. Refetching emits fresh snapshots
   * through the cache bridge; a refresh error must never reject a committed write.
   */
  async #refreshChangedQueries(
    predicate: (query: Query) => boolean,
  ): Promise<void> {
    // TanStack joins a first fetch with no cached data even when invalidated.
    // Let these pre-command reads settle before requesting the updated state.
    await Promise.allSettled(
      this.#cache
        .findAll({ predicate, fetchStatus: 'fetching' })
        .map((query) => query.promise),
    );
    return this.invalidateQueries(
      { predicate, refetchType: 'all' },
      { throwOnError: false },
    );
  }

  /** Clear server data when the wallet is reset; nothing is persisted. */
  clearCache(): void {
    this.#cache.clear();
  }
}
