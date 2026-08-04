import { MetaMetricsEvents } from '../../../../../core/Analytics';
import type { UseAnalyticsHook } from '../../../../hooks/useAnalytics/useAnalytics.types';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';

/** Granular sources where watchlist row taps emit Token List Item Clicked. */
export const WATCHLIST_TOKEN_LIST_ITEM_SOURCES = new Set<TokenDetailsSource>([
  TokenDetailsSource.WatchlistHomepage,
  TokenDetailsSource.WatchlistFullscreen,
  TokenDetailsSource.WatchlistFullscreenSearch,
  TokenDetailsSource.SwapWatchlistFilter,
  TokenDetailsSource.ExploreWatchlistFilter,
]);

export interface TokenListItemClickedProperties {
  asset: string;
  source: TokenDetailsSource;
  position: number;
}

export const isWatchlistTokenListItemSource = (
  source: TokenDetailsSource,
): source is TokenDetailsSource =>
  WATCHLIST_TOKEN_LIST_ITEM_SOURCES.has(source);

export const trackTokenListItemClicked = (
  trackEvent: UseAnalyticsHook['trackEvent'],
  createEventBuilder: UseAnalyticsHook['createEventBuilder'],
  { asset, source, position }: TokenListItemClickedProperties,
): void => {
  trackEvent(
    createEventBuilder(MetaMetricsEvents.TOKEN_LIST_ITEM_CLICKED)
      .addProperties({
        asset,
        source,
        position,
      })
      .build(),
  );
};
