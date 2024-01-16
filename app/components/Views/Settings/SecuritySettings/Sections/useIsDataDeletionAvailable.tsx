import { useCallback } from 'react';
import { DataDeleteStatus } from '../../../../../core/Analytics';

/**
 * Hook to determine if the deletion button should be enabled

 * @param dataDeletionTaskStatus - the status of the last deletion task as returned
 * by the MetaMetrics instance {@link checkDataDeleteStatus}
 * @param dataTrackedSinceLastDeletion - true if metametrics has collected data since the last deletion request.
 * to be set using MetaMetrics instance {@link isDataRecorded}
 * @see associated tests for more details on the different cases
 */
const useIsDataDeletionAvailable = (
  dataDeletionTaskStatus: DataDeleteStatus,
  dataTrackedSinceLastDeletion: boolean,
) => {
  const isDataDeletionAvailable = useCallback(() => {
    const inProgress = [
      DataDeleteStatus.initialized,
      DataDeleteStatus.running,
    ].includes(dataDeletionTaskStatus);
    return !(!dataTrackedSinceLastDeletion && inProgress);
  }, [dataDeletionTaskStatus, dataTrackedSinceLastDeletion]);

  return { isDataDeletionAvailable };
};

export default useIsDataDeletionAvailable;
