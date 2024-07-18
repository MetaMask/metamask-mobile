import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { UseCreateSessionReturn } from './types';
import { getErrorMessage } from '../../../util/errorHandling';

import {
  selectIsProfileSyncingEnabled,
  selectIsSignedIn,
} from '../../../selectors/pushNotifications';
import {
  disableProfileSyncing,
  signIn,
} from '../../../actions/notification/pushNotifications';

/**
 * Custom hook to manage the creation of a session based on the user's authentication status,
 * profile syncing preference, and participation in MetaMetrics.
 *
 * This hook encapsulates the logic for initiating a sign-in process if the user is not already signed in
 * and either profile syncing or MetaMetrics participation is enabled. It handles loading state and errors
 * during the sign-in process.
 *
 * @returns An object containing:
 * - `createSession`: A function to initiate the session creation process.
 * - `error`: The error message, if any.
 */
function useCreateSession(): UseCreateSessionReturn {
  const isSignedIn = useSelector(selectIsSignedIn);
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const createSession = useCallback(async () => {
    // If the user is already signed in, no need to create a new session
    if (isSignedIn) {
      return;
    }

    // If profile syncing and MetaMetrics participation are disabled, no need to create a session
    if (!isProfileSyncingEnabled) {
      return;
    }

    // Perform sign-in process if profile syncing or MetaMetrics participation is enabled
    if (isProfileSyncingEnabled) {
      setLoading(true);
      setError(undefined);
      try {
        const errorMessage = await signIn();
        if (errorMessage) {
          throw new Error(errorMessage);
        }
      } catch (e) {
        await disableProfileSyncing();
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }
  }, [isSignedIn, isProfileSyncingEnabled]);

  return {
    createSession,
    loading,
    error,
  };
}

export default useCreateSession;
