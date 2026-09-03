import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const WHATS_HAPPENING_QUERY_KEY = 'whats-happening';

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

const fetchWhatsHappeningItems = async (
  outdatedItemId: string | null,
): Promise<WhatsHappeningItem[]> => {
  try {
    const data = await Engine.context.AiDigestController.fetchMarketOverview();
    const baseItems =
      data === null || data === undefined ? [] : mapTrendsToItems(data);

    // When a deep link supplied an id, prepend that front-page item as the
    // first card, deduped against the latest feed. It is flagged "Outdated"
    // only when it is not already in the feed (see prependOutdatedItem).
    const outdatedItem = await fetchOutdatedItem(outdatedItemId);

    return prependOutdatedItem(outdatedItem, baseItems);
  } catch (err) {
    Logger.error(ensureError(err, 'useWhatsHappening.fetchItems'), {
      tags: { feature: 'WhatsHappening' },
      extra: { hook: 'useWhatsHappening' },
    });
    throw err instanceof Error ? err : new Error(WHATS_HAPPENING_FETCH_FAILED);
  }
};

/**
 * Hook to fetch trending "What's Happening" items for the carousel.
 *
 * Calls `AiDigestController.fetchMarketOverview()` (which handles caching
 * internally) and maps the returned `MarketOverviewTrend` entries to
 * `WhatsHappeningItem` shape for the carousel cards. Item count is owned by
 * the Digest API — the client does not slice the response.
 *
 * React Query only coordinates in-flight work. The controller remains the
 * 10-minute cache.
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
  const queryClient = useQueryClient();
  const pendingRefreshRef = useRef<(() => void) | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const query = useQuery<WhatsHappeningItem[], Error>({
    queryKey: [WHATS_HAPPENING_QUERY_KEY, outdatedItemId],
    queryFn: () => fetchWhatsHappeningItems(outdatedItemId),
    enabled: isActive,
    retry: false,
    // The controller can satisfy this request from its persisted cache while
    // offline. Let it decide whether a network request is necessary.
    networkMode: 'always',
    // AiDigestController owns the cache. React Query only coordinates
    // in-flight requests here.
    staleTime: 0,
    gcTime: 0,
    // Match the previous hook: fetch on mount / refresh / key change, not on
    // app resume or reconnect (those would mark every subscriber as fetching).
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    // Only the feature flag should drop the shared query. `enabled: false` is
    // used by WhatsHappeningSection when a parent already owns the feed.
    if (!isFeatureEnabled) {
      queryClient.removeQueries({
        queryKey: [WHATS_HAPPENING_QUERY_KEY, outdatedItemId],
        exact: true,
      });
    }
  }, [isFeatureEnabled, outdatedItemId, queryClient]);

  useEffect(
    () => () => {
      pendingRefreshRef.current?.();
      pendingRefreshRef.current = null;
    },
    [],
  );

  const refresh = useCallback(() => {
    pendingRefreshRef.current?.();
    pendingRefreshRef.current = null;
    setIsManualRefreshing(true);

    return new Promise<void>((resolve) => {
      pendingRefreshRef.current = resolve;
      queryClient
        .refetchQueries({
          queryKey: [WHATS_HAPPENING_QUERY_KEY, outdatedItemId],
          exact: true,
        })
        .finally(() => {
          if (pendingRefreshRef.current === resolve) {
            pendingRefreshRef.current();
            pendingRefreshRef.current = null;
            setIsManualRefreshing(false);
          }
        });
    });
  }, [outdatedItemId, queryClient]);

  const error =
    isActive && query.error
      ? query.error.message || WHATS_HAPPENING_FETCH_FAILED
      : null;

  return {
    items: isActive && !error ? (query.data ?? []) : [],
    // isFetching is true for background refetches (new observer, stale mount).
    // Only the initial load and an explicit refresh should show skeletons.
    isLoading: isActive && (query.isLoading || isManualRefreshing),
    error,
    refresh,
  };
};

export default useWhatsHappening;
