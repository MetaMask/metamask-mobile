import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MarketInsightsReport } from '@metamask/ai-controllers';
import { digestQueryCacheTimeOption } from '../../../../constants/digestQuery';
import Engine from '../../../../core/Engine';
import { formatRelativeTime } from '../utils/marketInsightsFormatting';

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
): UseMarketInsightsResult => {
  const queryAssetIdentifier = assetIdentifier ?? '';
  const isQueryEnabled = isEnabled && queryAssetIdentifier.length > 0;
  const queryClient = useQueryClient();
  const query = useQuery<MarketInsightsReport | null, unknown>({
    queryKey: [MARKET_INSIGHTS_QUERY_KEY, queryAssetIdentifier],
    queryFn: () =>
      Engine.context.AiDigestController.fetchMarketInsights(
        queryAssetIdentifier,
      ),
    enabled: isQueryEnabled,
    retry: false,
    networkMode: 'always',
    staleTime: digestQueryCacheTimeOption,
    gcTime: digestQueryCacheTimeOption,
  });

  useEffect(() => {
    if (!isQueryEnabled) {
      queryClient.removeQueries({
        queryKey: [MARKET_INSIGHTS_QUERY_KEY, queryAssetIdentifier],
        exact: true,
      });
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
  };
};
