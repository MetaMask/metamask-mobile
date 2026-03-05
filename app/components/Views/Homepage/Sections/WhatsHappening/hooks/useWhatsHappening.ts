import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { MarketOverview } from '@metamask/ai-controllers';
import Engine from '../../../../../../core/Engine';
import { selectWhatsHappeningEnabled } from '../../../../../../selectors/featureFlagController/whatsHappening';
import type { WhatsHappeningItem } from '../types';

/**
 * Result interface for useWhatsHappening hook
 */
export interface UseWhatsHappeningResult {
  items: WhatsHappeningItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const mapTrendsToItems = (
  overview: MarketOverview,
  limit: number,
): WhatsHappeningItem[] =>
  overview.trends.slice(0, limit).map((trend, index) => ({
    id: `trend-${index}`,
    title: trend.title,
    description: trend.description,
    date: trend.articles[0]?.date ?? overview.generatedAt,
    category: trend.category,
    impact: trend.impact,
    relatedAssets: trend.relatedAssets,
  }));

/**
 * Hook to fetch trending "What's Happening" items for the homepage carousel.
 *
 * Calls `AiDigestController.fetchMarketOverview()` (which handles caching
 * internally) and maps the returned `MarketOverviewTrend` entries to
 * `WhatsHappeningItem` shape for the carousel cards.
 *
 * @param limit - Maximum number of items to return (default: 5)
 * @returns Object with items, isLoading, error, refresh
 */
export const useWhatsHappening = (limit = 5): UseWhatsHappeningResult => {
  const isEnabled = useSelector(selectWhatsHappeningEnabled);

  const [items, setItems] = useState<WhatsHappeningItem[]>([]);
  const [isLoading, setIsLoading] = useState(!!isEnabled);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!isEnabled) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data =
        await Engine.context.AiDigestController.fetchMarketOverview();

      if (data === null) {
        setItems([]);
      } else {
        setItems(mapTrendsToItems(data, limit));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch trending items',
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, limit]);

  const refresh = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, isLoading, error, refresh };
};

export default useWhatsHappening;
