import { useState, useCallback } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import { syncInternalAccountsWithUserStorage as syncInternalAccountsWithUserStorageAction } from '../../../actions/identity';

/**
 * Custom hook to dispatch account syncing.
 *
 * @returns An object containing the `dispatchAccountSyncing` function, and error state.
 */
export const useAccountSyncing = () => {
  const [error, setError] = useState<string>();

  const dispatchAccountSyncing = useCallback(async () => {
    setError(undefined);
    try {
      const errorMessage = await syncInternalAccountsWithUserStorageAction();
      if (errorMessage) {
        setError(getErrorMessage(errorMessage));
        return errorMessage;
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      setError(errorMessage);
      return errorMessage;
    }
  }, []);

  return {
    dispatchAccountSyncing,
    error,
  };
};
