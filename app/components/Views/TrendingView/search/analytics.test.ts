import { MetaMetricsEvents } from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import {
  trackExplorePredictTrendingAssetViewed,
  trackExploreSectionSeeAll,
} from './analytics';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockTrackEvent = analytics.trackEvent as jest.MockedFunction<
  typeof analytics.trackEvent
>;

describe('Explore search analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackExplorePredictTrendingAssetViewed', () => {
    it('tracks Asset Viewed with Predict funnel properties for predictions_trending', () => {
      trackExplorePredictTrendingAssetViewed('Now');

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      const event = mockTrackEvent.mock.calls[0][0];

      expect(event.name).toBe(MetaMetricsEvents.ASSET_VIEWED.category);
      expect(event.properties).toEqual({
        section_name: 'predictions_trending',
        asset_type: 'prediction',
        tab_name: 'Now',
        interaction_type: 'section_see_all_tapped',
        trade_type: 'Predict',
        implementation_type: 'native',
      });
    });
  });

  describe('trackExploreSectionSeeAll', () => {
    it('tracks Explore Page Interacted and Asset Viewed for predictions_trending', () => {
      trackExploreSectionSeeAll({
        tabName: 'Now',
        sectionName: 'predictions_trending',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);

      const exploreEvent = mockTrackEvent.mock.calls[0][0];
      const assetViewedEvent = mockTrackEvent.mock.calls[1][0];

      expect(exploreEvent.name).toBe(
        MetaMetricsEvents.EXPLORE_INTERACTED.category,
      );
      expect(exploreEvent.properties).toMatchObject({
        interaction_type: 'section_see_all_tapped',
        tab_name: 'Now',
        section_name: 'predictions_trending',
      });

      expect(assetViewedEvent.name).toBe(
        MetaMetricsEvents.ASSET_VIEWED.category,
      );
      expect(assetViewedEvent.properties).toMatchObject({
        section_name: 'predictions_trending',
        asset_type: 'prediction',
        trade_type: 'Predict',
        implementation_type: 'native',
      });
    });

    it('tracks only Explore Page Interacted for non-predictions sections', () => {
      trackExploreSectionSeeAll({
        tabName: 'Crypto',
        sectionName: 'tokens_trending',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).toBe(
        MetaMetricsEvents.EXPLORE_INTERACTED.category,
      );
    });
  });
});
