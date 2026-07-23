import {
  array,
  boolean,
  defaulted,
  enums,
  number,
  object,
  optional,
  string,
  type,
} from '@metamask/superstruct';
import { HexSchema } from './common';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  DEFAULT_PREDICT_WORLD_CUP_FLAG,
  DEFAULT_WIMBLEDON_TAB_FLAG,
  PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS,
} from '../constants/flags';

export const PredictFeeCollectionSchema = defaulted(
  object({
    enabled: defaulted(boolean(), () => DEFAULT_FEE_COLLECTION_FLAG.enabled),
    collector: defaulted(
      HexSchema,
      () => DEFAULT_FEE_COLLECTION_FLAG.collector,
    ),
    metamaskFee: defaulted(
      number(),
      () => DEFAULT_FEE_COLLECTION_FLAG.metamaskFee,
    ),
    providerFee: defaulted(
      number(),
      () => DEFAULT_FEE_COLLECTION_FLAG.providerFee,
    ),
    waiveList: defaulted(
      array(string()),
      () => DEFAULT_FEE_COLLECTION_FLAG.waiveList,
    ),
    executors: defaulted(
      array(string()),
      () => DEFAULT_FEE_COLLECTION_FLAG.executors,
    ),
    permit2Enabled: defaulted(boolean(), () => false),
  }),
  () => DEFAULT_FEE_COLLECTION_FLAG,
);

export const PredictWorldCupStageSchema = object({
  key: string(),
  labelKey: optional(string()),
  label: optional(string()),
  eventIds: defaulted(array(string()), () => []),
});

// Uses `type()` (not strict `object()`) so unknown keys in the remote
// feature-flag payload are tolerated rather than throwing. Remote config is
// managed independently of client releases, so a legacy/extra key (e.g. the
// previously-supported `seriesId`) must not cause `parse()` to fall back to the
// disabled default and silently turn World Cup off for everyone.
export const PredictWorldCupSchema = defaulted(
  type({
    enabled: defaulted(boolean(), () => DEFAULT_PREDICT_WORLD_CUP_FLAG.enabled),
    minimumVersion: defaulted(
      string(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.minimumVersion,
    ),
    showMainFeedBanner: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.showMainFeedBanner,
    ),
    showMainFeedTab: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.showMainFeedTab,
    ),
    showWorldCupScreen: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.showWorldCupScreen,
    ),
    showHubV2: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.showHubV2,
    ),
    showHubBanner: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.showHubBanner,
    ),
    tagSlug: defaulted(string(), () => DEFAULT_PREDICT_WORLD_CUP_FLAG.tagSlug),
    gamesTagId: defaulted(
      string(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.gamesTagId,
    ),
    winnerEventId: defaulted(
      string(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.winnerEventId,
    ),
    bannerImage: optional(
      object({
        url: string(),
        width: number(),
        height: number(),
      }),
    ),
    stages: defaulted(array(PredictWorldCupStageSchema), () => []),
  }),
  () => DEFAULT_PREDICT_WORLD_CUP_FLAG,
);

export const PredictWimbledonTabSchema = defaulted(
  type({
    enabled: defaulted(boolean(), () => DEFAULT_WIMBLEDON_TAB_FLAG.enabled),
    minimumVersion: defaulted(
      string(),
      () => DEFAULT_WIMBLEDON_TAB_FLAG.minimumVersion,
    ),
    queryParams: defaulted(
      string(),
      () => PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS,
    ),
  }),
  () => DEFAULT_WIMBLEDON_TAB_FLAG,
);

export const PredictSportsFeedChipSchema = type({
  id: string(),
  kind: enums(['games', 'props', 'tag']),
  titleKey: optional(string()),
  label: optional(string()),
  tagSlug: optional(string()),
  queryParams: optional(string()),
  startTimeMinMinutesAgo: optional(number()),
});

export const PredictSportsFeedTabSchema = type({
  id: string(),
  titleKey: optional(string()),
  label: optional(string()),
  tagSlug: optional(string()),
  defaultFilterId: optional(string()),
  chips: defaulted(array(PredictSportsFeedChipSchema), () => []),
});

export const PredictSportsFeedSchema = defaulted(
  type({
    enabled: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_SPORTS_FEED_FLAG.enabled,
    ),
    minimumVersion: defaulted(
      string(),
      () => DEFAULT_PREDICT_SPORTS_FEED_FLAG.minimumVersion,
    ),
    tabs: defaulted(
      array(PredictSportsFeedTabSchema),
      () => DEFAULT_PREDICT_SPORTS_FEED_FLAG.tabs,
    ),
  }),
  () => DEFAULT_PREDICT_SPORTS_FEED_FLAG,
);
