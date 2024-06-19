import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectIsSignedIn,
  selectIsProfileSyncingEnabled,
} from '../../../selectors/pushNotifications';
import { UseCreateSessionReturn } from './types';
import { getErrorMessage } from '../../../util/errorHandling';
import {
  disableProfileSyncingRequest,
  performSignInRequest,
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
 */
function useCreateSession(): UseCreateSessionReturn {
  const dispatch = useDispatch();
  const isSignedIn = useSelector(selectIsSignedIn);
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);

  const [error, setError] = useState<string>();

  const createSession = useCallback(() => {
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
      try {
        dispatch(performSignInRequest());
      } catch (e) {
        // If an error occurs during the sign-in process, disable profile syncing
        dispatch(disableProfileSyncingRequest());
        setError(getErrorMessage(e));
        throw e;
      }
    }
  }, [dispatch, isSignedIn, isProfileSyncingEnabled]);

  return {
    createSession,
    error,
  };
}

export default useCreateSession;
