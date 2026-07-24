import {
  array,
  boolean,
  defaulted,
  number,
  object,
  string,
  type,
} from '@metamask/superstruct';
import { HexSchema } from './common';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
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
