import { EXISTING_USER } from '../../constants/storage';
import { ensureValidState, ValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import { cloneDeep } from 'lodash';
import { isObject } from '@metamask/utils';
import Logger from '../../util/Logger';

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
 * Migration 88: Move EXISTING_USER flag from MMKV to Redux state
 * This unifies user state management and fixes iCloud backup inconsistencies
 * 
 * IMPORTANT: After iCloud restore, we should default to existingUser: false
 * because keychain credentials are not backed up, even if MMKV data is restored
 */
const migration = async (state: unknown): Promise<unknown> => {
  Logger.debug('🔍 Migration 88', 'Starting migration');
  
  if (!ensureValidState(state, 88)) {
    Logger.debug('🔍 Migration 88', 'ensureValidState failed, returning unchanged state');
    return state;
  }

  const newState = cloneDeep(state) as ValidStateWithUser;

  try {
    // Get existing user value from MMKV
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);
    Logger.debug('🔍 Migration 88', 'EXISTING_USER from MMKV:', existingUser);

    // Check if user state exists and is valid
    if (!isObject(newState.user)) {
      Logger.debug('🔍 Migration 88', 'User state is missing or invalid:', typeof newState.user);
      // This indicates a serious bug - user state should always exist
      const error = new Error(
        `Migration 88: User state is missing or invalid. Expected object, got: ${typeof newState.user}`,
      );
      captureException(error);

      // Initialize with full userInitialState and continue migration
      newState.user = {
        ...userInitialState,
        existingUser: false, // Default to false for safety
      };
    } else {
      Logger.debug('🔍 Migration 88', 'Set in Redux state based on the value found');
      // Set in Redux state based on the value found
      newState.user.existingUser = existingUser === 'true';
    }

    Logger.debug('🔍 Migration 88', 'Final existingUser value:', newState.user.existingUser);

    // Clear from MMKV
    if (existingUser !== null) {
      try {
        await StorageWrapper.removeItem(EXISTING_USER);
        Logger.debug('🔍 Migration 88', 'Cleared EXISTING_USER from MMKV');
      } catch (removeError) {
        // If removeItem fails, capture the error but don't change the existingUser value
        // since we successfully retrieved it from MMKV
        Logger.debug('🔍 Migration 88', 'Failed to clear EXISTING_USER from MMKV:', removeError);
        captureException(removeError as Error);
      }
    } else {
      Logger.debug('🔍 Migration 88', 'No EXISTING_USER in MMKV to clear');
    }
  } catch (error) {
    Logger.debug('🔍 Migration 88', 'Error during migration:', error);
    captureException(error as Error);

    // If user state is missing, initialize with full userInitialState
    if (!isObject(newState.user)) {
      newState.user = {
        ...userInitialState,
        existingUser: false, // Default to false for safety
      };
      Logger.debug('🔍 Migration 88', 'Error recovery - initialized user state with existingUser: false');
    } else {
      // If user state exists but migration failed, default existingUser to false
      newState.user.existingUser = false;
      Logger.debug('🔍 Migration 88', 'Error recovery - set existingUser: false');
    }
  }

  Logger.debug('🔍 Migration 88', 'Migration completed, final state:', newState.user);
  return newState;
};

export default migration;
