import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import {
  BRAZE_PUSH_DESIRED_STATE,
  BRAZE_PUSH_UNREGISTRATION_PENDING,
  LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
} from '../../constants/storage';
import StorageWrapper from '../storage-wrapper';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';

export const migrationVersion = 153;

async function setBackfillValue(
  key: string,
  value: string,
  name: string,
): Promise<boolean> {
  try {
    await StorageWrapper.setItem(key, value);
    Logger.log(`[Braze] Migration 153 persisted ${name}`);
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
  const failedValues: string[] = [];

  if (notificationsEnabled || hasMarketingConsent) {
    if (
      !(await setBackfillValue(
        LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
        'true',
        'legacy notification AUS backfill',
      ))
    ) {
      failedValues.push('legacy notification AUS backfill');
    }
  }

  if (!notificationsEnabled || !pushEnabled) {
    if (
      !(await setBackfillValue(
        BRAZE_PUSH_UNREGISTRATION_PENDING,
        'true',
        'Braze push unregistration',
      ))
    ) {
      failedValues.push('Braze push unregistration');
    }
  }

  const desiredBrazePushState =
    notificationsEnabled && pushEnabled ? 'registered' : 'unregistered';
  if (
    !(await setBackfillValue(
      BRAZE_PUSH_DESIRED_STATE,
      desiredBrazePushState,
      'Braze push desired state',
    ))
  ) {
    failedValues.push('Braze push desired state');
  }

  if (failedValues.length > 0) {
    throw new Error(
      `Migration ${migrationVersion}: Failed to persist backfill value(s): ${failedValues.join(
        ', ',
      )}`,
    );
  }

  return state;
};

export default migration;
