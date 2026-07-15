import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MarketInsightsReport } from '@metamask/ai-controllers';
import Engine from '../../../../core/Engine';
import { formatRelativeTime } from '../utils/marketInsightsFormatting';

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
 * This hook reads market insights through AiDigestController, which caches
 * insights per asset identifier and fetches them from the digest service as needed.
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
  const [report, setReport] = useState<MarketInsightsReport | null>(null);
  const [reportAssetId, setReportAssetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(
    Boolean(isEnabled && assetIdentifier),
  );
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!isEnabled || !assetIdentifier) {
      setReport(null);
      setReportAssetId(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setReport(null);
    setReportAssetId(null);
    setError(null);

    try {
      const data =
        await Engine.context.AiDigestController.fetchMarketInsights(
          assetIdentifier,
        );
      setReport(data as MarketInsightsReport | null);
      setReportAssetId(data ? assetIdentifier : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      setReport(null);
      setReportAssetId(null);
    } finally {
      setIsLoading(false);
    }
  }, [assetIdentifier, isEnabled]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const timeAgo = useMemo(
    () => (report ? formatRelativeTime(report.generatedAt) : ''),
    [report],
  );

  return { report, reportAssetId, isLoading, error, timeAgo };
};
