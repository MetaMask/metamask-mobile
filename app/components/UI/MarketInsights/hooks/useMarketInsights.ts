import { useMemo } from 'react';
import { getMockMarketInsights } from '../mocks/mockMarketInsightsData';
import type { MarketInsightsReport } from '../types/marketInsights';

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
 * Computes a human-readable relative time string from a date string
 */
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const generated = new Date(dateString);
  const diffMs = now.getTime() - generated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

/**
 * Hook to fetch market insights for a given asset symbol.
 *
 * Currently returns mock data. Will be replaced with API integration
 * when the backend is available.
 *
 * @param assetSymbol - The asset symbol (e.g., "BTC", "ETH")
 * @returns Market insights report data with loading/error states
 *
 * @example
 * ```tsx
 * const { report, isLoading, timeAgo } = useMarketInsights('BTC');
 *
 * if (report) {
 *   return <MarketInsightsEntryCard report={report} timeAgo={timeAgo} />;
 * }
 * ```
 */
export const useMarketInsights = (
  assetSymbol: string | undefined | null,
): UseMarketInsightsResult => {
  const result = useMemo(() => {
    if (!assetSymbol) {
      return {
        report: null,
        isLoading: false,
        error: null,
        timeAgo: '',
      };
    }

    const report = getMockMarketInsights(assetSymbol);

    if (!report) {
      return {
        report: null,
        isLoading: false,
        error: null,
        timeAgo: '',
      };
    }

    return {
      report,
      isLoading: false,
      error: null,
      timeAgo: getTimeAgo(report.generatedAt),
    };
  }, [assetSymbol]);

  return result;
};
