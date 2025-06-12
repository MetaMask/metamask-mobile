import { EXISTING_USER } from '../../constants/storage';
import { ensureValidState, ValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import { cloneDeep } from 'lodash';
import { isObject } from '@metamask/utils';

// Extend ValidState to include the user state
interface ValidStateWithUser extends ValidState {
  user?: {
    existingUser?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Migration 83: Move EXISTING_USER flag from MMKV to Redux state
 * This unifies user state management and fixes iCloud backup inconsistencies
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 79)) {
    return state;
  }

  const newState = cloneDeep(state) as ValidStateWithUser;

  try {
    // Get existing user value from MMKV
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);

    // Ensure user state exists
    if (!isObject(newState.user)) {
      newState.user = {};
    }
    
    // Set in Redux state based on the value found
    newState.user.existingUser = existingUser === 'true';

    // Clear from MMKV
    if (existingUser !== null) {
      await StorageWrapper.removeItem(EXISTING_USER);
    }
  } catch (error) {
    captureException(error as Error);
    // If we can't migrate the data, default to false for safety
    if (!isObject(newState.user)) {
      newState.user = {};
    }
    newState.user.existingUser = false;
  }

  return newState;
};

export default migration;
