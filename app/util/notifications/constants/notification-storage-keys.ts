import {
  HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS,
  PUSH_PRE_PROMPT_SHOWN,
  RESUBSCRIBE_NOTIFICATIONS_EXPIRY,
  TRUE,
} from '../../../constants/storage';
import Engine from '../../../core/Engine';
import storageWrapper from '../../../store/storage-wrapper';
import Logger from '../../Logger';

const PUSH_PRE_PROMPT_USER_STORAGE_PATH =
  'notifications.pushPrePromptShown' as const;

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Used to track when/how often we should re-subscribe users to notifications.
 * It ensures that users notification subscriptions are kept up to date (in case our backend adds new support for certian notifications)
 * And ensures that any push notification subscriptions are up-to-date
 */
const EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
export const hasNotificationSubscriptionExpired = async () => {
  const expiryTimestamp: string | undefined = await storageWrapper.getItem(
    RESUBSCRIBE_NOTIFICATIONS_EXPIRY,
  );
  if (!expiryTimestamp) {
    return true;
  }
  const now = Date.now();
  return now > parseInt(expiryTimestamp, 10);
};
export const updateNotificationSubscriptionExpiration = async () => {
  const now = Date.now();
  const expiryTimestamp = now + EXPIRY_DURATION_MS;
  await storageWrapper.setItem(
    RESUBSCRIBE_NOTIFICATIONS_EXPIRY,
    expiryTimestamp.toString(),
  );
};

/**
 * Tracks if a user has turned off notifications before
 * It ensures that we don't accidentally turn on notifications during our auto-enable notification effects (enable notifications by default)
 */
export const hasUserTurnedOffNotificationsOnce = async () => {
  const hasTurnedOffOnce: string | null = await storageWrapper.getItem(
    HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS,
  );
  return hasTurnedOffOnce === 'true';
};

export const setUserHasTurnedOffNotificationsOnce = async () => {
  await storageWrapper.setItem(HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS, 'true');
};

const getPushPrePromptShownFromUserStorage = async () => {
  try {
    return (
      (await Engine.context.UserStorageController.performGetStorage(
        PUSH_PRE_PROMPT_USER_STORAGE_PATH,
      )) === TRUE
    );
  } catch (error) {
    Logger.error(
      toError(error),
      'Failed to read push pre-prompt shown state from user storage',
    );
    return false;
  }
};

const setPushPrePromptShownInUserStorage = async (shown: boolean) => {
  try {
    await Engine.context.UserStorageController.performSetStorage(
      PUSH_PRE_PROMPT_USER_STORAGE_PATH,
      shown ? TRUE : 'false',
    );
  } catch (error) {
    Logger.error(
      toError(error),
      'Failed to persist push pre-prompt shown state to user storage',
    );
  }
};

/**
 * Tracks whether this user has ever seen the push pre-prompt flow.
 * User storage carries the flag across installs when available; local storage
 * is the fallback/cache for the current install.
 */
export const hasPushPrePromptBeenShown = async () => {
  const localShown = await storageWrapper.getItem(PUSH_PRE_PROMPT_SHOWN);
  if (localShown === TRUE) {
    await setPushPrePromptShownInUserStorage(true);
    return true;
  }

  const userStorageShown = await getPushPrePromptShownFromUserStorage();
  if (userStorageShown) {
    await storageWrapper.setItem(PUSH_PRE_PROMPT_SHOWN, TRUE);
  }

  return userStorageShown;
};

export const setPushPrePromptShown = async () => {
  await storageWrapper.setItem(PUSH_PRE_PROMPT_SHOWN, TRUE);
  await setPushPrePromptShownInUserStorage(true);
};

export const resetPushPrePromptShown = async () => {
  await storageWrapper.removeItem(PUSH_PRE_PROMPT_SHOWN);
  await setPushPrePromptShownInUserStorage(false);
};
