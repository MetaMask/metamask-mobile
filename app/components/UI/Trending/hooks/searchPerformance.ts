export type SearchRequestOutcome = 'success' | 'error' | 'superseded';

export interface SearchRequestHandle {
  /** Number of results returned by this request page. */
  end: (outcome: SearchRequestOutcome, resultCount?: number) => void;
}

export interface SearchRequestPerformance {
  startRequest: (query: string) => SearchRequestHandle | undefined;
  /** Number of results currently available from the cached data source. */
  markCachedResult?: (query: string, resultCount: number) => void;
}
