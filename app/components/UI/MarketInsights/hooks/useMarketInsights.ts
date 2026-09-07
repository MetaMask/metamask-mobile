import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MarketInsightsReport } from '@metamask/ai-controllers';
import {
  DIGEST_QUERY_GC_TIME_MS,
  digestQueryStaleTime,
} from '../../../../constants/digestQuery';
import Engine from '../../../../core/Engine';
import { formatRelativeTime } from '../utils/marketInsightsFormatting';
import { trace, TraceName, TraceOperation } from '../../../../util/trace';
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
  /** Whether the data is currently loading */
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
      state: cachedReport ? 'warm' : 'cold',
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
      trace(
        {
          name: TraceName.MarketInsightsFetch,
          op: TraceOperation.MarketInsightsFetch,
          tags: getMarketInsightsTraceTags(
            resolvedTelemetryContext,
            cacheState,
          ),
        },
        async (span) => {
          let wasCancelled = signal.aborted;
          const markCancelled = () => {
            wasCancelled = true;
            span?.setAttribute('result', 'cancelled');
            span?.setAttribute('success', false);
          };

          if (wasCancelled) {
            markCancelled();
          } else {
            signal.addEventListener('abort', markCancelled, { once: true });
          }

          try {
            const result =
              await Engine.context.AiDigestController.fetchMarketInsights(
                queryAssetIdentifier,
              );
            if (!wasCancelled) {
              span?.setAttribute('result', result ? 'success' : 'empty');
              span?.setAttribute('success', true);
            }
            return result;
          } catch (error) {
            if (!wasCancelled) {
              span?.setAttribute('result', 'error');
              span?.setAttribute('success', false);
            }
            throw error;
          } finally {
            signal.removeEventListener('abort', markCancelled);
          }
        },
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

  const timeAgo = useMemo(
    () => (report ? formatRelativeTime(report.generatedAt) : ''),
    [report],
  );

  return {
    report,
    reportAssetId,
    isLoading: isQueryEnabled && query.isLoading,
    error,
    timeAgo,
    cacheState,
  };
};
