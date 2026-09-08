import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import {
  BRAZE_PUSH_UNREGISTRATION_PENDING,
  LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
} from '../../constants/storage';
import StorageWrapper from '../storage-wrapper';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';

export const migrationVersion = 153;

async function setBackfillMarker(key: string, name: string): Promise<boolean> {
  try {
    await StorageWrapper.setItem(key, 'true');
    Logger.log(`[Braze] Migration 153 marked ${name} as pending`);
    return true;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to mark ${name} as pending: ${String(
          error,
        )}`,
      ),
    );
    return false;
  }
}

/**
 * Migration 153: schedule independent notification consent backfills.
 *
 * Existing users with MetaMask notifications or marketing consent enabled are
 * checked for missing AUS preferences after login. Devices without both
 * notification switches enabled are scheduled for Braze push unregistration
 * on the next launch.
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const { backgroundState } = state.engine;
  const notificationServicesState =
    hasProperty(backgroundState, 'NotificationServicesController') &&
    isObject(backgroundState.NotificationServicesController)
      ? backgroundState.NotificationServicesController
      : undefined;
  const pushServicesState =
    hasProperty(backgroundState, 'NotificationServicesPushController') &&
    isObject(backgroundState.NotificationServicesPushController)
      ? backgroundState.NotificationServicesPushController
      : undefined;
  const securityState =
    hasProperty(state, 'security') && isObject(state.security)
      ? state.security
      : undefined;
  const notificationsEnabled =
    notificationServicesState?.isNotificationServicesEnabled === true;
  const pushEnabled = pushServicesState?.isPushEnabled === true;
  const hasMarketingConsent =
    securityState?.dataCollectionForMarketing === true;
  const failedMarkers: string[] = [];

  if (notificationsEnabled || hasMarketingConsent) {
    if (
      !(await setBackfillMarker(
        LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
        'legacy notification AUS backfill',
      ))
    ) {
      failedMarkers.push('legacy notification AUS backfill');
    }
  }

  if (!notificationsEnabled || !pushEnabled) {
    if (
      !(await setBackfillMarker(
        BRAZE_PUSH_UNREGISTRATION_PENDING,
        'Braze push unregistration',
      ))
    ) {
      failedMarkers.push('Braze push unregistration');
    }
  }

  if (failedMarkers.length > 0) {
    throw new Error(
      `Migration ${migrationVersion}: Failed to persist pending marker(s): ${failedMarkers.join(
        ', ',
      )}`,
    );
  }

  return state;
};

export default migration;
