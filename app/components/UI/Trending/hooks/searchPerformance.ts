export type SearchRequestOutcome = 'success' | 'error';

export interface SearchRequestHandle {
  end: (outcome: SearchRequestOutcome) => void;
}

export interface SearchRequestPerformance {
  startRequest: (query: string) => SearchRequestHandle | undefined;
  markCachedResult?: (query: string) => void;
}
