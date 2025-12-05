import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import {
  AGREED,
  DENIED,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
  ANALYTICS_ID,
  ANALYTICS_OPTED_IN,
} from '../../constants/storage';

/**
 * Validates if a string is a valid UUIDv4
 */
const isValidUUIDv4 = (id: string | null): id is string => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return uuidValidate(id) && uuidVersion(id) === 4;
};

/**
 * Migration 109: Migrate legacy analytics MMKV storage values to new MMKV keys
 *
 * This migration:
 * - Reads legacy storage values (METAMETRICS_ID, METRICS_OPT_IN)
 * - Writes them to new MMKV keys (ANALYTICS_ID, ANALYTICS_OPTED_IN)
 * - Validates UUIDv4 format for analytics ID
 * - Does NOT modify controller state (no state changes)
 * - Cleans up legacy storage keys after successful migration
 *
 * The controller will read from MMKV on initialization via generateDefaults().
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 109)) {
    return state;
  }

  // Read legacy storage values
  let legacyMetametricsId: string | null = null;
  let legacyMetricsOptIn: string | null = null;

  try {
    legacyMetametricsId =
      (await StorageWrapper.getItem(METAMETRICS_ID)) ||
      (await StorageWrapper.getItem(MIXPANEL_METAMETRICS_ID));
    legacyMetricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
  } catch (error) {
    // If we can't read storage, skip migration - generateDefaults() will handle defaults
    captureException(
      new Error(
        `Migration 109: Failed to read legacy storage values: ${error}`,
      ),
    );
    return state;
  }

  try {
    // Migrate analytics ID to new MMKV key via StorageWrapper
    if (isValidUUIDv4(legacyMetametricsId)) {
      const existingId = await StorageWrapper.getItem(ANALYTICS_ID);
      if (!existingId) {
        // Only write if new key doesn't exist (don't overwrite)
        await StorageWrapper.setItem(ANALYTICS_ID, legacyMetametricsId, {
          emitEvent: false,
        });
      }
    }

    // Migrate opt-in to new MMKV key via StorageWrapper
    if (legacyMetricsOptIn === AGREED || legacyMetricsOptIn === DENIED) {
      const existingOptedIn = await StorageWrapper.getItem(ANALYTICS_OPTED_IN);
      if (existingOptedIn === null || existingOptedIn === undefined) {
        // Only write if new key doesn't exist
        await StorageWrapper.setItem(
          ANALYTICS_OPTED_IN,
          legacyMetricsOptIn === AGREED ? 'true' : 'false',
          { emitEvent: false },
        );
      }
    }

    // Clean up legacy storage keys after successful migration
    // Use Promise.allSettled to ensure all cleanup attempts complete even if some fail
    await Promise.allSettled([
      StorageWrapper.removeItem(METAMETRICS_ID),
      StorageWrapper.removeItem(MIXPANEL_METAMETRICS_ID),
      StorageWrapper.removeItem(METRICS_OPT_IN),
    ]);
  } catch (error) {
    // Migration failures should not break the app
    // Log error but continue - generateDefaults() will handle defaults
    captureException(
      new Error(
        `Migration 109: Failed to migrate legacy analytics storage to MMKV: ${error}`,
      ),
    );
  }

  // Return state unchanged (no state migration)
  return state;
};

export default migration;
