import { useCallback, useRef } from 'react';
import {
  mergeAssetViewedProperties,
  MetaMetricsEvents,
} from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';

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
 * Returns a stable `onScrollBeginDrag` handler that fires a one-shot analytics
 * event the first time the user begins scrolling.
 */
export const useScrollTracking = (
  interactionType: string,
  searchQuery: string,
  extraProperties?: Record<string, string>,
) => {
  const hasTracked = useRef(false);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const extraPropsRef = useRef(extraProperties);
  extraPropsRef.current = extraProperties;

  const onScrollBeginDrag = useCallback(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;
    trackExploreEvent(MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED, {
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
