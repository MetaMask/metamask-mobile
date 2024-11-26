import { useState, useCallback } from 'react';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  syncInternalAccountsWithUserStorage as syncInternalAccountsWithUserStorageAction,
  setIsAccountSyncingReadyToBeDispatched as setIsAccountSyncingReadyToBeDispatchedAction,
} from '../../../actions/notification/helpers';

/**
 * Custom hook to dispatch account syncing.
 *
 * @returns An object containing the `dispatchAccountSyncing` function, and error state.
 */
export const useDispatchAccountSyncing = () => {
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

/**
 * Custom hook to set the state value of isAccountSyncingReadyToBeDispatched
 *
 * @returns An object containing the `setIsAccountSyncingReadyToBeDispatched` function, and error state.
 */
export const useSetIsAccountSyncingReadyToBeDispatched = () => {
  const [error, setError] = useState<string>();

  const setIsAccountSyncingReadyToBeDispatched = useCallback(
    async (isReady: boolean) => {
      setError(undefined);
      try {
        const errorMessage = await setIsAccountSyncingReadyToBeDispatchedAction(
          isReady,
        );
        if (errorMessage) {
          setError(getErrorMessage(errorMessage));
          return errorMessage;
        }
      } catch (e) {
        const errorMessage = getErrorMessage(e);
        setError(errorMessage);
        return errorMessage;
      }
    },
    [],
  );

  return {
    setIsAccountSyncingReadyToBeDispatched,
    error,
  };
};
