import { useCallback, useRef } from 'react';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import type { SearchFeedId } from './useExploreSearch';

/**
 * Discriminator values for EXPLORE_SEARCH_INTERACTED events.
 * Keep in sync with the analytics schema definition.
 */
export type SearchInteractionType =
  | 'result_clicked'
  | 'view_all_scrolled'
  | 'tab_switched';

/**
 * The active pill in the V2 search screen.
 * 'all' = aggregated view; all other values are SearchFeedId.
 */
export type SearchFeedPill = SearchFeedId | 'all';

/** Typed property bag for EXPLORE_SEARCH_INTERACTED events. */
export interface ExploreSearchInteractedProperties {
  interaction_type: SearchInteractionType;
  search_query: string;
  /** Stable feedId key — NOT the translated section title. */
  section_name?: SearchFeedId;
  /** Active pill at the time of the interaction. Sent for result_clicked, view_all_scrolled, tab_switched. */
  tab_name?: SearchFeedPill;
  /** Source pill; only present when interaction_type is tab_switched. */
  previous_tab?: SearchFeedPill;
  /** True when tab_switched was triggered by tapping a section header "View all" button rather than the pill row directly. */
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

/** Single-line wrapper around the analytics builder boilerplate. */
export const trackExploreEvent = (
  event: Parameters<typeof AnalyticsEventBuilder.createEventBuilder>[0],
  properties: Record<string, string>,
): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(event)
      .addProperties(properties)
      .build(),
  );
};

/**
 * Typed wrapper for EXPLORE_SEARCH_INTERACTED events.
 * Prefer this over the generic trackExploreEvent for all search interactions.
 */
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
 * Returns a stable `onScrollBeginDrag` handler that fires a one-shot analytics
 * event the first time the user begins scrolling.
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
