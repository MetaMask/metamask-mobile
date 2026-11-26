import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';

export type NetworkQueryOptions<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<QueryFnData, Error, Data, Key>,
  'queryFn' | 'retry' | 'gcTime' | 'refetchInterval'
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
};
