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

// TODO: Remove once the AiDigestController API returns real data
const MOCK_ITEMS: WhatsHappeningItem[] = [
  {
    id: 'mock-1',
    title: 'Bitcoin ETF inflows hit record high',
    description:
      'Spot Bitcoin ETFs recorded over $1.2B in net inflows this week, signalling strong institutional demand as macro conditions stabilise.',
    date: new Date().toISOString(),
    category: 'macro',
    impact: 'positive',
    relatedAssets: ['BTC'],
  },
  {
    id: 'mock-2',
    title: 'Ethereum Pectra upgrade scheduled',
    description:
      'The Pectra hard fork is set to go live next month, introducing EIP-7251 to raise the validator balance cap and improving wallet UX via account abstraction.',
    date: new Date().toISOString(),
    category: 'technical',
    impact: 'positive',
    relatedAssets: ['ETH'],
  },
  {
    id: 'mock-3',
    title: 'SEC signals softer crypto stance',
    description:
      'New SEC leadership indicated a shift toward clearer crypto regulation, reducing enforcement actions against DeFi protocols and exchanges.',
    date: new Date().toISOString(),
    category: 'regulatory',
    impact: 'positive',
    relatedAssets: ['ETH', 'BTC'],
  },
  {
    id: 'mock-4',
    title: 'Stablecoin legislation advances in Congress',
    description:
      'The STABLE Act passed committee review, bringing the US closer to a federal framework for dollar-pegged stablecoins.',
    date: new Date().toISOString(),
    category: 'regulatory',
    impact: 'neutral',
    relatedAssets: ['USDC', 'USDT'],
  },
  {
    id: 'mock-5',
    title: 'Layer-2 TVL surpasses $50B milestone',
    description:
      'Combined total value locked across Ethereum Layer-2 networks crossed $50B for the first time, driven by Base and Arbitrum growth.',
    date: new Date().toISOString(),
    category: 'technical',
    impact: 'positive',
    relatedAssets: ['ETH', 'ARB', 'OP'],
  },
];

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

      if (data === null || data.trends.length === 0) {
        // TODO: Remove mock fallback once API returns real data: setItems([])
        setItems(MOCK_ITEMS.slice(0, limit));
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
