import { useCallback, useRef } from 'react';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { SearchFeedId } from './useExploreSearch';

export type SearchInteractionType =
  | 'result_clicked'
  | 'scrolled'
  | 'tab_switched';

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
  | 'sites_popular';

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
