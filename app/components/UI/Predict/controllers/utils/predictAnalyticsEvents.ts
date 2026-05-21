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
  | 'bannerAction';

export const PREDICT_ANALYTICS_EVENTS: Record<
  PredictAnalyticsEventKey,
  PredictAnalyticsEventConfig
> = {
  activityViewed: {
    event: MetaMetricsEvents.PREDICT_ACTIVITY_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_ACTIVITY_VIEWED',
    mapProperties: ({ activityType }) => ({
      [PredictEventProperties.ACTIVITY_TYPE]: activityType,
    }),
  },
  positionViewed: {
    event: MetaMetricsEvents.PREDICT_POSITION_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_POSITION_VIEWED',
    mapProperties: ({ openPositionsCount }) => ({
      [PredictEventProperties.OPEN_POSITIONS_COUNT]: openPositionsCount,
    }),
  },
  feedViewed: {
    event: MetaMetricsEvents.PREDICT_FEED_VIEWED,
    logLabel: '📊 [Analytics] PREDICT_FEED_VIEWED',
    mapProperties: ({
      sessionId,
      feedTab,
      numPagesViewed,
      sessionTime,
      isSessionEnd,
      entryPoint,
      predictScreen,
    }) => ({
      [PredictEventProperties.SESSION_ID]: sessionId,
      [PredictEventProperties.PREDICT_FEED_TAB]: feedTab,
      ...(predictScreen
        ? { [PredictEventProperties.PREDICT_SCREEN]: predictScreen }
        : {}),
      [PredictEventProperties.NUM_FEED_PAGES_VIEWED_IN_SESSION]: numPagesViewed,
      [PredictEventProperties.SESSION_TIME_IN_FEED]: sessionTime,
      [PredictEventProperties.IS_SESSION_END]: isSessionEnd,
      ...(entryPoint
        ? { [PredictEventProperties.ENTRY_POINT]: entryPoint }
        : {}),
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
};
