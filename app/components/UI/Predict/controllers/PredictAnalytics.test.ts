import { MetaMetricsEvents } from '../../../../core/Analytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { analytics } from '../../../../util/analytics/analytics';
import {
  PredictShareStatus,
  PredictTradeStatus,
} from '../constants/eventNames';
import { PredictAnalytics, PredictAnalyticsContext } from './PredictAnalytics';

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

interface TrackedEvent {
  name: string;
  properties: Record<string, unknown>;
  sensitiveProperties: Record<string, unknown>;
}

describe('PredictAnalytics', () => {
  let context: PredictAnalyticsContext;
  let predictAnalytics: PredictAnalytics;

  const getTrackEventMock = () =>
    analytics.trackEvent as jest.MockedFunction<typeof analytics.trackEvent>;

  const getDevLoggerMock = () =>
    DevLogger.log as jest.MockedFunction<typeof DevLogger.log>;

  const getTrackedEvent = (): TrackedEvent =>
    getTrackEventMock().mock.calls[0][0] as TrackedEvent;

  beforeEach(() => {
    jest.clearAllMocks();

    context = {
      getEligibility: jest.fn(() => ({ eligible: false, country: 'US' })),
    };
    predictAnalytics = new PredictAnalytics(context);
  });

  describe('trackPredictOrderEvent', () => {
    it('returns early when analyticsProperties is undefined', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUCCEEDED,
      });

      expect(getTrackEventMock()).not.toHaveBeenCalled();
      expect(getDevLoggerMock()).not.toHaveBeenCalled();
    });

    it('tracks submitted status with common and conditional properties', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        amountUsd: 150,
        sharePrice: 0.63,
        analyticsProperties: {
          marketId: 'm1',
          marketTitle: 'Will Team A win?',
          marketCategory: 'sports',
          marketTags: ['nba', 'playoffs'],
          entryPoint: 'predict_feed',
          transactionType: 'mm_predict_buy',
          liquidity: 15000,
          volume: 42000,
          marketType: 'binary',
          outcome: 'yes',
          marketSlug: 'team-a-team-b',
          gameId: 'g1',
          gameStartTime: '2026-04-01T10:00:00.000Z',
          gameLeague: 'NBA',
          gameStatus: 'live',
          gamePeriod: 'Q3',
          gameClock: '02:41',
        },
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_TRADE_TRANSACTION.category,
      );
      expect(event.properties).toMatchObject({
        status: PredictTradeStatus.SUBMITTED,
        market_id: 'm1',
        market_title: 'Will Team A win?',
        market_category: 'sports',
        market_tags: ['nba', 'playoffs'],
        entry_point: 'predict_feed',
        transaction_type: 'mm_predict_buy',
        liquidity: 15000,
        volume: 42000,
        share_price: 0.63,
        market_type: 'binary',
        outcome: 'yes',
        market_slug: 'team-a-team-b',
        game_id: 'g1',
        game_start_time: '2026-04-01T10:00:00.000Z',
        game_league: 'NBA',
        game_status: 'live',
        game_period: 'Q3',
        game_clock: '02:41',
      });
      expect(event.sensitiveProperties).toMatchObject({
        amount_usd: 150,
      });
      expect(getDevLoggerMock()).toHaveBeenCalledTimes(1);
    });

    it('tracks failed status with completionDuration and failureReason', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.FAILED,
        completionDuration: 1832,
        failureReason: 'quote expired',
        analyticsProperties: {
          marketId: 'm2',
        },
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        status: PredictTradeStatus.FAILED,
        market_id: 'm2',
        completion_duration: 1832,
        failure_reason: 'quote expired',
      });
    });

    it('includes order_type when orderType is provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        orderType: 'FAK',
        analyticsProperties: {
          marketId: 'm3',
        },
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        market_id: 'm3',
        order_type: 'FAK',
      });
    });

    it('includes pnl in sensitiveProperties when pnl is provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUCCEEDED,
        pnl: 12.5,
        analyticsProperties: {
          marketId: 'm4',
        },
      });

      const event = getTrackedEvent();

      expect(event.sensitiveProperties).toMatchObject({
        pnl: 12.5,
      });
    });
  });

  describe('config-driven trackers', () => {
    it('tracks market details opened with game properties', () => {
      predictAnalytics.trackMarketDetailsOpened({
        marketId: 'm1',
        marketTitle: 'Market title',
        marketCategory: 'sports',
        marketTags: ['soccer'],
        entryPoint: 'predict_feed',
        marketDetailsViewed: 'about',
        marketSlug: 'market-slug',
        gameId: 'g1',
        gameStartTime: '2026-04-01T12:00:00.000Z',
        gameLeague: 'EPL',
        gameStatus: 'live',
        gamePeriod: '2H',
        gameClock: '14:10',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_MARKET_DETAILS_OPENED.category,
      );
      expect(event.properties).toMatchObject({
        market_id: 'm1',
        market_title: 'Market title',
        market_category: 'sports',
        market_tags: ['soccer'],
        entry_point: 'predict_feed',
        market_details_viewed: 'about',
        market_slug: 'market-slug',
        game_id: 'g1',
        game_start_time: '2026-04-01T12:00:00.000Z',
        game_league: 'EPL',
        game_status: 'live',
        game_period: '2H',
        game_clock: '14:10',
      });
      expect(getDevLoggerMock()).toHaveBeenCalledTimes(1);
    });

    it('tracks position viewed', () => {
      predictAnalytics.trackPositionViewed({ openPositionsCount: 7 });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_POSITION_VIEWED.category,
      );
      expect(event.properties).toMatchObject({ open_positions_count: 7 });
    });

    it('tracks activity viewed', () => {
      predictAnalytics.trackActivityViewed({ activityType: 'activity_list' });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_ACTIVITY_VIEWED.category,
      );
      expect(event.properties).toMatchObject({
        activity_type: 'activity_list',
      });
    });

    it('tracks geo block with country from context', () => {
      predictAnalytics.trackGeoBlockTriggered({
        attemptedAction: 'deposit',
      });

      const event = getTrackedEvent();

      expect(context.getEligibility).toHaveBeenCalledTimes(1);
      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_GEO_BLOCKED_TRIGGERED.category,
      );
      expect(event.properties).toMatchObject({
        country: 'US',
        attempted_action: 'deposit',
      });
    });

    it('tracks feed viewed with session end defaulting to false', () => {
      predictAnalytics.trackFeedViewed({
        sessionId: 's1',
        feedTab: 'trending',
        numPagesViewed: 3,
        sessionTime: 98,
        entryPoint: 'carousel',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(MetaMetricsEvents.PREDICT_FEED_VIEWED.category);
      expect(event.properties).toMatchObject({
        session_id: 's1',
        predict_feed_tab: 'trending',
        num_feed_pages_viewed_in_session: 3,
        session_time_in_feed: 98,
        is_session_end: false,
        entry_point: 'carousel',
      });
    });

    it('tracks share action with optional market fields', () => {
      predictAnalytics.trackShareAction({
        status: PredictShareStatus.SUCCESS,
        marketId: 'm10',
        marketSlug: 'slug-10',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(MetaMetricsEvents.SHARE_ACTION.category);
      expect(event.properties).toMatchObject({
        status: PredictShareStatus.SUCCESS,
        market_id: 'm10',
        market_slug: 'slug-10',
      });
    });
  });
});
