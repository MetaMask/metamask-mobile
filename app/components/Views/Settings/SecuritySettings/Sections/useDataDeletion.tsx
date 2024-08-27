import { useCallback, useState } from 'react';
import { DataDeleteStatus } from '../../../../../core/Analytics';
import { DataDeleteDate } from '../../../../../core/Analytics/MetaMetrics.types';

/**
 * Hook to handle data deletion setting state
 * and determine if the deletion button should be enabled
 * and what text should be displayed
 * including the date of the last deletion request
 *
 * @see associated tests for more details on the different cases
 */
const useDataDeletion = () => {
  /** dataDeletionTaskStatus is used to determine the satus of the last deletion task.
   * if none, status is `DataDeleteStatus.unknown`
   */
  const [dataDeletionTaskStatus, setDataDeletionTaskStatus] =
    useState<DataDeleteStatus>(DataDeleteStatus.unknown);

  /** dataTrackedSinceLastDeletion is used to determine if metametrics has collected data since the last deletion request.
   */
  const [dataTrackedSinceLastDeletion, setDataTrackedSinceLastDeletion] =
    useState(false);

  /** deletionTaskDate is used to determine the date of the latest metametrics data deletion request.
   */
  const [deletionTaskDate, setDeletionTaskDate] = useState<DataDeleteDate>();

  /**
   * determines if data deletion action should be made available to the user
   */
  const isDataDeletionAvailable = useCallback(() => {
    /**
     * noDeletionStatusesWhenUntracked lists the deletion statuses that should prevent
     * the user from requesting a new deletion if the user has not been tracked
     * since the last deletion request
     */
    const noDeletionStatusesWhenUntracked = [
      DataDeleteStatus.initialized,
      DataDeleteStatus.running,
      DataDeleteStatus.finished,
    ].includes(dataDeletionTaskStatus);
    return !(!dataTrackedSinceLastDeletion && noDeletionStatusesWhenUntracked);
  }, [dataDeletionTaskStatus, dataTrackedSinceLastDeletion]);

  return {
    isDataDeletionAvailable,
    deletionTaskDate,
    setDataDeletionTaskStatus,
    setDeletionTaskDate,
    setDataTrackedSinceLastDeletion,
  };
};

export default useDataDeletion;
