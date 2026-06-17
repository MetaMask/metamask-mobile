import { useMemo } from 'react';
import type { UseAnalyticsDataDeletionHook } from './useAnalyticsDataDeletion.types';
import {
  createDataDeletionTask,
  checkDataDeleteStatus,
  getDeleteRegulationCreationDate,
  getDeleteRegulationId,
  isDataRecorded,
  updateDataRecordingFlag,
} from '../../../util/analytics/analyticsDataDeletion';

/**
 * Hook that exposes analytics data deletion API (Segment Regulations + storage).
 * Returns a stable object that proxies to the analyticsDataDeletion util.
 */
export function useAnalyticsDataDeletion(): UseAnalyticsDataDeletionHook {
  return useMemo<UseAnalyticsDataDeletionHook>(
    () => ({
      createDataDeletionTask,
      checkDataDeleteStatus,
      getDeleteRegulationCreationDate,
      getDeleteRegulationId,
      isDataRecorded,
      updateDataRecordingFlag,
    }),
    [],
  );
}
