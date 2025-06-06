import { EXISTING_USER, TRUE } from '../../constants/storage';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';

/**
 * Migration 80: Move EXISTING_USER flag from MMKV to FilesystemStorage
 * This ensures the user state is not backed up to iCloud
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 79)) {
    return state;
  }

  try {
    // Get existing user value from MMKV
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);

    // If value exists, store it in FilesystemStorage
    if (existingUser !== null) {
      await FilesystemStorage.setItem(
        EXISTING_USER,
        existingUser,
        Device.isIos(),
      );
      // Clear from MMKV
      await StorageWrapper.removeItem(EXISTING_USER);
    }
  } catch (error) {
    captureException(error as Error);
  }

  return state;
};

export default migration;
