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

/** THE ACTIONS BELLOW ARE FOR THE NEW METAMASK NOTIFICATIONS FEATURE */

export function performSignIn() {
  return {
    type: ACTIONS.PERFORM_SIGN_IN,
  };
}

export function performSignOut() {
  return {
    type: ACTIONS.PERFORM_SIGN_OUT,
  };
}

export function enableProfileSyncing() {
  return {
    type: ACTIONS.ENABLE_PROFILE_SYNCING,
  };
}

export function disableProfileSyncing() {
  return {
    type: ACTIONS.DISABLE_PROFILE_SYNCING,
  };
}

export function setParticipateInMetaMetrics(isParticipateInMetaMetrics) {
  return {
    type: ACTIONS.SET_PARTICIPATE_IN_METAMETRICS,
    isParticipateInMetaMetrics,
  };
}

export function showLoadingIndication(message) {
  return {
    type: ACTIONS.SHOW_LOADING,
    payload: message,
  };
}

export function hideLoadingIndication() {
  return {
    type: ACTIONS.HIDE_LOADING,
  };
}

export function createOnChainTriggers() {
  return {
    type: ACTIONS.CREATE_ON_CHAIN_TRIGGERS,
  };
}

export function fetchAndUpdateMetamaskNotifications() {
  return {
    type: ACTIONS.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS,
  };
}

export function markMetamaskNotificationsAsRead(notifications) {
  return {
    type: ACTIONS.MARK_METAMASK_NOTIFICATIONS_AS_READ,
    notifications,
  };
}

export function setMetamaskNotificationsFeatureSeen() {
  return {
    type: ACTIONS.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN,
  };
}

export function enableMetamaskNotifications() {
  return {
    type: ACTIONS.ENABLE_METAMASK_NOTIFICATIONS,
  };
}
export function disableMetamaskNotifications() {
  return {
    type: ACTIONS.DISABLE_METAMASK_NOTIFICATIONS,
  };
}

export function setIsProfileSyncingEnabled(profileSyncEnabled) {
  return {
    type: ACTIONS.SET_PROFILE_SYNCING_ENABLED,
    profileSyncEnabled,
  };
}

export function setSnapNotificationsEnabled(snapNotificationsEnabled) {
  return {
    type: ACTIONS.SET_SNAP_NOTIFICATIONS_ENABLED,
    snapNotificationsEnabled,
  };
}

export function setFeatureAnnouncementsEnabled(featureAnnouncementsEnabled) {
  return {
    type: ACTIONS.SET_FEATURE_ANNOUNCEMENTS_ENABLED,
    featureAnnouncementsEnabled,
  };
}

export function checkAccountsPresence(accounts) {
  return {
    type: ACTIONS.CHECK_ACCOUNTS_PRESENCE,
    accounts,
  };
}

export function deleteOnChainTriggersByAccount(addresses) {
  return {
    type: ACTIONS.DELETE_NOTIFICATION_STATUS,
    addresses,
  };
}

export function updateOnChainTriggersByAccount(addresses) {
  return {
    type: ACTIONS.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT,
    addresses,
  };
}
