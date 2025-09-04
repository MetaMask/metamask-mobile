import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import StorageWrapper from '../storage-wrapper';

/**
 * Migration: Remove SOLANA_FEATURE_MODAL_SHOWN from Storage
 */
const migration = async (state: unknown): Promise<unknown> => {
  const migrationVersion = 98;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    await StorageWrapper.removeItem('SOLANA_FEATURE_MODAL_SHOWN');
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to remove SOLANA_FEATURE_MODAL_SHOWN from Storage. Error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
