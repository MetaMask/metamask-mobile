import {
  array,
  boolean,
  defaulted,
  literal,
  enums,
  number,
  object,
  optional,
  refine,
  string,
  type,
  union,
} from '@metamask/superstruct';
import compareVersions from 'compare-versions';
import { HexSchema } from './common';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_PREDICT_FEED_BANNER_FLAG,
  DEFAULT_PREDICT_FEED_CAROUSEL_FLAG,
  DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  DEFAULT_WIMBLEDON_TAB_FLAG,
  PREDICT_MARKET_LIST_ORDERS,
  PREDICT_WIMBLEDON_DEFAULT_QUERY_PARAMS,
} from '../constants/flags';
import {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from '../constants/feedBanner';

const PredictFeedCarouselModeSchema = union([
  literal('live'),
  literal('custom'),
]);
const PredictFeedCarouselCompositionSchema = union([
  literal('query-results'),
  literal('live-now'),
]);

const SemanticVersionSchema = refine(
  string(),
  'semantic version',
  compareVersions.validate,
);
const MinimumVersionSchema = union([literal(''), SemanticVersionSchema]);

export const PredictFeedCarouselSchema = defaulted(
  type({
    enabled: defaulted(
      boolean(),
      () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.enabled,
    ),
    minimumVersion: defaulted(
      MinimumVersionSchema,
      () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.minimumVersion,
    ),
    mode: defaulted(
      PredictFeedCarouselModeSchema,
      () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.mode,
    ),
    title: optional(string()),
    deeplink: optional(string()),
    contentSource: defaulted(
      type({
        composition: defaulted(
          PredictFeedCarouselCompositionSchema,
          () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.contentSource.composition,
        ),
        queryParams: defaulted(
          string(),
          () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.contentSource.queryParams,
        ),
        excludedMarketIds: defaulted(
          array(string()),
          () =>
            DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.contentSource.excludedMarketIds,
        ),
      }),
      () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG.contentSource,
    ),
  }),
  () => DEFAULT_PREDICT_FEED_CAROUSEL_FLAG,
);

const PredictFeedBannerPositionSchema = union([
  literal(PredictFeedBannerPosition.AfterBalance),
  literal(PredictFeedBannerPosition.AfterFeaturedCarousel),
  literal(PredictFeedBannerPosition.BeforePortfolio),
  literal(PredictFeedBannerPosition.AfterPortfolio),
  literal(PredictFeedBannerPosition.AfterLiveNow),
  literal(PredictFeedBannerPosition.AfterCategories),
  literal(PredictFeedBannerPosition.AfterPopularToday),
  literal(PredictFeedBannerPosition.AfterTrending),
]);

const PredictFeedBannerSeveritySchema = union([
  literal(PredictFeedBannerSeverity.Neutral),
  literal(PredictFeedBannerSeverity.Info),
  literal(PredictFeedBannerSeverity.Success),
  literal(PredictFeedBannerSeverity.Warning),
  literal(PredictFeedBannerSeverity.Danger),
]);

export const PredictFeedBannerSchema = defaulted(
  type({
    enabled: boolean(),
    minimumVersion: string(),
    id: string(),
    title: string(),
    description: string(),
    position: PredictFeedBannerPositionSchema,
    severity: PredictFeedBannerSeveritySchema,
    dismissible: boolean(),
  }),
  () => DEFAULT_PREDICT_FEED_BANNER_FLAG,
);

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
  order: optional(enums(PREDICT_MARKET_LIST_ORDERS)),
  startTimeMinMinutesAgo: optional(union([number(), literal(null)])),
  filterByVolume: optional(number()),
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
