import {
  HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS,
  PUSH_PRE_PROMPT_SHOWN,
  RESUBSCRIBE_NOTIFICATIONS_EXPIRY,
  TRUE,
} from '../../../constants/storage';
import storageWrapper from '../../../store/storage-wrapper';

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

/**
 * Tracks whether this user has ever seen the push pre-prompt flow.
 * The flag is intentionally local and shared by both pre-prompt variants so a
 * user sees at most one pre-prompt on this install.
 */
export const hasPushPrePromptBeenShown = () => {
  const localShown = storageWrapper.getItemSync(PUSH_PRE_PROMPT_SHOWN);
  return localShown === TRUE;
};

export const setPushPrePromptShown = async () => {
  await storageWrapper.setItem(PUSH_PRE_PROMPT_SHOWN, TRUE);
};

export const resetPushPrePromptShown = async () => {
  await storageWrapper.removeItem(PUSH_PRE_PROMPT_SHOWN);
};
