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

export type {
  DataDeleteDate,
  DataDeleteRegulationId,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
  IDeleteRegulationStatusResponse,
} from '../../util/analytics/analyticsDataDeletion.types';
export {
  DataDeleteResponseStatus,
  DataDeleteStatus,
} from '../../util/analytics/analyticsDataDeletion.types';

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
