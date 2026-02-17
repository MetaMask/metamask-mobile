import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MarketInsightsReport } from '@metamask-previews/ai-controllers';
import Engine from '../../../../core/Engine';
import { formatRelativeTime } from '../utils/marketInsightsFormatting';

/**
 * Result interface for the useMarketInsights hook
 */
export interface UseMarketInsightsResult {
  /** The market insights report data, or null if unavailable */
  report: MarketInsightsReport | null;
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
 * This hook reads market insights through AiDigestController, which caches
 * insights per CAIP-19 ID and fetches them from the digest service as needed.
 *
 * @param caip19Id - The CAIP-19 asset identifier.
 * @returns Market insights report data with loading/error states
 */
export const useMarketInsights = (
  caip19Id: string | undefined | null,
): UseMarketInsightsResult => {
  const [report, setReport] = useState<MarketInsightsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!caip19Id) {
      setReport(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data =
        await Engine.context.AiDigestController.fetchMarketInsights(caip19Id);
      setReport(data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [caip19Id]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const timeAgo = useMemo(
    () => (report ? formatRelativeTime(report.generatedAt) : ''),
    [report],
  );

  return { report, isLoading, error, timeAgo };
};
