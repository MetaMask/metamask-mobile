import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MarketInsightsReport } from '@metamask/ai-controllers';
import {
  DIGEST_QUERY_GC_TIME_MS,
  digestQueryStaleTime,
} from '../../../../constants/digestQuery';
import Engine from '../../../../core/Engine';
import { formatRelativeTime } from '../utils/marketInsightsFormatting';
import {
  getDigestCacheState,
  isDigestObserverPending,
  withDigestFetchSpan,
} from '../../../../util/digestPerformance';
import { TraceName, TraceOperation } from '../../../../util/trace';
import {
  getMarketInsightsTraceTags,
  type MarketInsightsCacheState,
  type MarketInsightsTelemetryContext,
} from '../utils/marketInsightsPerformance';

const MARKET_INSIGHTS_QUERY_KEY = 'market-insights';

/**
 * Result interface for the useMarketInsights hook
 */
export interface UseMarketInsightsResult {
  /** The market insights report data, or null if unavailable */
  report: MarketInsightsReport | null;
  /** The assetIdentifier the current report was fetched for, or null while loading/cleared */
  reportAssetId: string | null;
  /** Whether this observer still lacks a settled report. A remount of a
   * cached `null` miss or error stays loading until that observer fetches;
   * a later focus refetch of an already-settled result does not. */
  isLoading: boolean;
  /** Error message if the data fetch failed */
  error: string | null;
  /** Relative time since the report was generated (e.g., "3m ago") */
  timeAgo: string;
  /** Whether a report was already cached when this query generation began. */
  cacheState: MarketInsightsCacheState;
}

/**
 * Hook to fetch market insights for a given asset.
 *
 * Fetches through AiDigestController (passthrough to the digest service).
 * React Query owns the 10-minute cache; a `null` miss is not cached as a hit.
 *
 * @param assetIdentifier - The asset identifier: either a CAIP-19 ID (e.g. "eip155:1/slip44:60")
 * or a perps market symbol (e.g. "ETH").
 * @param isEnabled - Whether market insights requests are enabled.
 * @returns Market insights report data with loading/error states
 */
export const useMarketInsights = (
  assetIdentifier: string | undefined | null,
  isEnabled = false,
  telemetryContext?: MarketInsightsTelemetryContext,
): UseMarketInsightsResult => {
  const queryAssetIdentifier = assetIdentifier ?? '';
  const isQueryEnabled = isEnabled && queryAssetIdentifier.length > 0;
  const queryClient = useQueryClient();
  const cacheStateRef = useRef<{
    assetIdentifier: string;
    state: MarketInsightsCacheState;
  } | null>(null);

  if (cacheStateRef.current?.assetIdentifier !== queryAssetIdentifier) {
    const cachedReport = queryClient.getQueryData<MarketInsightsReport | null>([
      MARKET_INSIGHTS_QUERY_KEY,
      queryAssetIdentifier,
    ]);
    cacheStateRef.current = {
      assetIdentifier: queryAssetIdentifier,
      state: getDigestCacheState(cachedReport),
    };
  }

  const cacheState = cacheStateRef.current.state;
  const resolvedTelemetryContext: MarketInsightsTelemetryContext =
    telemetryContext ?? {
      source: 'unknown',
      stage: 'entry_card',
      assetType: queryAssetIdentifier.includes('/') ? 'token' : 'perps',
    };

  const query = useQuery<MarketInsightsReport | null, unknown>({
    queryKey: [MARKET_INSIGHTS_QUERY_KEY, queryAssetIdentifier],
    queryFn: ({ signal }) =>
      withDigestFetchSpan(
        {
          name: TraceName.MarketInsightsFetch,
          op: TraceOperation.MarketInsightsFetch,
          tags: getMarketInsightsTraceTags(
            resolvedTelemetryContext,
            cacheState,
          ),
        },
        signal,
        () =>
          Engine.context.AiDigestController.fetchMarketInsights(
            queryAssetIdentifier,
          ),
      ),
    enabled: isQueryEnabled,
    retry: false,
    networkMode: 'always',
    staleTime: digestQueryStaleTime,
    gcTime: DIGEST_QUERY_GC_TIME_MS,
  });

  useEffect(() => {
    if (!isQueryEnabled) {
      queryClient.removeQueries({
        queryKey: [MARKET_INSIGHTS_QUERY_KEY, queryAssetIdentifier],
        exact: true,
      });
      cacheStateRef.current = {
        assetIdentifier: queryAssetIdentifier,
        state: 'cold',
      };
    }
  }, [isQueryEnabled, queryAssetIdentifier, queryClient]);

  const report = isQueryEnabled ? (query.data ?? null) : null;
  const reportAssetId = report ? queryAssetIdentifier : null;
  const error =
    isQueryEnabled && !report && query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Failed to fetch insights'
      : null;
  // A remount of a cached `null` miss or error has no report and has not
  // fetched on this observer (`isFetchedAfterMount` is false). Keep loading
  // until that first fetch settles so TTC does not close at ~0ms. After
  // this observer has fetched, a later focus refetch must not flip loading
  // or the entry-card skeleton returns.
  const isLoading = isDigestObserverPending({
    enabled: isQueryEnabled,
    hasContent: Boolean(report),
    isFetchedAfterMount: query.isFetchedAfterMount,
  });

  const timeAgo = useMemo(
    () => (report ? formatRelativeTime(report.generatedAt) : ''),
    [report],
  );

  return {
    report,
    reportAssetId,
    isLoading,
    error,
    timeAgo,
    cacheState,
  };
};
