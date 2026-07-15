import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type {
  MarketOverview,
  MarketOverviewFrontPage,
} from '@metamask/ai-controllers';
import Engine from '../../../../core/Engine';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';
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

export interface UseWhatsHappeningOptions {
  /** When false, skips fetching (for parents that supply their own feed). */
  enabled?: boolean;
  /**
   * A market overview front-page item id to fetch and prepend as the first,
   * "outdated" card. Supplied by the What's Happening deep link; only the
   * detail view passes it, so the Explore/Perps carousels are unaffected.
   */
  outdatedItemId?: string | null;
}

export const isWhatsHappeningSectionVisible = ({
  isLoading,
  items,
  error,
}: Pick<UseWhatsHappeningResult, 'isLoading' | 'items' | 'error'>): boolean =>
  isLoading || items.length > 0 || Boolean(error);

const mapTrendsToItems = (
  overview: MarketOverview,
  limit: number,
): WhatsHappeningItem[] =>
  overview.trends.slice(0, limit).map((trend, index) => ({
    id: `trend-${index}`,
    title: trend.title,
    description: trend.description,
    date: overview.generatedAt,
    category: trend.category,
    impact: trend.impact,
    relatedAssets: trend.relatedAssets,
    articles: trend.articles,
  }));

const mapFrontPageToItem = (
  frontPage: MarketOverviewFrontPage,
): WhatsHappeningItem => ({
  id: `front-page-${frontPage.id}`,
  title: frontPage.item.title,
  description: frontPage.item.description,
  date: frontPage.createdAt,
  category: frontPage.item.category,
  impact: frontPage.item.impact,
  relatedAssets: frontPage.item.relatedAssets,
  articles: frontPage.item.articles,
  isOutdated: true,
});

/**
 * Fetches the deep-linked "outdated" front-page item, if any.
 *
 * @param outdatedItemId - The front-page item id from the deep link, or `null`.
 * @returns The mapped outdated item, or `null` when there is none / on failure.
 */
const fetchOutdatedItem = async (
  outdatedItemId: string | null,
): Promise<WhatsHappeningItem | null> => {
  if (!outdatedItemId) {
    return null;
  }

  try {
    const frontPage =
      await Engine.context.AiDigestController.fetchFrontPageItem(
        outdatedItemId,
      );
    return frontPage ? mapFrontPageToItem(frontPage) : null;
  } catch {
    // Non-fatal: fall back to rendering just the latest market overview items.
    return null;
  }
};

/**
 * Derives a dedupe key from an item title. Market overview items have no id,
 * so the title is our only stable identifier. Normalized (trimmed, lower-cased,
 * whitespace-collapsed) so trivial formatting differences still match.
 *
 * @param title - The item title.
 * @returns A normalized key for equality comparison.
 */
const getTitleKey = (title: string): string =>
  title.trim().toLowerCase().replace(/\s+/gu, ' ');

/**
 * Prepends the deep-linked front-page item as the first card, deduped against
 * the latest feed by title.
 *
 * A front-page item can be recent enough to also appear in the market overview.
 * When it does (a duplicate), it is NOT outdated: we drop the feed copy and
 * show it once, unbadged. Only when it is absent from the feed — i.e. it has
 * genuinely dropped out — is it flagged `isOutdated`.
 *
 * @param outdatedItem - The fetched front-page item to prepend, or `null`.
 * @param baseItems - The latest market overview items.
 * @param limit - Maximum number of items to return.
 * @returns The items to render, capped at `limit`.
 */
const prependOutdatedItem = (
  outdatedItem: WhatsHappeningItem | null,
  baseItems: WhatsHappeningItem[],
  limit: number,
): WhatsHappeningItem[] => {
  if (!outdatedItem) {
    return baseItems;
  }

  const outdatedKey = getTitleKey(outdatedItem.title);
  const hasDuplicate = baseItems.some(
    (item) => getTitleKey(item.title) === outdatedKey,
  );

  const item: WhatsHappeningItem = {
    ...outdatedItem,
    isOutdated: !hasDuplicate,
  };
  const rest = hasDuplicate
    ? baseItems.filter(
        (baseItem) => getTitleKey(baseItem.title) !== outdatedKey,
      )
    : baseItems;

  return [item, ...rest].slice(0, limit);
};

/**
 * Hook to fetch trending "What's Happening" items for the carousel.
 *
 * Calls `AiDigestController.fetchMarketOverview()` (which handles caching
 * internally) and maps the returned `MarketOverviewTrend` entries to
 * `WhatsHappeningItem` shape for the carousel cards.
 *
 * @param limit - Maximum number of items to return (default: 5)
 * @returns Object with items, isLoading, error, refresh
 */
export const useWhatsHappening = (
  limit = 5,
  options?: UseWhatsHappeningOptions,
): UseWhatsHappeningResult => {
  const isFeatureEnabled = useSelector(selectWhatsHappeningEnabled);
  const outdatedItemId = options?.outdatedItemId ?? null;
  const isHookEnabled = options?.enabled ?? true;
  const isActive = isFeatureEnabled && isHookEnabled;

  const [items, setItems] = useState<WhatsHappeningItem[]>([]);
  const [isLoading, setIsLoading] = useState(isActive);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!isActive) {
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
      const baseItems = data === null ? [] : mapTrendsToItems(data, limit);

      // When a deep link supplied an id, prepend that front-page item as the
      // first card, deduped against the latest feed. It is flagged "Outdated"
      // only when it is not already in the feed (see prependOutdatedItem).
      const outdatedItem = await fetchOutdatedItem(outdatedItemId);

      setItems(prependOutdatedItem(outdatedItem, baseItems, limit));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch trending items',
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isActive, limit, outdatedItemId]);

  const refresh = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, isLoading, error, refresh };
};

export default useWhatsHappening;
