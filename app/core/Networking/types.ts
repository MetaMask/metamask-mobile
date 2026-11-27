import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';

/**
 * How long a response may be reused after the app restarts. `NONE` keeps it in
 * memory only. The others save it on the device, so use them only for public
 * data: never anything tied to an account, an address or a credential.
 */
export enum NetworkCache {
  NONE = 'none',
  SHORT = 'short',
  LONG = 'long',
}

export type NetworkQueryOptions<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<QueryFnData, Error, Data, Key>,
  | 'queryFn'
  | 'retry'
  | 'gcTime'
  | 'refetchInterval'
  | 'initialData'
  | 'initialDataUpdatedAt'
> & {
  /**
   * URL to GET. The hook makes the request; callers never call `fetch`.
   * Put every value that changes the URL in `queryKey`.
   */
  url: string;
  /** Turns the untrusted JSON body into the query data. Throw to fail. */
  parse: (body: unknown) => QueryFnData;
  /** Poll interval in ms on a good connection. Tripled on a slow one. */
  refetchInterval?: number;
  /** Reuse the response after a restart. Defaults to `NetworkCache.NONE`. */
  cache?: NetworkCache;
};
