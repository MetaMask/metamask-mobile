import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  isTopTradersNavPerfEnabled,
  markTopTradersFirstCommit,
  markTopTradersTransitionEnd,
  reportTopTradersContent,
  type TopTradersPerfSurface,
  type TopTradersPerfVariant,
} from './topTradersNavigationPerf';

/**
 * Records first commit and the opening `transitionEnd` for one destination.
 * No-ops unless `MM_PERF_TOP_TRADERS=true`.
 */
export function useTopTradersNavigationScreenPerf(
  variant: TopTradersPerfVariant,
  options?: { contentOnFirstCommit?: boolean },
): void {
  const navigation = useNavigation();
  const contentOnFirstCommit = options?.contentOnFirstCommit === true;

  useLayoutEffect(() => {
    markTopTradersFirstCommit(variant);
    if (!contentOnFirstCommit) {
      return;
    }
    reportTopTradersContent({
      surface: 'onboarding',
      hasRows: false,
      settled: true,
      fromCache: null,
    });
  }, [contentOnFirstCommit, variant]);

  useEffect(() => {
    if (!isTopTradersNavPerfEnabled()) {
      return undefined;
    }
    const addListener = navigation.addListener;
    if (typeof addListener !== 'function') {
      return undefined;
    }
    return addListener('transitionEnd', (event) => {
      if (event.data?.closing) {
        return;
      }
      markTopTradersTransitionEnd();
    });
  }, [navigation]);
}

/**
 * Latches whether the first observation of this query already had rows.
 * A cache hit (including stale-while-revalidate) reports `true`.
 */
export function useTopTradersContentFromCache(
  hasRows: boolean,
  isLoading: boolean,
): boolean {
  const fromCacheRef = useRef<boolean | null>(null);
  if (fromCacheRef.current === null && (hasRows || !isLoading)) {
    fromCacheRef.current = hasRows;
  }
  return fromCacheRef.current === true;
}

/**
 * (d) Fires once when the landing surface renders rows, or the query settles
 * empty. Other surfaces no-op inside the perf module.
 */
export function useReportTopTradersContent(report: {
  surface: TopTradersPerfSurface;
  hasRows: boolean;
  settled: boolean;
  fromCache: boolean;
}): void {
  const sentRef = useRef(false);
  const { surface, hasRows, settled, fromCache } = report;

  useLayoutEffect(() => {
    if (!isTopTradersNavPerfEnabled() || sentRef.current) {
      return;
    }
    if (!hasRows && !settled) {
      return;
    }
    sentRef.current = true;
    reportTopTradersContent({
      surface,
      hasRows,
      settled,
      fromCache,
    });
  }, [fromCache, hasRows, settled, surface]);
}
