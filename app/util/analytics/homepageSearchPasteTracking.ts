import { MetaMetricsEvents } from '../../core/Analytics';
import { SearchInteractionType } from '../../core/Analytics/events/navigation/constants';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import { analytics } from './analytics';

export const trackHomepageSearchPaste = (): void => {
  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED,
    )
      .addProperties({
        interaction_type: SearchInteractionType.Paste,
        search_query: '',
        entry_point: 'home',
      })
      .build(),
  );
};
