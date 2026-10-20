import { useLayoutEffect, useRef } from 'react';
import {
  markTopTradersFirstRows,
  observeTopTradersLandingQuery,
  type TopTradersQueryTimeframe,
} from './topTradersNavigationPerf';

export interface TopTradersLandingQueryPerfInput {
  limit: number;
  chains: readonly string[];
  sort: string;
  timeframe: TopTradersQueryTimeframe;
  /** Query has a response already (including an empty page). */
  hasData: boolean;
  isFetching: boolean;
  hasFetched: boolean;
}

/**
 * Landing-tab `useTopTraders` observation. No-ops unless the perf flag is on.
 * Layout runs before the query effect, so the key is registered before fetch.
 */
export function useTopTradersLandingQueryPerf(
  input: TopTradersLandingQueryPerfInput,
): void {
  const latest = useRef(input);
  latest.current = input;

  useLayoutEffect(() => {
    observeTopTradersLandingQuery(latest.current);
  }, [
    input.chains,
    input.hasData,
    input.hasFetched,
    input.isFetching,
    input.limit,
    input.sort,
    input.timeframe,
  ]);
}

/** First commit of query rows. Skeletons and the disk snapshot do not count. */
export function useTopTradersFirstRows(hasFreshRows: boolean): void {
  const marked = useRef(false);

  useLayoutEffect(() => {
    if (!hasFreshRows || marked.current) {
      return;
    }
    marked.current = true;
    markTopTradersFirstRows();
  }, [hasFreshRows]);
}
