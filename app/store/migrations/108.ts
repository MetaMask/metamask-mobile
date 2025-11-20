import { ensureValidState, ValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import { cloneDeep } from 'lodash';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import {
  AGREED,
  DENIED,
  METAMETRICS_ID,
  METRICS_OPT_IN,
  METRICS_OPT_IN_SOCIAL_LOGIN,
  MIXPANEL_METAMETRICS_ID,
} from '../../constants/storage';

interface ValidStateWithAnalytics extends ValidState {
  engine: {
    backgroundState: {
      AnalyticsController?: {
        analyticsId?: string;
        optedInForRegularAccount?: boolean;
        optedInForSocialAccount?: boolean;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
}

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
 * Migration 108: Migrate legacy analytics storage values to AnalyticsController persisted state
 *
 * This migration:
 * - Reads legacy storage values (METAMETRICS_ID, METRICS_OPT_IN, METRICS_OPT_IN_SOCIAL_LOGIN)
 * - Converts them to AnalyticsController state format
 * - Validates UUIDv4 format for analytics ID
 * - Sets state.engine.backgroundState.AnalyticsController with migrated data
 * - Cleans up legacy storage keys after successful migration
 *
 * The controller will load this state on initialization, making the migration transparent.
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, 108)) {
    return state;
  }

  // Skip migration if AnalyticsController state already exists (already migrated or fresh install)
  // Check before cloning to avoid unnecessary work
  const validState = state as ValidStateWithAnalytics;
  if (validState.engine.backgroundState.AnalyticsController) {
    return state;
  }

  // Read legacy storage values asynchronously before cloning
  // (we need to check if there's anything to migrate)
  let legacyMetametricsId: string | null = null;
  let legacyMetricsOptIn: string | null = null;
  let legacySocialLoginOptIn: string | null = null;

  try {
    legacyMetametricsId =
      (await StorageWrapper.getItem(METAMETRICS_ID)) ||
      (await StorageWrapper.getItem(MIXPANEL_METAMETRICS_ID));
    legacyMetricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
    legacySocialLoginOptIn = await StorageWrapper.getItem(
      METRICS_OPT_IN_SOCIAL_LOGIN,
    );
  } catch (error) {
    // If we can't read storage, skip migration - controller will use defaults
    captureException(
      new Error(
        `Migration 108: Failed to read legacy storage values: ${error}`,
      ),
    );
    return state;
  }

  // Check if we have a valid UUIDv4 ID to migrate

  if (!isValidUUIDv4(legacyMetametricsId)) {
    return state;
  }

  // Now, clone the state as we know we have to migrate
  const newState = cloneDeep(state) as ValidStateWithAnalytics;

  try {
    // Build AnalyticsController state from legacy values
    const analyticsControllerState: ValidStateWithAnalytics['engine']['backgroundState']['AnalyticsController'] =
      {};

    // Migrate analytics ID
    analyticsControllerState.analyticsId = legacyMetametricsId;

    // Migrate regular opt-in preference
    if (legacyMetricsOptIn === AGREED) {
      analyticsControllerState.optedInForRegularAccount = true;
    } else if (legacyMetricsOptIn === DENIED) {
      analyticsControllerState.optedInForRegularAccount = false;
    } else {
      analyticsControllerState.optedInForRegularAccount = false;
    }

    // Migrate social login opt-in preference
    if (legacySocialLoginOptIn === AGREED) {
      analyticsControllerState.optedInForSocialAccount = true;
    } else if (legacySocialLoginOptIn === DENIED) {
      analyticsControllerState.optedInForSocialAccount = false;
    } else {
      analyticsControllerState.optedInForSocialAccount = false;
    }

    // Set the migrated state
    newState.engine.backgroundState.AnalyticsController =
      analyticsControllerState;

    // Clean up legacy storage keys after successful migration
    // Use Promise.allSettled to ensure all cleanup attempts complete even if some fail
    // (removing non-existent keys may throw, but allSettled handles it gracefully)
    await Promise.allSettled([
      StorageWrapper.removeItem(METAMETRICS_ID),
      StorageWrapper.removeItem(MIXPANEL_METAMETRICS_ID),
      StorageWrapper.removeItem(METRICS_OPT_IN),
      StorageWrapper.removeItem(METRICS_OPT_IN_SOCIAL_LOGIN),
    ]);
  } catch (error) {
    // Migration failures should not break the app
    // Log error but continue - controller will initialize with defaults
    captureException(
      new Error(
        `Migration 108: Failed to migrate legacy analytics storage: ${error}`,
      ),
    );
  }

  return newState;
};

export default migration;
