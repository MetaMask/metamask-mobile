import type {
  DataDeleteDate,
  DataDeleteRegulationId,
  IDeleteRegulationResponse,
  IDeleteRegulationStatus,
} from '../../../core/Analytics/MetaMetrics.types';

/**
 * Return type of useAnalyticsDataDeletion hook.
 * Proxies the four analytics data deletion util functions.
 */
export interface UseAnalyticsDataDeletionHook {
  createDataDeletionTask(): Promise<IDeleteRegulationResponse>;
  checkDataDeleteStatus(): Promise<IDeleteRegulationStatus>;
  getDeleteRegulationCreationDate(): DataDeleteDate;
  getDeleteRegulationId(): DataDeleteRegulationId;
}
