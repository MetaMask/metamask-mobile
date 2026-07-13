import {
  MetaMetricsEvents,
  mergeAssetViewedProperties,
} from '../../../../core/Analytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../util/analytics/analytics';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  PredictDismissalMethodValue,
  PredictEventProperties,
  PredictEventValues,
  PredictShareStatusValue,
  PredictTradeStatus,
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
  paymentTokenAddress?: string;
  paymentTokenSymbol?: string;
  activeAbTests?: TransactionActiveAbTestEntry[];
}

export interface TrackBetslipDismissedArgs {
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  dismissalMethod: PredictDismissalMethodValue;
  hadEnteredAmount: boolean;
  timeOnScreenMs: number;
  activeAbTests?: TransactionActiveAbTestEntry[];
}

export interface MarketDetailsOpenedArgs {
  marketId: string;
  marketTitle: string;
  marketCategory?: string;
  marketTags?: string[];
  entryPoint: string;
  predictFeedTab?: string;
  predictScreen?: string;
  marketDetailsViewed: string;
  marketSlug?: string;
  gameId?: string;
  gameStartTime?: string;
  gameLeague?: string;
  gameStatus?: string;
  gamePeriod?: string | null;
  gameClock?: string | null;
  activeAbTests?: TransactionActiveAbTestEntry[];
}

export interface FeedViewedArgs {
  sessionId?: string;
  feedTab?: string;
  /** Generic feed (PredictFeedView) identity — lightweight one-shot path. */
  feedId?: string;
  tabId?: string;
  filterId?: string;
  /**
   * Distinguishes the two call paths that share the `PREDICT_FEED_VIEWED` event:
   * - `'focus'` — lightweight one-shot fired by `PredictFeedView` on each screen focus (no session fields).
   * - `'session'` — legacy full-session tracking via `PredictFeedSessionManager` (includes `sessionId`, `numPagesViewed`, etc.).
   *
   * Omit for legacy callers that pre-date this field.
   */
  trackingMode?: 'focus' | 'session';
  predictScreen?: string;
  predictComponent?: string;
  numPagesViewed?: number;
  sessionTime?: number;
  entryPoint?: string;
  isSessionEnd?: boolean;
  openPositionsCount?: number;
  claimablePositionsCount?: number;
  hasClaimableWinnings?: boolean;
  portfolioModuleEnabled?: boolean;
}

export interface HomeViewedArgs {
  entryPoint?: string;
}

export interface HomeSectionInteractionArgs {
  sectionId: string;
  actionType: string;
  filterId?: string;
  isDynamicFilter?: boolean;
  categoryName?: string;
  entryPoint?: string;
}

export interface FeedTabChangedArgs {
  feedId: string;
  tabId: string;
  filterId?: string;
  entryPoint?: string;
}

export interface FeedFilterChangedArgs {
  feedId: string;
  tabId?: string;
  filterId: string;
  isDynamicFilter?: boolean;
  entryPoint?: string;
}

export interface CategoryClickedArgs {
  categoryName: string;
  entryPoint?: string;
}

export interface BannerArgs {
  actionType: string;
  bannerType: string;
}

export interface PredictPortfolioAnalyticsContextArgs {
  actionType?: string;
  entryPoint?: string;
  openPositionsCount?: number;
  claimablePositionsCount?: number;
  hasClaimableWinnings?: boolean;
  predictScreen?: string;
  predictComponent?: string;
  predictFeedTab?: string;
}

export interface PositionViewedArgs
  extends PredictPortfolioAnalyticsContextArgs {
  openPositionsCount?: number;
}

export interface ActivityViewedArgs
  extends PredictPortfolioAnalyticsContextArgs {
  activityType: string;
}

export interface PortfolioPositionsButtonTappedArgs
  extends Omit<
    PredictPortfolioAnalyticsContextArgs,
    'actionType' | 'predictScreen' | 'predictComponent' | 'predictFeedTab'
  > {
  predictComponent?: string;
}

export interface PortfolioTransactionInitiatedArgs
  extends Omit<
    PredictPortfolioAnalyticsContextArgs,
    'actionType' | 'predictScreen' | 'predictComponent' | 'predictFeedTab'
  > {
  predictScreen?: string;
  predictComponent?: string;
  transactionType: string;
}

export interface PositionsScreenViewedArgs
  extends Omit<
    PredictPortfolioAnalyticsContextArgs,
    'actionType' | 'predictScreen' | 'predictComponent' | 'predictFeedTab'
  > {
  predictScreen?: string;
}

export interface PositionsTabViewedArgs
  extends Omit<
    PredictPortfolioAnalyticsContextArgs,
    'actionType' | 'predictScreen' | 'predictComponent' | 'predictFeedTab'
  > {
  predictScreen?: string;
  predictFeedTab: string;
}

export interface ShareActionArgs {
  status: PredictShareStatusValue;
  marketId?: string;
  marketSlug?: string;
}

export interface SearchInteractedArgs {
  interactionType: string;
  predictFeedTab?: string;
  entryPoint?: string;
  searchQuery?: string;
  resultsCount?: number;
  marketId?: string;
  marketTitle?: string;
}

const PREDICT_PORTFOLIO_MODULE_COMPONENT =
  PredictEventValues.PREDICT_COMPONENT.PREDICT_PORTFOLIO_MODULE;

export class PredictAnalytics {
  private lastPredictMarketId: string | null = null;
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
    paymentTokenAddress,
    paymentTokenSymbol,
    activeAbTests,
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
      ...(analyticsProperties.predictFeedTab && {
        [PredictEventProperties.PREDICT_FEED_TAB]:
          analyticsProperties.predictFeedTab,
      }),
      [PredictEventProperties.TRANSACTION_TYPE]:
        analyticsProperties.transactionType,
      [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
      [PredictEventProperties.VOLUME]: analyticsProperties.volume,
      [PredictEventProperties.SHARE_PRICE]: sharePrice,
      ...(analyticsProperties.actionType && {
        [PredictEventProperties.ACTION_TYPE]: analyticsProperties.actionType,
      }),
      ...(analyticsProperties.predictScreen && {
        [PredictEventProperties.PREDICT_SCREEN]:
          analyticsProperties.predictScreen,
      }),
      ...(analyticsProperties.predictComponent && {
        [PredictEventProperties.PREDICT_COMPONENT]:
          analyticsProperties.predictComponent,
      }),
      ...(analyticsProperties.openPositionsCount !== undefined && {
        [PredictEventProperties.OPEN_POSITIONS_COUNT]:
          analyticsProperties.openPositionsCount,
      }),
      ...(analyticsProperties.claimablePositionsCount !== undefined && {
        [PredictEventProperties.CLAIMABLE_POSITIONS_COUNT]:
          analyticsProperties.claimablePositionsCount,
      }),
      ...(analyticsProperties.hasClaimableWinnings !== undefined && {
        [PredictEventProperties.HAS_CLAIMABLE_WINNINGS]:
          analyticsProperties.hasClaimableWinnings,
      }),
      ...(analyticsProperties.portfolioModuleEnabled !== undefined && {
        [PredictEventProperties.PORTFOLIO_MODULE_ENABLED]:
          analyticsProperties.portfolioModuleEnabled,
      }),
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
      ...(paymentTokenAddress && {
        [PredictEventProperties.PAYMENT_TOKEN_ADDRESS]: paymentTokenAddress,
      }),
      ...(paymentTokenSymbol && {
        [PredictEventProperties.PAYMENT_TOKEN_SYMBOL]: paymentTokenSymbol,
      }),
      ...(activeAbTests &&
        activeAbTests.length > 0 && {
          [PredictEventProperties.ACTIVE_AB_TESTS]: activeAbTests,
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

  public trackBetslipDismissed({
    analyticsProperties,
    dismissalMethod,
    hadEnteredAmount,
    timeOnScreenMs,
    activeAbTests,
  }: TrackBetslipDismissedArgs): void {
    if (!analyticsProperties) {
      return;
    }

    const regularProperties = {
      [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
      [PredictEventProperties.MARKET_TITLE]: analyticsProperties.marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]:
        analyticsProperties.marketCategory,
      [PredictEventProperties.ENTRY_POINT]: analyticsProperties.entryPoint,
      [PredictEventProperties.DISMISSAL_METHOD]: dismissalMethod,
      [PredictEventProperties.HAD_ENTERED_AMOUNT]: hadEnteredAmount,
      [PredictEventProperties.TIME_ON_SCREEN_MS]: timeOnScreenMs,
      ...(activeAbTests &&
        activeAbTests.length > 0 && {
          [PredictEventProperties.ACTIVE_AB_TESTS]: activeAbTests,
        }),
    };

    DevLogger.log('📊 [Analytics] PREDICT_BETSLIP_DISMISSED', {
      regularProperties,
    });

    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PREDICT_BETSLIP_DISMISSED,
      )
        .addProperties(regularProperties)
        .build(),
    );
  }

  public trackMarketDetailsOpened(params: MarketDetailsOpenedArgs): void {
    this.trackConfiguredEvent('marketDetailsOpened', params);
  }

  public trackPositionViewed(args: PositionViewedArgs): void {
    this.trackConfiguredEvent('positionViewed', args);
  }

  public trackActivityViewed(args: ActivityViewedArgs): void {
    this.trackConfiguredEvent('activityViewed', args);
  }

  public trackPortfolioPositionsButtonTapped({
    predictComponent = PREDICT_PORTFOLIO_MODULE_COMPONENT,
    ...args
  }: PortfolioPositionsButtonTappedArgs): void {
    this.trackPositionViewed({
      ...args,
      actionType: PredictEventValues.ACTION_TYPE.CLICKED,
      predictComponent,
    });
  }

  public trackPortfolioTransactionInitiated({
    predictComponent = PREDICT_PORTFOLIO_MODULE_COMPONENT,
    transactionType,
    ...args
  }: PortfolioTransactionInitiatedArgs): void {
    this.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties: {
        ...args,
        predictComponent,
        transactionType,
      },
    });
  }

  public trackPositionsScreenViewed({
    predictScreen = PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
    ...args
  }: PositionsScreenViewedArgs): void {
    this.trackPositionViewed({
      ...args,
      actionType: PredictEventValues.ACTION_TYPE.VIEWED,
      predictScreen,
    });
  }

  public trackPositionsTabViewed({
    predictScreen = PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
    predictFeedTab,
    ...args
  }: PositionsTabViewedArgs): void {
    if (predictFeedTab === PredictEventValues.PREDICT_FEED_TAB.HISTORY) {
      this.trackActivityViewed({
        ...args,
        actionType: PredictEventValues.ACTION_TYPE.VIEWED,
        activityType: PredictEventValues.ACTIVITY_TYPE.ACTIVITY_LIST,
        predictScreen,
        predictFeedTab,
      });
      return;
    }

    this.trackPositionViewed({
      ...args,
      actionType: PredictEventValues.ACTION_TYPE.VIEWED,
      predictScreen,
      predictFeedTab,
    });
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
    feedId,
    tabId,
    filterId,
    trackingMode,
    predictScreen,
    predictComponent,
    numPagesViewed,
    sessionTime,
    entryPoint,
    isSessionEnd,
    openPositionsCount,
    claimablePositionsCount,
    hasClaimableWinnings,
    portfolioModuleEnabled,
  }: FeedViewedArgs): void {
    this.trackConfiguredEvent('feedViewed', {
      sessionId,
      feedTab,
      feedId,
      tabId,
      filterId,
      trackingMode,
      predictScreen,
      predictComponent,
      numPagesViewed,
      sessionTime,
      entryPoint,
      isSessionEnd,
      openPositionsCount,
      claimablePositionsCount,
      hasClaimableWinnings,
      portfolioModuleEnabled,
    });
  }

  public trackBannerAction(params: BannerArgs): void {
    this.trackConfiguredEvent('bannerAction', params);
  }

  public trackCategoryClicked(params: CategoryClickedArgs): void {
    this.trackConfiguredEvent('categoryClicked', params);
  }

  public trackShareAction(params: ShareActionArgs): void {
    this.trackConfiguredEvent('shareAction', params);
  }

  public trackSearchInteracted(params: SearchInteractedArgs): void {
    this.trackConfiguredEvent('searchInteracted', params);
  }

  public trackHomeViewed(params: HomeViewedArgs): void {
    this.trackConfiguredEvent('homeViewed', params);
  }

  public trackHomeSectionInteraction(params: HomeSectionInteractionArgs): void {
    this.trackConfiguredEvent('homeSectionInteraction', params);
  }

  public trackFeedTabChanged(params: FeedTabChangedArgs): void {
    this.trackConfiguredEvent('feedTabChanged', params);
  }

  public trackFeedFilterChanged(params: FeedFilterChangedArgs): void {
    this.trackConfiguredEvent('feedFilterChanged', params);
  }

  private trackConfiguredEvent(
    configKey: keyof typeof PREDICT_ANALYTICS_EVENTS,
    args: object,
  ): void {
    const config = PREDICT_ANALYTICS_EVENTS[configKey];
    const eventArgs = args as Record<string, unknown>;
    const analyticsProperties = config.mapProperties(eventArgs);
    const sensitiveProperties = config.mapSensitiveProperties?.(eventArgs);

    if (configKey === 'marketDetailsOpened') {
      const marketId = analyticsProperties[PredictEventProperties.MARKET_ID];
      this.lastPredictMarketId = typeof marketId === 'string' ? marketId : null;
    }

    DevLogger.log(config.logLabel, {
      analyticsProperties,
    });

    let eventBuilder = AnalyticsEventBuilder.createEventBuilder(config.event);
    eventBuilder = eventBuilder.addProperties(analyticsProperties);

    if (sensitiveProperties) {
      eventBuilder = eventBuilder.addSensitiveProperties(sensitiveProperties);
    }

    analytics.trackEvent(eventBuilder.build());

    // ASSET_VIEWED is only meaningful for session-aware feed views (full
    // session fields present). The lightweight PredictFeedView one-shot path
    // (tracking_mode: 'focus') lacks session context and would produce
    // malformed/noisy ASSET_VIEWED records, so we skip it there.
    const isFocusOnlyFeedView =
      configKey === 'feedViewed' &&
      (eventArgs as Record<string, unknown>).trackingMode === 'focus';

    if (
      (configKey === 'feedViewed' || configKey === 'marketDetailsOpened') &&
      !isFocusOnlyFeedView
    ) {
      const assetViewedBaseProperties =
        configKey === 'feedViewed' &&
        this.lastPredictMarketId &&
        analyticsProperties[PredictEventProperties.MARKET_ID] === undefined
          ? {
              ...analyticsProperties,
              [PredictEventProperties.MARKET_ID]: this.lastPredictMarketId,
            }
          : analyticsProperties;

      analytics.trackEvent(
        AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents.ASSET_VIEWED)
          .addProperties(
            mergeAssetViewedProperties(
              'Predict',
              assetViewedBaseProperties as Record<string, unknown>,
            ),
          )
          .build(),
      );
    }
  }
}
