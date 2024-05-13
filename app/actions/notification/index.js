export function hideCurrentNotification() {
  return {
    type: 'HIDE_CURRENT_NOTIFICATION',
  };
}

export function hideNotificationById(id) {
  return {
    type: 'HIDE_NOTIFICATION_BY_ID',
    id,
  };
}

export function modifyOrShowTransactionNotificationById({
  autodismiss,
  transaction,
  status,
}) {
  return {
    type: 'MODIFY_OR_SHOW_TRANSACTION_NOTIFICATION',
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
    type: 'MODIFY_OR_SHOW_SIMPLE_NOTIFICATION',
    autodismiss,
    title,
    description,
    status,
  };
}

export function replaceNotificationById(notification) {
  return {
    type: 'REPLACE_NOTIFICATION_BY_ID',
    notification,
    id: notification.id,
  };
}

export function removeNotificationById(id) {
  return {
    type: 'REMOVE_NOTIFICATION_BY_ID',
    id,
  };
}

export function removeCurrentNotification() {
  return {
    type: 'REMOVE_CURRENT_NOTIFICATION',
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
    type: 'SHOW_SIMPLE_NOTIFICATION',
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
    type: 'SHOW_TRANSACTION_NOTIFICATION',
    autodismiss,
    transaction,
    status,
  };
}

export function removeNotVisibleNotifications() {
  return {
    type: 'REMOVE_NOT_VISIBLE_NOTIFICATIONS',
  };
}

export function updateNotificationStatus(notificationsSettings) {
  return {
    type: 'UPDATE_NOTIFICATION_STATUS',
    notificationsSettings,
  };
}

/** THE ACTIONS BELLOW ARE FOR THE NEW METAMASK NOTIFICATIONS FEATURE */

export function performSignIn() {
  return {
    type: 'PERFORM_SIGN_IN',
  };
}

export function performSignOut() {
  return {
    type: 'PERFORM_SIGN_OUT',
  };
}

export function enableProfileSyncing() {
  return {
    type: 'ENABLE_PROFILE_SYNCING',
  };
}

export function disableProfileSyncing() {
  return {
    type: 'DISABLE_PROFILE_SYNCING',
  };
}

export function setParticipateInMetaMetrics(isParticipating) {
  return {
    type: 'SET_PARTICIPATE_IN_METAMETRICS',
    isParticipating,
  };
}

export function showLoadingIndication() {
  return {
    type: 'SHOW_LOADING_INDICATION',
  };
}

export function hideLoadingIndication() {
  return {
    type: 'HIDE_LOADING_INDICATION',
  };
}

export function createOnChainTriggers() {
  return {
    type: 'CREATE_ON_CHAIN_TRIGGERS',
  };
}

export function fetchAndUpdateMetamaskNotifications() {
  return {
    type: 'FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS',
  };
}

export function markMetamaskNotificationsAsRead(notifications) {
  return {
    type: 'MARK_METAMASK_NOTIFICATIONS_AS_READ',
    notifications,
  };
}

export function setMetamaskNotificationsFeatureSeen() {
  return {
    type: 'SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN',
  };
}

export function enableMetamaskNotifications() {
  return {
    type: 'ENABLE_METAMASK_NOTIFICATIONS',
  };
}
export function disableMetamaskNotifications() {
  return {
    type: 'DISABLE_METAMASK_NOTIFICATIONS',
  };
}

export function setIsProfileSyncingEnabled(profileSyncStatus) {
  return {
    type: 'SET_IS_PROFILE_SYNCING_ENABLED',
    profileSyncStatus,
  };
}

export function setSnapNotificationsEnabled(snapNotificationsStatus) {
  return {
    type: 'SET_SNAP_NOTIFICATIONS_ENABLED',
    snapNotificationsStatus,
  };
}

export function setFeatureAnnouncementsEnabled(featureAnnouncementsStatus) {
  return {
    type: 'SET_FEATURE_ANNOUNCEMENTS_ENABLED',
    featureAnnouncementsStatus,
  };
}

export function checkAccountsPresence(accounts) {
  return {
    type: 'CHECK_ACCOUNTS_PRESENCE',
    accounts,
  };
}

export function deleteOnChainTriggersByAccount(addresses) {
  return {
    type: 'DELETE_NOTIFICATION_STATUS',
    addresses,
  };
}

export function updateOnChainTriggersByAccount(addresses) {
  return {
    type: 'UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT',
    addresses,
  };
}
