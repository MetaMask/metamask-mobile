import { MetaMetricsEvents } from '../../../../core/Analytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import {
  PredictEventProperties,
  PredictShareStatusValue,
  PredictTradeStatusValue,
} from '../constants/eventNames';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { PlaceOrderParams, PredictOrderType } from '../types';
import { PREDICT_ANALYTICS_EVENTS } from './utils/predictAnalyticsEvents';

export interface PredictAnalyticsContext {
  getEligibility(): { eligible: boolean; country?: string };
}

export interface TrackPredictOrderEventArgs {
  status: PredictTradeStatusValue;
  amountUsd?: number;
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  completionDuration?: number;
  failureReason?: string;
  sharePrice?: number;
  pnl?: number;
  orderType?: PredictOrderType;
}

export interface MarketDetailsOpenedArgs {
  marketId: string;
  marketTitle: string;
  marketCategory?: string;
  marketTags?: string[];
  entryPoint: string;
  marketDetailsViewed: string;
  marketSlug?: string;
  gameId?: string;
  gameStartTime?: string;
  gameLeague?: string;
  gameStatus?: string;
  gamePeriod?: string | null;
  gameClock?: string | null;
}

export interface FeedViewedArgs {
  sessionId: string;
  feedTab: string;
  numPagesViewed: number;
  sessionTime: number;
  entryPoint?: string;
  isSessionEnd?: boolean;
}

export interface ShareActionArgs {
  status: PredictShareStatusValue;
  marketId?: string;
  marketSlug?: string;
}

export class PredictAnalytics {
  private readonly context: PredictAnalyticsContext;

  constructor(context: PredictAnalyticsContext) {
    this.context = context;
  }

  public async trackPredictOrderEvent({
    status,
    amountUsd,
    analyticsProperties,
    completionDuration,
    failureReason,
    sharePrice,
    pnl,
    orderType,
  }: TrackPredictOrderEventArgs): Promise<void> {
    if (!analyticsProperties) {
      return;
    }

    const regularProperties = {
      [PredictEventProperties.STATUS]: status,
      [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
      [PredictEventProperties.MARKET_TITLE]: analyticsProperties.marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]:
        analyticsProperties.marketCategory,
      [PredictEventProperties.MARKET_TAGS]: analyticsProperties.marketTags,
      [PredictEventProperties.ENTRY_POINT]: analyticsProperties.entryPoint,
      [PredictEventProperties.TRANSACTION_TYPE]:
        analyticsProperties.transactionType,
      [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
      [PredictEventProperties.VOLUME]: analyticsProperties.volume,
      [PredictEventProperties.SHARE_PRICE]: sharePrice,
      ...(analyticsProperties.marketType && {
        [PredictEventProperties.MARKET_TYPE]: analyticsProperties.marketType,
      }),
      ...(analyticsProperties.outcome && {
        [PredictEventProperties.OUTCOME]: analyticsProperties.outcome,
      }),
      ...(completionDuration !== undefined && {
        [PredictEventProperties.COMPLETION_DURATION]: completionDuration,
      }),
      ...(failureReason && {
        [PredictEventProperties.FAILURE_REASON]: failureReason,
      }),
      ...(analyticsProperties.marketSlug && {
        [PredictEventProperties.MARKET_SLUG]: analyticsProperties.marketSlug,
      }),
      ...(analyticsProperties.gameId && {
        [PredictEventProperties.GAME_ID]: analyticsProperties.gameId,
      }),
      ...(analyticsProperties.gameStartTime && {
        [PredictEventProperties.GAME_START_TIME]:
          analyticsProperties.gameStartTime,
      }),
      ...(analyticsProperties.gameLeague && {
        [PredictEventProperties.GAME_LEAGUE]: analyticsProperties.gameLeague,
      }),
      ...(analyticsProperties.gameStatus && {
        [PredictEventProperties.GAME_STATUS]: analyticsProperties.gameStatus,
      }),
      ...(analyticsProperties.gamePeriod && {
        [PredictEventProperties.GAME_PERIOD]: analyticsProperties.gamePeriod,
      }),
      ...(analyticsProperties.gameClock && {
        [PredictEventProperties.GAME_CLOCK]: analyticsProperties.gameClock,
      }),
      ...(orderType && {
        [PredictEventProperties.ORDER_TYPE]: orderType,
      }),
    };

    const sensitiveProperties = {
      ...(amountUsd !== undefined && {
        [PredictEventProperties.AMOUNT_USD]: amountUsd,
      }),
      ...(pnl !== undefined && {
        [PredictEventProperties.PNL]: pnl,
      }),
    };

    DevLogger.log(`📊 [Analytics] PREDICT_TRADE_TRANSACTION [${status}]`, {
      providerId: POLYMARKET_PROVIDER_ID,
      regularProperties,
      sensitiveProperties,
    });

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_TRADE_TRANSACTION,
      )
        .addProperties(regularProperties)
        .addSensitiveProperties(sensitiveProperties)
        .build(),
    );
  }

  public trackMarketDetailsOpened(params: MarketDetailsOpenedArgs): void {
    this.trackConfiguredEvent('marketDetailsOpened', params);
  }

  public trackPositionViewed({
    openPositionsCount,
  }: {
    openPositionsCount: number;
  }): void {
    this.trackConfiguredEvent('positionViewed', { openPositionsCount });
  }

  public trackActivityViewed({ activityType }: { activityType: string }): void {
    this.trackConfiguredEvent('activityViewed', { activityType });
  }

  public trackGeoBlockTriggered({
    attemptedAction,
  }: {
    attemptedAction: string;
  }): void {
    const eligibilityData = this.context.getEligibility();

    this.trackConfiguredEvent('geoBlockTriggered', {
      country: eligibilityData?.country,
      attemptedAction,
    });
  }

  public trackFeedViewed({
    sessionId,
    feedTab,
    numPagesViewed,
    sessionTime,
    entryPoint,
    isSessionEnd = false,
  }: FeedViewedArgs): void {
    this.trackConfiguredEvent('feedViewed', {
      sessionId,
      feedTab,
      numPagesViewed,
      sessionTime,
      entryPoint,
      isSessionEnd,
    });
  }

  public trackShareAction(params: ShareActionArgs): void {
    this.trackConfiguredEvent('shareAction', params);
  }

  private trackConfiguredEvent(
    configKey: keyof typeof PREDICT_ANALYTICS_EVENTS,
    args: object,
  ): void {
    const config = PREDICT_ANALYTICS_EVENTS[configKey];
    const eventArgs = args as Record<string, unknown>;
    const analyticsProperties = config.mapProperties(eventArgs);
    const sensitiveProperties = config.mapSensitiveProperties?.(eventArgs);

    DevLogger.log(config.logLabel, {
      analyticsProperties,
    });

    let eventBuilder = AnalyticsEventBuilder.createEventBuilder(config.event);
    eventBuilder = eventBuilder.addProperties(analyticsProperties);

    if (sensitiveProperties) {
      eventBuilder = eventBuilder.addSensitiveProperties(sensitiveProperties);
    }

    analytics.trackEvent(eventBuilder.build());
  }
}
