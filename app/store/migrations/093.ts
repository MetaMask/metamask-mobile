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
 * Migration 093: Move EXISTING_USER flag from MMKV to Redux state
 * This unifies user state management and fixes iCloud backup inconsistencies
 *
 * IMPORTANT: After iCloud restore, we should default to existingUser: false
 * because keychain credentials are not backed up, even if MMKV data is restored
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 93)) {
    return state;
  }

  const newState = cloneDeep(state) as ValidStateWithUser;

  try {
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);
    const existingUserValue = existingUser === 'true';

    if (!isObject(newState.user)) {
      const error = new Error(
        `Migration 93: User state is missing or invalid. Expected object, got: ${typeof newState.user}`,
      );
      captureException(error);

      newState.user = {
        ...userInitialState,
        existingUser: existingUserValue,
      };
    } else {
      newState.user.existingUser = existingUserValue;
    }
  } catch (error) {
    captureException(error as Error);

    if (!isObject(newState.user)) {
      newState.user = {
        ...userInitialState,
        existingUser: false, // Default to false only if we can't read from MMKV
      };
    } else {
      newState.user.existingUser = false;
    }
  }

  return newState;
};

export default migration;
