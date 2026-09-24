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
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const storedRegistrationState = StorageWrapper.getItemSync(
    BRAZE_PUSH_REGISTRATION_STATE,
  );
  if (
    storedRegistrationState === 'unregistered' ||
    storedRegistrationState === 'unregistration-pending'
  ) {
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
  const notificationsEnabled =
    notificationServicesState?.isNotificationServicesEnabled === true;
  const pushEnabled = pushServicesState?.isPushEnabled === true;
  const failedValues: string[] = [];

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
