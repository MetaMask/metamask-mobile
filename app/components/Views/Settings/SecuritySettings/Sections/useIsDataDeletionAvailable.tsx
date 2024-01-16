import { useCallback } from 'react';
import { DataDeleteStatus } from '../../../../../core/Analytics';

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
