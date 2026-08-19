import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import type {
  MarketOverview,
  MarketOverviewFrontPage,
} from '@metamask/ai-controllers';
import Engine from '../../../../core/Engine';
import { selectWhatsHappeningEnabled } from '../../../../selectors/featureFlagController/whatsHappening';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import type { WhatsHappeningItem } from '../types';

/** Internal error flag when fetch rejects with a non-Error value (not shown in UI). */
export const WHATS_HAPPENING_FETCH_FAILED = 'WHATS_HAPPENING_FETCH_FAILED';

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

const mapTrendsToItems = (overview: MarketOverview): WhatsHappeningItem[] =>
  overview.trends.map((trend, index) => ({
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
 * @returns The items to render.
 */
const prependOutdatedItem = (
  outdatedItem: WhatsHappeningItem | null,
  baseItems: WhatsHappeningItem[],
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

  return [item, ...rest];
};

/**
 * Hook to fetch trending "What's Happening" items for the carousel.
 *
 * Calls `AiDigestController.fetchMarketOverview()` (which handles caching
 * internally) and maps the returned `MarketOverviewTrend` entries to
 * `WhatsHappeningItem` shape for the carousel cards. Item count is owned by
 * the Digest API — the client does not slice the response.
 *
 * @param options - Hook options (`enabled`, `outdatedItemId`).
 * @returns Object with items, isLoading, error, refresh
 */
export const useWhatsHappening = (
  options?: UseWhatsHappeningOptions,
): UseWhatsHappeningResult => {
  const isFeatureEnabled = useSelector(selectWhatsHappeningEnabled);
  const outdatedItemId = options?.outdatedItemId ?? null;
  const isHookEnabled = options?.enabled ?? true;
  const isActive = isFeatureEnabled && isHookEnabled;

  const [items, setItems] = useState<WhatsHappeningItem[]>([]);
  const [isLoading, setIsLoading] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pendingRefreshRef = useRef<{
    generation: number;
    resolve: () => void;
  } | null>(null);

  useEffect(() => {
    const generation = refreshKey;
    let cancelled = false;

    const settleRefresh = () => {
      const pending = pendingRefreshRef.current;
      if (pending?.generation === generation) {
        pending.resolve();
        pendingRefreshRef.current = null;
      }
    };

    if (!isActive) {
      setItems([]);
      setIsLoading(false);
      setError(null);
      settleRefresh();
      return () => {
        cancelled = true;
        settleRefresh();
      };
    }

    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data =
          await Engine.context.AiDigestController.fetchMarketOverview();
        const baseItems = data === null ? [] : mapTrendsToItems(data);

        // When a deep link supplied an id, prepend that front-page item as the
        // first card, deduped against the latest feed. It is flagged "Outdated"
        // only when it is not already in the feed (see prependOutdatedItem).
        const outdatedItem = await fetchOutdatedItem(outdatedItemId);

        if (!cancelled) {
          setItems(prependOutdatedItem(outdatedItem, baseItems));
          setError(null);
        }
      } catch (err) {
        Logger.error(ensureError(err, 'useWhatsHappening.fetchItems'), {
          tags: { feature: 'WhatsHappening' },
          extra: { hook: 'useWhatsHappening' },
        });
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : WHATS_HAPPENING_FETCH_FAILED,
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          settleRefresh();
        }
      }
    };

    load().catch(() => undefined);

    return () => {
      cancelled = true;
      settleRefresh();
    };
  }, [isActive, outdatedItemId, refreshKey]);

  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        pendingRefreshRef.current?.resolve();
        setRefreshKey((key) => {
          const nextKey = key + 1;
          pendingRefreshRef.current = { generation: nextKey, resolve };
          return nextKey;
        });
      }),
    [],
  );

  return { items, isLoading, error, refresh };
};

export default useWhatsHappening;
