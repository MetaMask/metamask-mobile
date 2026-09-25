import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { BRAZE_PUSH_REGISTRATION_STATE } from '../../constants/storage';
import StorageWrapper from '../storage-wrapper';
import { ensureValidState } from './util';

export const migrationVersion = 153;

async function setBackfillValue(
  key: string,
  value: string,
  name: string,
): Promise<boolean> {
  try {
    await StorageWrapper.setItem(key, value);
    return true;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to persist ${name}: ${String(
          error,
        )}`,
      ),
    );
    return false;
  }
}

/**
 * Migration 153: schedule Braze push unregistration for pre-fix installs.
 *
 * Devices that disabled notifications before unregisterPush existed have no
 * stored registration state. Those devices are scheduled once. An existing
 * `unregistered` or `unregistration-pending` value is left unchanged so a
 * completed or in-progress unregistration is not repeated.
 */
const migration = async (state: unknown): Promise<unknown> => {
  // A bad persisted store must not be treated as "notifications off" and
  // scheduled for unregistration.
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  // This key did not exist before unregisterPush. A value here means a later
  // build already recorded the device, so this upgrade must not call
  // unregisterPush again. Repeating it is what hits the iOS rate limit.
  const storedRegistrationState = StorageWrapper.getItemSync(
    BRAZE_PUSH_REGISTRATION_STATE,
  );
  if (
    storedRegistrationState === 'unregistered' ||
    storedRegistrationState === 'unregistration-pending'
  ) {
    return state;
  }

  // Allow notifications is the master switch. Device push is the second one.
  // Either one off means this device should not stay registered with Braze.
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
  const notificationsEnabled =
    notificationServicesState?.isNotificationServicesEnabled === true;
  const pushEnabled = pushServicesState?.isPushEnabled === true;
  const failedValues: string[] = [];

  // Both switches on: remember that registration is still wanted. The launch
  // path does not unregister a `registered` device.
  // No stored state and a switch off: the pre-fix install. Mark it pending so
  // the next launch calls unregisterPush once.
  // Any other stored value, such as `registered` while a switch is now off:
  // leave it. Only a missing key is the pre-fix cohort.
  const brazePushRegistrationState =
    notificationsEnabled && pushEnabled
      ? 'registered'
      : storedRegistrationState == null
        ? 'unregistration-pending'
        : null;
  if (
    brazePushRegistrationState !== null &&
    !(await setBackfillValue(
      BRAZE_PUSH_REGISTRATION_STATE,
      brazePushRegistrationState,
      'Braze push registration state',
    ))
  ) {
    failedValues.push('Braze push registration state');
  }

  // Throwing keeps redux-persist from saving version 153, so the next launch
  // tries this write again instead of dropping the device.
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
