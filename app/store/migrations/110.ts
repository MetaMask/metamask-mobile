import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import StorageWrapper from '../storage-wrapper';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import {
  AGREED,
  DENIED,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  MIXPANEL_METAMETRICS_ID,
  ANALYTICS_ID,
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
 * Migration 110: Migrate legacy analytics storage values
 *
 * This migration:
 * - Reads legacy storage values (METAMETRICS_ID, MIXPANEL_METAMETRICS_ID, METRICS_OPT_IN)
 * - Migrates analytics ID to new MMKV key (ANALYTICS_ID) - not stored in state to prevent corruption
 * - Migrates opt-in preference to AnalyticsController state (optedIn)
 * - Validates UUIDv4 format for analytics ID
 * - Deletes MIXPANEL_METAMETRICS_ID (already deprecated, MetaMetrics no longer uses it)
 * - Keeps METAMETRICS_ID intact (MetaMetrics still relies on it)
 * - Keeps METRICS_OPT_IN intact (may still be used for backward compatibility)
 * - METAMETRICS_ID will be cleaned up in a future migration after MetaMetrics is fully deprecated
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 110)) {
    return state;
  }

  const { backgroundState } = state.engine;

  // Read legacy storage values
  let legacyMetametricsId: string | null = null;
  let legacyMetricsOptIn: string | null = null;

  try {
    legacyMetametricsId =
      (await StorageWrapper.getItem(METAMETRICS_ID)) ||
      (await StorageWrapper.getItem(MIXPANEL_METAMETRICS_ID));
    legacyMetricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
  } catch (error) {
    // If we can't read storage, skip migration - defaults will be used
    captureException(
      new Error(
        `Migration 110: Failed to read legacy storage values: ${error}`,
      ),
    );
    return state;
  }

  try {
    // Migrate analytics ID to new key
    // analyticsId is not stored in state to prevent corruption risk
    if (isValidUUIDv4(legacyMetametricsId)) {
      const existingId = await StorageWrapper.getItem(ANALYTICS_ID);
      if (!existingId) {
        // Only write if new key doesn't exist (don't overwrite)
        await StorageWrapper.setItem(ANALYTICS_ID, legacyMetametricsId, {
          emitEvent: false,
        });
      }
    }

    // Migrate opt-in to AnalyticsController state
    if (legacyMetricsOptIn === AGREED || legacyMetricsOptIn === DENIED) {
      // Ensure AnalyticsController exists in backgroundState
      if (
        !hasProperty(backgroundState, 'AnalyticsController') ||
        !isObject(backgroundState.AnalyticsController)
      ) {
        backgroundState.AnalyticsController = {};
      }

      const analyticsControllerState =
        backgroundState.AnalyticsController as Record<string, unknown>;

      // Only set optedIn if it doesn't already exist (don't overwrite existing state)
      if (!hasProperty(analyticsControllerState, 'optedIn')) {
        analyticsControllerState.optedIn = legacyMetricsOptIn === AGREED;
      }
    }

    // Delete MIXPANEL_METAMETRICS_ID - it's already deprecated and MetaMetrics no longer uses it
    // (MetaMetrics migrates it to METAMETRICS_ID when it reads it, but we've already migrated to ANALYTICS_ID)
    try {
      await StorageWrapper.removeItem(MIXPANEL_METAMETRICS_ID);
    } catch (error) {
      // Non-critical - log but don't fail migration
      captureException(
        new Error(
          `Migration 110: Failed to delete MIXPANEL_METAMETRICS_ID: ${error}`,
        ),
      );
    }

    // NOTE: METAMETRICS_ID is kept intact because MetaMetrics still relies on it.
    // METRICS_OPT_IN is also kept for backward compatibility.
    // These will be cleaned up in a future migration after MetaMetrics is fully deprecated.
  } catch (error) {
    // Migration failures should not break the app
    // Log error but continue - defaults will be used
    captureException(
      new Error(
        `Migration 110: Failed to migrate legacy analytics storage: ${error}`,
      ),
    );
  }

  return state;
};

export default migration;
