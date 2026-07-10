import { useCallback, useEffect, useRef } from 'react';
import {
  mergeAssetViewedProperties,
  MetaMetricsEvents,
} from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { SearchFeedId, SearchFeedSection } from './useExploreSearch';

/** Sum of result counts across all feed sections. */
export const getTotalSectionResultCount = (
  sections: SearchFeedSection[],
): number => sections.reduce((sum, s) => sum + (s.total ?? s.items.length), 0);

/**
 * Result count visible to the user for the active pill.
 * Aggregated and empty-tab fallback views sum all sections; a feed pill with
 * its own list uses that section's count only.
 */
export const getExploreSearchResultCount = (
  pill: SearchFeedPill,
  sections: SearchFeedSection[],
): number => {
  if (pill === 'all') {
    return getTotalSectionResultCount(sections);
  }
  const section = sections.find((s) => s.feedId === pill);
  const showsSingleFeedList =
    section?.isLoading || (section?.items.length ?? 0) > 0;
  if (showsSingleFeedList) {
    return section?.total ?? section?.items.length ?? 0;
  }
  return getTotalSectionResultCount(sections);
};

export type SearchInteractionType =
  | 'result_clicked'
  | 'scrolled'
  | 'tab_switched'
  | 'searched';

/** 'all' = aggregated view; other values are a specific feed pill. */
export type SearchFeedPill = SearchFeedId | 'all';

export interface ExploreSearchInteractedProperties {
  interaction_type: SearchInteractionType;
  search_query: string;
  /** Only set on result_clicked when tab_name is 'all'. */
  section_name?: SearchFeedId;
  tab_name?: SearchFeedPill;
  previous_tab?: SearchFeedPill;
  /** True when tab_switched came from a section header button, not the pill row. */
  comes_from_view_all_tap?: boolean;
  item_clicked?: string;
  position?: number;
  /** Total number of results visible to the user at the time of the interaction. */
  result_count?: number;
}

export type ExploreTabName =
  | 'Now'
  | 'Macro'
  | 'RWAs'
  | 'Crypto'
  | 'Sports'
  | 'Sites';

export type ExploreSectionName =
  | 'tokens_movers'
  | 'tokens_trending'
  | 'perps_movers'
  | 'perps_stocks_commodities'
  | 'perps_markets'
  | 'perps_crypto'
  | 'stocks'
  | 'predictions_trending'
  | 'predictions_politics'
  | 'predictions_crypto'
  | 'predictions_sports'
  | 'predictions_football'
  | 'predictions_basketball'
  | 'predictions_tennis'
  | 'sites_recents'
  | 'sites_favorites'
  | 'sites_ecosystems'
  | 'sites_popular'
  | 'whats_happening';

export interface ExploreInteractedProperties {
  interaction_type:
    | 'tab_switched'
    | 'section_see_all_tapped'
    | 'section_item_tapped'
    | 'prediction_voted';
  tab_name: ExploreTabName;
  section_name?: ExploreSectionName;
  position?: number;
  asset_type?: 'token' | 'stock' | 'perp' | 'prediction' | 'dapp';
  previous_tab?: ExploreTabName;
  token_address?: string;
  token_symbol?: string;
  chain_id?: string;
  item_clicked?: string;
  /** Entry surface when the user arrived on Explore (e.g. `homescreen_pill`). */
  source?: string;
}

export const trackExploreInteracted = (
  properties: ExploreInteractedProperties,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.EXPLORE_INTERACTED,
    )
      .addProperties(properties as unknown as Record<string, unknown>)
      .build(),
  );
};

const PREDICTIONS_TRENDING_SECTION: ExploreSectionName = 'predictions_trending';

/**
 * Trade funnel: `Asset Viewed` when the user taps View all / the Predict section
 * header on Explore (`predictions_trending`).
 */
export const trackExplorePredictTrendingAssetViewed = (
  tabName: ExploreTabName,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents.ASSET_VIEWED)
      .addProperties(
        mergeAssetViewedProperties('Predict', {
          section_name: PREDICTIONS_TRENDING_SECTION,
          asset_type: 'prediction',
          tab_name: tabName,
          interaction_type: 'section_see_all_tapped',
        }),
      )
      .build(),
  );
};

export const trackExploreSectionSeeAll = ({
  tabName,
  sectionName,
}: {
  tabName: ExploreTabName;
  sectionName: ExploreSectionName;
}): void => {
  trackExploreInteracted({
    interaction_type: 'section_see_all_tapped',
    tab_name: tabName,
    section_name: sectionName,
  });

  if (sectionName === PREDICTIONS_TRENDING_SECTION) {
    trackExplorePredictTrendingAssetViewed(tabName);
  }
};

export const trackExploreSearchEvent = (
  properties: ExploreSearchInteractedProperties,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED,
    )
      .addProperties(properties as unknown as Record<string, unknown>)
      .build(),
  );
};

/**
 * Side effect hook to invoke analytics when searching.
 * Fires the 'searched' event once per unique settled query (after loading
 * completes). Resets when the query is cleared.
 */
export const useInstrumentedSearchEffect = ({
  searchQuery,
  isLoading,
  getPill,
  getSections,
}: {
  searchQuery: string;
  isLoading: boolean;
  getPill: () => SearchFeedPill;
  getSections: () => SearchFeedSection[];
}): void => {
  const instrumentedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      instrumentedQueryRef.current = null;
      return;
    }
    if (isLoading) return;
    if (instrumentedQueryRef.current === searchQuery) return;

    const pill = getPill();
    const resultCount = getExploreSearchResultCount(pill, getSections());

    trackExploreSearchEvent({
      interaction_type: 'searched',
      search_query: searchQuery,
      tab_name: pill,
      result_count: resultCount,
    });
    instrumentedQueryRef.current = searchQuery;
  }, [searchQuery, isLoading, getPill, getSections]);
};

/**
 * One-shot scroll analytics: fires on the first onScrollBeginDrag, then resets
 * when searchQuery or activeTab changes.
 */
export const useScrollTracking = (
  interactionType: SearchInteractionType,
  searchQuery: string,
  extraProperties?: Partial<ExploreSearchInteractedProperties>,
) => {
  const hasTracked = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const extraPropsRef = useRef(extraProperties);
  extraPropsRef.current = extraProperties;

  const onScrollBeginDrag = useCallback(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    trackExploreSearchEvent({
      interaction_type: interactionType,
      search_query: searchQueryRef.current,
      ...extraPropsRef.current,
    });
  }, [interactionType]);

  const resetScrollTracking = useCallback(() => {
    hasTracked.current = false;
  }, []);

  return { onScrollBeginDrag, resetScrollTracking };
};
