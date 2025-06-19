import { EXISTING_USER } from '../../constants/storage';
import { ensureValidState, ValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import { cloneDeep } from 'lodash';
import { isObject } from '@metamask/utils';

// Import the user initial state
import { userInitialState } from '../../reducers/user';

// Extend ValidState to include the user state
interface ValidStateWithUser extends ValidState {
  user?: {
    existingUser?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Migration 86: Move EXISTING_USER flag from MMKV to Redux state
 * This unifies user state management and fixes iCloud backup inconsistencies
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 85)) {
    return state;
  }

  const newState = cloneDeep(state) as ValidStateWithUser;

  try {
    // Get existing user value from MMKV
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);

    // Check if user state exists and is valid
    if (!isObject(newState.user)) {
      // This indicates a serious bug - user state should always exist
      const error = new Error(
        `Migration 86: User state is missing or invalid. Expected object, got: ${typeof newState.user}`,
      );
      captureException(error);

      // Initialize with full userInitialState and continue migration
      newState.user = {
        ...userInitialState,
        existingUser: false, // Default to false for safety
      };
    } else {
      // Set in Redux state based on the value found
      newState.user.existingUser = existingUser === 'true';
    }

    // Clear from MMKV
    if (existingUser !== null) {
      try {
        await StorageWrapper.removeItem(EXISTING_USER);
      } catch (removeError) {
        // If removeItem fails, capture the error but don't change the existingUser value
        // since we successfully retrieved it from MMKV
        captureException(removeError as Error);
      }
    }
  } catch (error) {
    captureException(error as Error);

    // If user state is missing, initialize with full userInitialState
    if (!isObject(newState.user)) {
      newState.user = {
        ...userInitialState,
        existingUser: false, // Default to false for safety
      };
    } else {
      // If user state exists but migration failed, default existingUser to false
      newState.user.existingUser = false;
    }
  }

  return newState;
};

export default migration;
