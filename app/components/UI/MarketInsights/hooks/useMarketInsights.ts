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

interface MarketInsightsResponseWithDigest {
  digest: MarketInsightsReport;
}

const normalizeMarketInsightsReport = (
  value: MarketInsightsReport | MarketInsightsResponseWithDigest | null,
): MarketInsightsReport | null => {
  if (!value) {
    return null;
  }

  if ('digest' in value) {
    return value.digest;
  }

  return value;
};

/**
 * Hook to fetch market insights for a given asset.
 *
 * This hook reads market insights through AiDigestController, which caches
 * insights per CAIP-19 ID and fetches them from the digest service as needed.
 *
 * @param caip19Id - The CAIP-19 asset identifier.
 * @param isEnabled - Whether market insights requests are enabled.
 * @returns Market insights report data with loading/error states
 */
export const useMarketInsights = (
  caip19Id: string | undefined | null,
  isEnabled = false,
): UseMarketInsightsResult => {
  const [report, setReport] = useState<MarketInsightsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!isEnabled || !caip19Id) {
      setReport(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data =
        await Engine.context.AiDigestController.fetchMarketInsights(caip19Id);
      setReport(
        normalizeMarketInsightsReport(
          data as
            | MarketInsightsReport
            | MarketInsightsResponseWithDigest
            | null,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [caip19Id, isEnabled]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const timeAgo = useMemo(
    () => (report ? formatRelativeTime(report.generatedAt) : ''),
    [report],
  );

  return { report, isLoading, error, timeAgo };
};
