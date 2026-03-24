/**
 * Types for analytics data deletion (Segment regulation / GDPR-style flows).
 * Extracted from MetaMetrics.types.ts for use by app/util/analytics and useAnalytics.
 */

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
  hasCollectedDataSinceDeletionRequest: boolean;
  dataDeletionRequestStatus: DataDeleteStatus;
}
