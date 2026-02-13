import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMockMarketInsights } from '../mocks/mockMarketInsightsData';
import type { MarketInsightsReport } from '../types/marketInsights';

// TODO: Once @metamask/ai-controllers is integrated in the mobile Engine,
//
// Since @metamask/ai-controllers isn't yet integrated in the mobile app,
// the hook can't call the controller directly yet.
// The integration into the mobile Engine is a separate step
// that requires adding the controller to the Engine's controller list, setting up the messenger, etc.
//
// replace local mock usage with the controller messenger call:
//
// import Engine from '../../../../core/Engine';
//
// const report = await Engine.context.AiDigestController.fetchMarketInsights(caip19Id);
//
// Or via selector from controller state:
//
// import { useSelector } from 'react-redux';
// const marketInsights = useSelector(
//   (state) => state.engine.backgroundState.AiDigestController.marketInsights[caip19Id],
// );
//
// The types (MarketInsightsReport, etc.) are now defined in @metamask/ai-controllers
// and can be imported from there instead of the local types file.

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

// TODO: Move to a shared utility file.
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
 * Hook to fetch market insights for a given asset.
 *
 * Currently uses local mock data. When @metamask/ai-controllers is integrated
 * in the mobile Engine, this hook will call AiDigestController.fetchMarketInsights(caip19Id)
 * which communicates with the API endpoint: GET /digests/search?caip19Ids=<id>
 *
 * Integration flow:
 * 1. Mobile Engine initializes AiDigestController with AiDigestService
 * 2. This hook calls controller.fetchMarketInsights(caip19Id) via messenger
 * 3. Controller calls service.searchDigests(caip19Id) → API call
 * 4. Controller caches the result (10 min TTL, 50 max entries)
 * 5. Hook reads from controller state and returns to component
 *
 * @param assetSymbol - The asset symbol (for example "BTC"). TODO: Replace with caip19Id.
 * @returns Market insights report data with loading/error states
 */
export const useMarketInsights = (
  assetSymbol: string | undefined | null,
): UseMarketInsightsResult => {
  const [report, setReport] = useState<MarketInsightsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!assetSymbol) {
      setReport(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with controller call when Engine integration is ready:
      // const data = await Engine.context.AiDigestController.fetchMarketInsights(caip19Id);
      const data = getMockMarketInsights(assetSymbol);
      setReport(data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [assetSymbol]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const timeAgo = useMemo(
    () => (report ? getTimeAgo(report.generatedAt) : ''),
    [report],
  );

  return { report, isLoading, error, timeAgo };
};
