/**
 * This file contains all the actions related to the in app (old/v1) notification system.
 */
import { ACTIONS } from '../../reducers/notification';

export function hideCurrentNotification() {
  return {
    type: ACTIONS.HIDE_CURRENT_NOTIFICATION,
  };
}

export function hideNotificationById(id) {
  return {
    type: ACTIONS.HIDE_NOTIFICATION_BY_ID,
    id,
  };
}

export function modifyOrShowTransactionNotificationById({
  autodismiss,
  transaction,
  status,
}) {
  return {
    type: ACTIONS.MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION,
    autodismiss,
    transaction,
    status,
  };
}

export function modifyOrShowSimpleNotificationById({
  autodismiss,
  title,
  description,
  status,
}) {
  return {
    type: ACTIONS.MODIFY_OR_SHOW_SIMPLE_NOTIFICATION,
    autodismiss,
    title,
    description,
    status,
  };
}

export function replaceNotificationById(notification) {
  return {
    type: ACTIONS.REPLACE_NOTIFICATION_BY_ID,
    notification,
    id: notification.id,
  };
}

export function removeNotificationById(id) {
  return {
    type: ACTIONS.REMOVE_NOTIFICATION_BY_ID,
    id,
  };
}

export function removeCurrentNotification() {
  return {
    type: ACTIONS.REMOVE_CURRENT_NOTIFICATION,
  };
}

export function showSimpleNotification({
  autodismiss,
  title,
  description,
  status,
  id,
}) {
  return {
    id,
    type: ACTIONS.SHOW_SIMPLE_NOTIFICATION,
    autodismiss,
    title,
    description,
    status,
  };
}

export function showTransactionNotification({
  autodismiss,
  transaction,
  status,
}) {
  return {
    type: ACTIONS.SHOW_TRANSACTION_NOTIFICATION,
    autodismiss,
    transaction,
    status,
  };
}

export function removeNotVisibleNotifications() {
  return {
    type: ACTIONS.REMOVE_NOT_VISIBLE_NOTIFICATIONS,
  };
}

export function updateNotificationStatus(notificationsSettings) {
  return {
    type: ACTIONS.UPDATE_NOTIFICATION_STATUS,
    notificationsSettings,
  };
}
