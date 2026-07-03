import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PredictEventProperties } from '../../constants/eventNames';

export interface PredictAnalyticsEventConfig {
  event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents];
  mapProperties: (args: Record<string, unknown>) => Record<string, unknown>;
  mapSensitiveProperties?: (
    args: Record<string, unknown>,
  ) => Record<string, unknown> | undefined;
  logLabel?: string;
}

export type PredictAnalyticsEventKey =
  | 'activityViewed'
  | 'positionViewed'
  | 'feedViewed'
  | 'shareAction'
  | 'geoBlockTriggered'
  | 'marketDetailsOpened'
  | 'bannerAction'
  | 'categoryClicked'
  | 'searchInteracted'
  | 'homeViewed'
  | 'homeSectionInteraction'
  | 'feedTabChanged'
  | 'feedFilterChanged';

const mapPortfolioProperties = ({
  actionType,
  entryPoint,
  openPositionsCount,
  claimablePositionsCount,
  hasClaimableWinnings,
  portfolioModuleEnabled,
  predictScreen,
  predictComponent,
  predictFeedTab,
}: Record<string, unknown>) => ({
  ...(actionType ? { [PredictEventProperties.ACTION_TYPE]: actionType } : {}),
  ...(entryPoint ? { [PredictEventProperties.ENTRY_POINT]: entryPoint } : {}),
  ...(openPositionsCount !== undefined
    ? { [PredictEventProperties.OPEN_POSITIONS_COUNT]: openPositionsCount }
    : {}),
  ...(claimablePositionsCount !== undefined
    ? {
        [PredictEventProperties.CLAIMABLE_POSITIONS_COUNT]:
          claimablePositionsCount,
      }
    : {}),
  ...(hasClaimableWinnings !== undefined
    ? {
        [PredictEventProperties.HAS_CLAIMABLE_WINNINGS]: hasClaimableWinnings,
      }
    : {}),
  ...(portfolioModuleEnabled !== undefined
    ? {
        [PredictEventProperties.PORTFOLIO_MODULE_ENABLED]:
          portfolioModuleEnabled,
      }
    : {}),
  ...(predictScreen
    ? { [PredictEventProperties.PREDICT_SCREEN]: predictScreen }
    : {}),
  ...(predictComponent
    ? { [PredictEventProperties.PREDICT_COMPONENT]: predictComponent }
    : {}),
  ...(predictFeedTab
    ? { [PredictEventProperties.PREDICT_FEED_TAB]: predictFeedTab }
    : {}),
});

export const PREDICT_ANALYTICS_EVENTS: Record<
  PredictAnalyticsEventKey,
  PredictAnalyticsEventConfig
> = {
  activityViewed: {
    event: MetaMetricsEvents.PREDICT_ACTIVITY_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_ACTIVITY_VIEWED',
    mapProperties: ({ activityType, ...args }) => ({
      [PredictEventProperties.ACTIVITY_TYPE]: activityType,
      ...mapPortfolioProperties(args),
    }),
  },
  positionViewed: {
    event: MetaMetricsEvents.PREDICT_POSITION_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_POSITION_VIEWED',
    mapProperties: ({ openPositionsCount, ...args }) => ({
      ...(openPositionsCount !== undefined
        ? { [PredictEventProperties.OPEN_POSITIONS_COUNT]: openPositionsCount }
        : {}),
      ...mapPortfolioProperties(args),
    }),
  },
  feedViewed: {
    event: MetaMetricsEvents.PREDICT_FEED_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_FEED_VIEWED',
    mapProperties: ({
      sessionId,
      feedTab,
      feedId,
      tabId,
      filterId,
      trackingMode,
      numPagesViewed,
      sessionTime,
      isSessionEnd,
      entryPoint,
      predictScreen,
      predictComponent,
      ...args
    }) => ({
      // Session fields are only present for the session-managed legacy feed
      // (PredictFeedSessionManager). The generic PredictFeedView fires this
      // event as a lightweight one-shot with feed/tab/filter ids instead, so
      // every session field is spread conditionally to stay back-compatible.
      ...(sessionId !== undefined
        ? { [PredictEventProperties.SESSION_ID]: sessionId }
        : {}),
      ...(feedTab !== undefined
        ? { [PredictEventProperties.PREDICT_FEED_TAB]: feedTab }
        : {}),
      ...(feedId ? { [PredictEventProperties.FEED_ID]: feedId } : {}),
      ...(tabId ? { [PredictEventProperties.TAB_ID]: tabId } : {}),
      ...(filterId ? { [PredictEventProperties.FILTER_ID]: filterId } : {}),
      ...(trackingMode
        ? { [PredictEventProperties.TRACKING_MODE]: trackingMode }
        : {}),
      ...(predictScreen
        ? { [PredictEventProperties.PREDICT_SCREEN]: predictScreen }
        : {}),
      ...(predictComponent
        ? { [PredictEventProperties.PREDICT_COMPONENT]: predictComponent }
        : {}),
      ...(numPagesViewed !== undefined
        ? {
            [PredictEventProperties.NUM_FEED_PAGES_VIEWED_IN_SESSION]:
              numPagesViewed,
          }
        : {}),
      ...(sessionTime !== undefined
        ? { [PredictEventProperties.SESSION_TIME_IN_FEED]: sessionTime }
        : {}),
      ...(isSessionEnd !== undefined
        ? { [PredictEventProperties.IS_SESSION_END]: isSessionEnd }
        : {}),
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
      ...mapPortfolioProperties(args),
    }),
  },
  bannerAction: {
    event: MetaMetricsEvents.PREDICT_BANNER_ACTION,
    logLabel: '📊 [Analytics] PREDICT_BANNER_ACTION',
    mapProperties: ({ actionType, bannerType }) => ({
      [PredictEventProperties.ACTION_TYPE]: actionType,
      [PredictEventProperties.BANNER_TYPE]: bannerType,
    }),
  },
  categoryClicked: {
    event: MetaMetricsEvents.PREDICT_CATEGORY_CLICKED,
    logLabel: '📊 [Analytics] PREDICT_CATEGORY_CLICKED',
    mapProperties: ({ categoryName, entryPoint }) => ({
      [PredictEventProperties.CATEGORY_NAME]: categoryName,
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
    }),
  },
  homeViewed: {
    event: MetaMetricsEvents.PREDICT_HOME_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_HOME_VIEWED',
    mapProperties: ({ entryPoint }) => ({
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
    }),
  },
  homeSectionInteraction: {
    event: MetaMetricsEvents.PREDICT_HOME_SECTION_INTERACTION,
    logLabel: '📊 [Analytics] PREDICT_HOME_SECTION_INTERACTION',
    mapProperties: ({
      sectionId,
      actionType,
      filterId,
      isDynamicFilter,
      categoryName,
      entryPoint,
    }) => ({
      [PredictEventProperties.SECTION_ID]: sectionId,
      [PredictEventProperties.ACTION_TYPE]: actionType,
      ...(filterId ? { [PredictEventProperties.FILTER_ID]: filterId } : {}),
      ...(isDynamicFilter !== undefined
        ? { [PredictEventProperties.IS_DYNAMIC_FILTER]: isDynamicFilter }
        : {}),
      ...(categoryName
        ? { [PredictEventProperties.CATEGORY_NAME]: categoryName }
        : {}),
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
    }),
  },
  feedTabChanged: {
    event: MetaMetricsEvents.PREDICT_FEED_TAB_CHANGED,
    logLabel: '📊 [Analytics] PREDICT_FEED_TAB_CHANGED',
    mapProperties: ({ feedId, tabId, filterId, entryPoint }) => ({
      [PredictEventProperties.FEED_ID]: feedId,
      [PredictEventProperties.TAB_ID]: tabId,
      ...(filterId ? { [PredictEventProperties.FILTER_ID]: filterId } : {}),
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
    }),
  },
  feedFilterChanged: {
    event: MetaMetricsEvents.PREDICT_FEED_FILTER_CHANGED,
    logLabel: '📊 [Analytics] PREDICT_FEED_FILTER_CHANGED',
    mapProperties: ({
      feedId,
      tabId,
      filterId,
      isDynamicFilter,
      entryPoint,
    }) => ({
      [PredictEventProperties.FEED_ID]: feedId,
      ...(tabId ? { [PredictEventProperties.TAB_ID]: tabId } : {}),
      [PredictEventProperties.FILTER_ID]: filterId,
      ...(isDynamicFilter !== undefined
        ? { [PredictEventProperties.IS_DYNAMIC_FILTER]: isDynamicFilter }
        : {}),
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
    }),
  },
  shareAction: {
    event: MetaMetricsEvents.SHARE_ACTION,
    logLabel: '📊 [Analytics] SHARE_ACTION',
    mapProperties: ({ status, marketId, marketSlug }) => ({
      [PredictEventProperties.STATUS]: status,
      ...(marketId ? { [PredictEventProperties.MARKET_ID]: marketId } : {}),
      ...(marketSlug
        ? { [PredictEventProperties.MARKET_SLUG]: marketSlug }
        : {}),
    }),
  },
  geoBlockTriggered: {
    event: MetaMetricsEvents.PREDICT_GEO_BLOCKED_TRIGGERED,
    logLabel: '📊 [Analytics] PREDICT_GEO_BLOCKED_TRIGGERED',
    mapProperties: ({ country, attemptedAction }) => ({
      [PredictEventProperties.COUNTRY]: country,
      [PredictEventProperties.ATTEMPTED_ACTION]: attemptedAction,
    }),
  },
  marketDetailsOpened: {
    event: MetaMetricsEvents.PREDICT_MARKET_DETAILS_OPENED,
    logLabel: '📊 [Analytics] PREDICT_MARKET_DETAILS_OPENED',
    mapProperties: ({
      marketId,
      marketTitle,
      marketCategory,
      marketTags,
      entryPoint,
      predictFeedTab,
      predictScreen,
      marketDetailsViewed,
      marketSlug,
      gameId,
      gameStartTime,
      gameLeague,
      gameStatus,
      gamePeriod,
      gameClock,
      activeAbTests,
    }) => ({
      [PredictEventProperties.MARKET_ID]: marketId,
      [PredictEventProperties.MARKET_TITLE]: marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]: marketCategory,
      [PredictEventProperties.MARKET_TAGS]: marketTags,
      [PredictEventProperties.ENTRY_POINT]: entryPoint,
      ...(predictFeedTab
        ? { [PredictEventProperties.PREDICT_FEED_TAB]: predictFeedTab }
        : {}),
      ...(predictScreen
        ? { [PredictEventProperties.PREDICT_SCREEN]: predictScreen }
        : {}),
      [PredictEventProperties.MARKET_DETAILS_VIEWED]: marketDetailsViewed,
      ...(marketSlug
        ? { [PredictEventProperties.MARKET_SLUG]: marketSlug }
        : {}),
      ...(gameId ? { [PredictEventProperties.GAME_ID]: gameId } : {}),
      ...(gameStartTime
        ? { [PredictEventProperties.GAME_START_TIME]: gameStartTime }
        : {}),
      ...(gameLeague
        ? { [PredictEventProperties.GAME_LEAGUE]: gameLeague }
        : {}),
      ...(gameStatus
        ? { [PredictEventProperties.GAME_STATUS]: gameStatus }
        : {}),
      ...(gamePeriod
        ? { [PredictEventProperties.GAME_PERIOD]: gamePeriod }
        : {}),
      ...(gameClock ? { [PredictEventProperties.GAME_CLOCK]: gameClock } : {}),
      ...(Array.isArray(activeAbTests) && activeAbTests.length > 0
        ? { [PredictEventProperties.ACTIVE_AB_TESTS]: activeAbTests }
        : {}),
    }),
  },
  searchInteracted: {
    event: MetaMetricsEvents.PREDICT_SEARCH_INTERACTED,
    logLabel: '📊 [Analytics] PREDICT_SEARCH_INTERACTED',
    mapProperties: ({
      interactionType,
      predictFeedTab,
      entryPoint,
      searchQuery,
      resultsCount,
      marketId,
      marketTitle,
    }) => ({
      [PredictEventProperties.INTERACTION_TYPE]: interactionType,
      ...(predictFeedTab
        ? { [PredictEventProperties.PREDICT_FEED_TAB]: predictFeedTab }
        : {}),
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
      ...(searchQuery !== undefined
        ? { [PredictEventProperties.SEARCH_QUERY]: searchQuery }
        : {}),
      ...(resultsCount !== undefined
        ? { [PredictEventProperties.RESULTS_COUNT]: resultsCount }
        : {}),
      ...(marketId ? { [PredictEventProperties.MARKET_ID]: marketId } : {}),
      ...(marketTitle
        ? { [PredictEventProperties.MARKET_TITLE]: marketTitle }
        : {}),
    }),
  },
};
