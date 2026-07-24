import { MetaMetricsEvents } from '../../../../core/Analytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { analytics } from '../../../../util/analytics/analytics';
import {
  PredictEventValues,
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

    it('includes payment_token_address in properties when paymentTokenAddress is provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        analyticsProperties: { marketId: 'test' },
        paymentTokenAddress: '0xtoken',
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        payment_token_address: '0xtoken',
      });
    });

    it('omits payment_token_address from properties when paymentTokenAddress is not provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        analyticsProperties: { marketId: 'test' },
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('payment_token_address');
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

    it('includes payment_token_symbol when paymentTokenSymbol is provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        analyticsProperties: { marketId: 'test' },
        paymentTokenSymbol: 'WBTC',
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        payment_token_symbol: 'WBTC',
      });
    });

    it('omits payment_token_symbol when paymentTokenSymbol is not provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.SUBMITTED,
        analyticsProperties: { marketId: 'test' },
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('payment_token_symbol');
    });

    it('includes active_ab_tests when activeAbTests is non-empty', async () => {
      const abTests = [{ key: 'predict-pwat-experiment', value: 'treatment' }];

      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: { marketId: 'test' },
        activeAbTests: abTests,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        active_ab_tests: abTests,
      });
    });

    it('omits active_ab_tests when activeAbTests is empty', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: { marketId: 'test' },
        activeAbTests: [],
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('active_ab_tests');
    });

    it('omits active_ab_tests when not provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: { marketId: 'test' },
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('active_ab_tests');
    });

    it('includes predict_feed_tab and predict_screen when provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: {
          marketId: 'test',
          entryPoint: 'predict_feed',
          predictFeedTab: 'sports',
          predictScreen: 'predict_positions_screen',
        },
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        entry_point: 'predict_feed',
        predict_feed_tab: 'sports',
        predict_screen: 'predict_positions_screen',
      });
    });

    it('omits predict_feed_tab and predict_screen when not provided', async () => {
      await predictAnalytics.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: { marketId: 'test', entryPoint: 'predict_feed' },
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('predict_feed_tab');
      expect(event.properties).not.toHaveProperty('predict_screen');
    });
  });

  describe('trackBetslipDismissed', () => {
    it('returns early when analyticsProperties is undefined', () => {
      predictAnalytics.trackBetslipDismissed({
        analyticsProperties: undefined,
        dismissalMethod: 'back_button',
        hadEnteredAmount: false,
        timeOnScreenMs: 1500,
      });

      expect(getTrackEventMock()).not.toHaveBeenCalled();
      expect(getDevLoggerMock()).not.toHaveBeenCalled();
    });

    it('tracks betslip dismissed with required properties', () => {
      predictAnalytics.trackBetslipDismissed({
        analyticsProperties: {
          marketId: 'm1',
          marketTitle: 'Will it rain?',
          marketCategory: 'weather',
          entryPoint: 'predict_feed',
        },
        dismissalMethod: 'back_button',
        hadEnteredAmount: true,
        timeOnScreenMs: 3200,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_BETSLIP_DISMISSED.category,
      );
      expect(event.properties).toMatchObject({
        market_id: 'm1',
        market_title: 'Will it rain?',
        market_category: 'weather',
        entry_point: 'predict_feed',
        dismissal_method: 'back_button',
        had_entered_amount: true,
        time_on_screen_ms: 3200,
      });
      expect(getDevLoggerMock()).toHaveBeenCalledTimes(1);
    });

    it('tracks betslip dismissed via swipe with had_entered_amount false', () => {
      predictAnalytics.trackBetslipDismissed({
        analyticsProperties: { marketId: 'm2' },
        dismissalMethod: 'swipe',
        hadEnteredAmount: false,
        timeOnScreenMs: 800,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        dismissal_method: 'swipe',
        had_entered_amount: false,
        time_on_screen_ms: 800,
      });
    });

    it('includes active_ab_tests when provided and non-empty', () => {
      const abTests = [{ key: 'predict-pwat-experiment', value: 'control' }];

      predictAnalytics.trackBetslipDismissed({
        analyticsProperties: { marketId: 'm3' },
        dismissalMethod: 'hardware_back',
        hadEnteredAmount: false,
        timeOnScreenMs: 500,
        activeAbTests: abTests,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        active_ab_tests: abTests,
      });
    });

    it('omits active_ab_tests when not provided', () => {
      predictAnalytics.trackBetslipDismissed({
        analyticsProperties: { marketId: 'm4' },
        dismissalMethod: 'back_button',
        hadEnteredAmount: false,
        timeOnScreenMs: 100,
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('active_ab_tests');
    });

    it('omits active_ab_tests when empty array is provided', () => {
      predictAnalytics.trackBetslipDismissed({
        analyticsProperties: { marketId: 'm5' },
        dismissalMethod: 'back_button',
        hadEnteredAmount: false,
        timeOnScreenMs: 100,
        activeAbTests: [],
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('active_ab_tests');
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

      expect(getTrackEventMock()).toHaveBeenCalledTimes(2);

      const detailsEvent = getTrackEventMock().mock.calls[0][0] as TrackedEvent;
      const assetViewedEvent = getTrackEventMock().mock
        .calls[1][0] as TrackedEvent;

      expect(detailsEvent.name).toBe(
        MetaMetricsEvents.PREDICT_MARKET_DETAILS_OPENED.category,
      );
      expect(detailsEvent.properties).toMatchObject({
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

      expect(assetViewedEvent.name).toBe(
        MetaMetricsEvents.ASSET_VIEWED.category,
      );
      expect(assetViewedEvent.properties).toMatchObject({
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
        trade_type: 'Predict',
        implementation_type: 'native',
      });
      expect(getDevLoggerMock()).toHaveBeenCalledTimes(1);
    });

    it('includes predict_feed_tab and predict_screen in market details opened when provided', () => {
      predictAnalytics.trackMarketDetailsOpened({
        marketId: 'm1',
        marketTitle: 'Market title',
        entryPoint: 'predict_feed',
        predictFeedTab: 'sports',
        predictScreen: 'predict_positions_screen',
        marketDetailsViewed: 'about',
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        entry_point: 'predict_feed',
        predict_feed_tab: 'sports',
        predict_screen: 'predict_positions_screen',
      });
    });

    it('omits predict_feed_tab and predict_screen in market details opened when not provided', () => {
      predictAnalytics.trackMarketDetailsOpened({
        marketId: 'm1',
        marketTitle: 'Market title',
        entryPoint: 'predict_feed',
        marketDetailsViewed: 'about',
      });

      const event = getTrackedEvent();

      expect(event.properties).not.toHaveProperty('predict_feed_tab');
      expect(event.properties).not.toHaveProperty('predict_screen');
    });

    it('includes active_ab_tests in market details opened when provided', () => {
      const abTests = [
        {
          key: 'coreMCU747AbtestPredictPositionsEmptyState',
          value: 'treatment',
          key_value_pair:
            'coreMCU747AbtestPredictPositionsEmptyState=treatment',
        },
      ];

      predictAnalytics.trackMarketDetailsOpened({
        marketId: 'm1',
        marketTitle: 'Market title',
        entryPoint: 'home_section',
        marketDetailsViewed: 'about',
        activeAbTests: abTests,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        active_ab_tests: abTests,
      });
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

    it('tracks portfolio positions button tap with position viewed event', () => {
      predictAnalytics.trackPortfolioPositionsButtonTapped({
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        openPositionsCount: 2,
        claimablePositionsCount: 1,
        hasClaimableWinnings: true,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_POSITION_VIEWED.category,
      );
      expect(event.properties).toMatchObject({
        action_type: PredictEventValues.ACTION_TYPE.CLICKED,
        entry_point: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        open_positions_count: 2,
        claimable_positions_count: 1,
        has_claimable_winnings: true,
        predict_component:
          PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE,
      });
      expect(event.properties).not.toHaveProperty('amount_usd');
      expect(event.properties).not.toHaveProperty('pnl');
      expect(event.sensitiveProperties).toEqual({});
    });

    it('tracks portfolio transaction initiation with trade transaction event', () => {
      predictAnalytics.trackPortfolioTransactionInitiated({
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
        transactionType: PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_DEPOSIT,
        openPositionsCount: 2,
        claimablePositionsCount: 1,
        hasClaimableWinnings: true,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_TRADE_TRANSACTION.category,
      );
      expect(event.properties).toMatchObject({
        status: PredictTradeStatus.INITIATED,
        transaction_type:
          PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_DEPOSIT,
        entry_point: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
        open_positions_count: 2,
        claimable_positions_count: 1,
        has_claimable_winnings: true,
        predict_component:
          PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE,
      });
      expect(event.properties).not.toHaveProperty('amount_usd');
      expect(event.properties).not.toHaveProperty('pnl');
      expect(event.sensitiveProperties).toEqual({});
    });

    it('tracks positions screen viewed with position viewed event', () => {
      predictAnalytics.trackPositionsScreenViewed({
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        openPositionsCount: 3,
        claimablePositionsCount: 1,
        hasClaimableWinnings: true,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_POSITION_VIEWED.category,
      );
      expect(event.properties).toMatchObject({
        action_type: PredictEventValues.ACTION_TYPE.VIEWED,
        entry_point: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        open_positions_count: 3,
        claimable_positions_count: 1,
        has_claimable_winnings: true,
        predict_screen:
          PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
      });
    });

    it('tracks positions tab viewed with position viewed event', () => {
      predictAnalytics.trackPositionsTabViewed({
        predictFeedTab: PredictEventValues.PREDICT_FEED_TAB.POSITIONS,
        openPositionsCount: 3,
        claimablePositionsCount: 1,
        hasClaimableWinnings: true,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_POSITION_VIEWED.category,
      );
      expect(event.properties).toMatchObject({
        action_type: PredictEventValues.ACTION_TYPE.VIEWED,
        open_positions_count: 3,
        claimable_positions_count: 1,
        has_claimable_winnings: true,
        predict_screen:
          PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
        predict_feed_tab: PredictEventValues.PREDICT_FEED_TAB.POSITIONS,
      });
    });

    it('tracks history tab viewed with activity viewed event', () => {
      predictAnalytics.trackPositionsTabViewed({
        predictFeedTab: PredictEventValues.PREDICT_FEED_TAB.HISTORY,
        openPositionsCount: 3,
        claimablePositionsCount: 1,
        hasClaimableWinnings: true,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_ACTIVITY_VIEWED.category,
      );
      expect(event.properties).toMatchObject({
        action_type: PredictEventValues.ACTION_TYPE.VIEWED,
        activity_type: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
        open_positions_count: 3,
        claimable_positions_count: 1,
        has_claimable_winnings: true,
        predict_screen:
          PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
        predict_feed_tab: PredictEventValues.PREDICT_FEED_TAB.HISTORY,
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

    it('tracks feed viewed with session fields when provided', () => {
      predictAnalytics.trackFeedViewed({
        sessionId: 's1',
        feedTab: 'trending',
        predictComponent:
          PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE,
        numPagesViewed: 3,
        sessionTime: 98,
        entryPoint: 'carousel',
        isSessionEnd: false,
        portfolioModuleEnabled: true,
      });

      expect(getTrackEventMock()).toHaveBeenCalledTimes(2);

      const feedEvent = getTrackEventMock().mock.calls[0][0] as TrackedEvent;
      const assetViewedEvent = getTrackEventMock().mock
        .calls[1][0] as TrackedEvent;

      expect(feedEvent.name).toBe(
        MetaMetricsEvents.PREDICT_FEED_VIEWED.category,
      );
      expect(feedEvent.properties).toMatchObject({
        session_id: 's1',
        predict_feed_tab: 'trending',
        predict_component:
          PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE,
        num_feed_pages_viewed_in_session: 3,
        session_time_in_feed: 98,
        is_session_end: false,
        entry_point: 'carousel',
        portfolio_module_enabled: true,
      });

      expect(assetViewedEvent.name).toBe(
        MetaMetricsEvents.ASSET_VIEWED.category,
      );
      expect(assetViewedEvent.properties).toMatchObject({
        session_id: 's1',
        predict_feed_tab: 'trending',
        num_feed_pages_viewed_in_session: 3,
        session_time_in_feed: 98,
        is_session_end: false,
        entry_point: 'carousel',
        trade_type: 'Predict',
        implementation_type: 'native',
      });
    });

    it('tracks banner viewed action with action type and banner type', () => {
      predictAnalytics.trackBannerAction({
        actionType: 'viewed',
        bannerType: 'predict_the_pitch',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(MetaMetricsEvents.PREDICT_BANNER_ACTION.category);
      expect(event.properties).toMatchObject({
        action_type: 'viewed',
        banner_type: 'predict_the_pitch',
      });
    });

    it('tracks banner clicked action with action type and banner type', () => {
      predictAnalytics.trackBannerAction({
        actionType: 'clicked',
        bannerType: 'predict_the_pitch',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(MetaMetricsEvents.PREDICT_BANNER_ACTION.category);
      expect(event.properties).toMatchObject({
        action_type: 'clicked',
        banner_type: 'predict_the_pitch',
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

    it('tracks search opened with only the base properties', () => {
      predictAnalytics.trackSearchInteracted({
        interactionType: PredictEventValues.SEARCH_INTERACTION.OPENED,
        predictFeedTab: 'trending',
        entryPoint: 'predict_feed',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_SEARCH_INTERACTED.category,
      );
      expect(event.properties).toEqual({
        interaction_type: 'opened',
        predict_feed_tab: 'trending',
        entry_point: 'predict_feed',
      });
    });

    it('tracks search queried with search query and results count', () => {
      predictAnalytics.trackSearchInteracted({
        interactionType: PredictEventValues.SEARCH_INTERACTION.QUERIED,
        predictFeedTab: 'crypto',
        entryPoint: 'predict_feed',
        searchQuery: 'eth',
        resultsCount: 5,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_SEARCH_INTERACTED.category,
      );
      expect(event.properties).toMatchObject({
        interaction_type: 'queried',
        predict_feed_tab: 'crypto',
        entry_point: 'predict_feed',
        search_query: 'eth',
        results_count: 5,
      });
    });

    it('emits results_count of zero (does not drop the property)', () => {
      predictAnalytics.trackSearchInteracted({
        interactionType: PredictEventValues.SEARCH_INTERACTION.QUERIED,
        searchQuery: 'nomatch',
        resultsCount: 0,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        search_query: 'nomatch',
        results_count: 0,
      });
    });

    it('tracks search result_clicked with market id and title', () => {
      predictAnalytics.trackSearchInteracted({
        interactionType: PredictEventValues.SEARCH_INTERACTION.RESULT_CLICKED,
        predictFeedTab: 'sports',
        entryPoint: 'predict_feed',
        searchQuery: 'cup',
        marketId: 'm42',
        marketTitle: 'World Cup Winner',
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_SEARCH_INTERACTED.category,
      );
      expect(event.properties).toMatchObject({
        interaction_type: 'result_clicked',
        predict_feed_tab: 'sports',
        entry_point: 'predict_feed',
        search_query: 'cup',
        market_id: 'm42',
        market_title: 'World Cup Winner',
      });
    });

    it('omits optional properties (incl. predict_feed_tab) when not provided', () => {
      predictAnalytics.trackSearchInteracted({
        interactionType: PredictEventValues.SEARCH_INTERACTION.OPENED,
        entryPoint: 'home_section',
      });

      const event = getTrackedEvent();

      expect(event.properties).toEqual({
        interaction_type: 'opened',
        entry_point: 'home_section',
      });
    });

    it('tracks generic feed viewed with feed/tab/filter ids and no session fields', () => {
      predictAnalytics.trackFeedViewed({
        feedId: 'sports',
        tabId: 'basketball',
        filterId: 'live',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const feedEvent = getTrackEventMock().mock.calls[0][0] as TrackedEvent;

      expect(feedEvent.name).toBe(
        MetaMetricsEvents.PREDICT_FEED_VIEWED.category,
      );
      expect(feedEvent.properties).toMatchObject({
        feed_id: 'sports',
        tab_id: 'basketball',
        filter_id: 'live',
        entry_point: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
      // Lightweight one-shot path omits every session-only field.
      expect(feedEvent.properties).not.toHaveProperty('session_id');
      expect(feedEvent.properties).not.toHaveProperty('is_session_end');
      expect(feedEvent.properties).not.toHaveProperty('predict_feed_tab');
      expect(feedEvent.properties).not.toHaveProperty(
        'num_feed_pages_viewed_in_session',
      );
    });

    it('tracks home viewed with entry point', () => {
      predictAnalytics.trackHomeViewed({
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(MetaMetricsEvents.PREDICT_HOME_VIEWED.category);
      expect(event.properties).toEqual({
        entry_point: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
    });

    it('tracks home viewed with no properties when entry point is unknown', () => {
      predictAnalytics.trackHomeViewed({});

      const event = getTrackedEvent();

      expect(event.name).toBe(MetaMetricsEvents.PREDICT_HOME_VIEWED.category);
      expect(event.properties).toEqual({});
    });

    it('tracks a home section viewed impression', () => {
      predictAnalytics.trackHomeSectionInteraction({
        sectionId: PredictEventValues.SECTION_ID.TRENDING,
        actionType: PredictEventValues.ACTION_TYPE.VIEWED,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_HOME_SECTION_INTERACTION.category,
      );
      expect(event.properties).toEqual({
        section_id: PredictEventValues.SECTION_ID.TRENDING,
        action_type: PredictEventValues.ACTION_TYPE.VIEWED,
        entry_point: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
    });

    it('tracks a home section see-all tap', () => {
      predictAnalytics.trackHomeSectionInteraction({
        sectionId: PredictEventValues.SECTION_ID.LIVE_NOW,
        actionType: PredictEventValues.ACTION_TYPE.SEE_ALL,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        section_id: PredictEventValues.SECTION_ID.LIVE_NOW,
        action_type: PredictEventValues.ACTION_TYPE.SEE_ALL,
      });
    });

    it('tracks a categories tile tap with category_name and no filter fields', () => {
      predictAnalytics.trackHomeSectionInteraction({
        sectionId: PredictEventValues.SECTION_ID.CATEGORIES,
        actionType: PredictEventValues.ACTION_TYPE.CLICKED,
        categoryName: 'politics',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_HOME_SECTION_INTERACTION.category,
      );
      expect(event.properties).toEqual({
        section_id: PredictEventValues.SECTION_ID.CATEGORIES,
        action_type: PredictEventValues.ACTION_TYPE.CLICKED,
        category_name: 'politics',
        entry_point: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
      expect(event.properties).not.toHaveProperty('filter_id');
      expect(event.properties).not.toHaveProperty('is_dynamic_filter');
    });

    it('tracks a dynamic-filter chip tap with filter id and is_dynamic_filter', () => {
      predictAnalytics.trackHomeSectionInteraction({
        sectionId: PredictEventValues.SECTION_ID.POPULAR_TODAY,
        actionType: PredictEventValues.ACTION_TYPE.CLICKED,
        filterId: 'elections',
        isDynamicFilter: true,
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const event = getTrackedEvent();

      expect(event.properties).toMatchObject({
        section_id: PredictEventValues.SECTION_ID.POPULAR_TODAY,
        action_type: PredictEventValues.ACTION_TYPE.CLICKED,
        filter_id: 'elections',
        is_dynamic_filter: true,
      });
    });

    it('tracks a feed tab change', () => {
      predictAnalytics.trackFeedTabChanged({
        feedId: 'sports',
        tabId: 'tennis',
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_FEED_TAB_CHANGED.category,
      );
      expect(event.properties).toMatchObject({
        feed_id: 'sports',
        tab_id: 'tennis',
        entry_point: PredictEventValues.ENTRY_POINT.HOME_SECTION,
      });
    });

    it('tracks a feed filter change with is_dynamic_filter false for a static filter', () => {
      predictAnalytics.trackFeedFilterChanged({
        feedId: 'sports',
        tabId: 'tennis',
        filterId: 'live',
        isDynamicFilter: false,
      });

      const event = getTrackedEvent();

      expect(event.name).toBe(
        MetaMetricsEvents.PREDICT_FEED_FILTER_CHANGED.category,
      );
      expect(event.properties).toMatchObject({
        feed_id: 'sports',
        tab_id: 'tennis',
        filter_id: 'live',
        is_dynamic_filter: false,
      });
    });
  });
});
