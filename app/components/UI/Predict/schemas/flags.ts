import {
  array,
  boolean,
  defaulted,
  number,
  object,
  optional,
  string,
} from '@metamask/superstruct';
import { HexSchema } from './common';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_PREDICT_WORLD_CUP_FLAG,
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

export const PredictWorldCupSchema = defaulted(
  object({
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
    seriesId: defaulted(
      string(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.seriesId,
    ),
    tagSlug: defaulted(string(), () => DEFAULT_PREDICT_WORLD_CUP_FLAG.tagSlug),
    gamesTagId: defaulted(
      string(),
      () => DEFAULT_PREDICT_WORLD_CUP_FLAG.gamesTagId,
    ),
    bannerImageUrl: optional(string()),
    stages: defaulted(array(PredictWorldCupStageSchema), () => []),
  }),
  () => DEFAULT_PREDICT_WORLD_CUP_FLAG,
);
