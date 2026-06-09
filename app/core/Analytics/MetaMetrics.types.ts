export type {
  JsonValue,
  JsonMap,
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../util/analytics/analytics.types';
export {
  isTrackingEvent,
  MetaMetricsRequestedThrough,
} from '../../util/analytics/analytics.types';

/**
 * Deletion task possible status.
 * @see https://docs.segmentapis.com/tag/Deletion-and-Suppression#operation/getRegulation
 */
export enum DataDeleteStatus {
  failed = 'FAILED',
  finished = 'FINISHED',
  initialized = 'INITIALIZED',
  invalid = 'INVALID',
  notSupported = 'NOT_SUPPORTED',
  partialSuccess = 'PARTIAL_SUCCESS',
  running = 'RUNNING',
  unknown = 'UNKNOWN',
}

/**
 * Deletion task possible response status.
 */
export enum DataDeleteResponseStatus {
  ok = 'ok',
  error = 'error',
}

export interface IDeleteRegulationResponse {
  status: DataDeleteResponseStatus;
  error?: string;
}

export interface IDeleteRegulationStatusResponse {
  status: DataDeleteResponseStatus;
  dataDeleteStatus: DataDeleteStatus;
}

export type DataDeleteDate = string | undefined;
export type DataDeleteRegulationId = string | undefined;

export interface IDeleteRegulationStatus {
  deletionRequestDate?: DataDeleteDate;
  dataDeletionRequestStatus: DataDeleteStatus;
}

/**
 * Monetized primitives associated with a transaction.
 * Only propagated when the transaction involves a monetized primitive.
 * Includes MoneyAccount which is absent from the analytics.types version.
 */
export enum MonetizedPrimitive {
  Swaps = 'swaps',
  Perps = 'perps',
  Ramps = 'ramps',
  Predict = 'predict',
  MmPay = 'mm_pay',
  MoneyAccount = 'money_account',
}
