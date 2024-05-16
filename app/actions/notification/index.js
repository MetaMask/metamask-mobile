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

export function performSignInRequest() {
  return {
    type: ACTIONS.PERFORM_SIGN_IN_REQUEST,
  };
}

export function performSignInSuccess(data) {
  return {
    type: ACTIONS.PERFORM_SIGN_IN_SUCCESS,
    data,
  };
}

export function performSignInFailure(error) {
  return {
    type: ACTIONS.PERFORM_SIGN_IN_FAILURE,
    error,
  };
}

export function performSignOutRequest() {
  return {
    type: ACTIONS.PERFORM_SIGN_OUT_REQUEST,
  };
}

export function enableProfileSyncingRequest() {
  return {
    type: ACTIONS.ENABLE_PROFILE_SYNCING_REQUEST,
  };
}

export function disableProfileSyncingRequest() {
  return {
    type: ACTIONS.DISABLE_PROFILE_SYNCING_REQUEST,
  };
}

export function setParticipateInMetaMetricsRequest(isParticipateInMetaMetrics) {
  return {
    type: ACTIONS.SET_PARTICIPATE_IN_METAMETRICS_REQUEST,
    isParticipateInMetaMetrics,
  };
}

export function showLoadingIndicationRequest(message) {
  return {
    type: ACTIONS.SHOW_LOADING,
    message,
  };
}

export function hideLoadingIndicationRequest() {
  return {
    type: ACTIONS.HIDE_LOADING,
  };
}

export function createOnChainTriggersRequest() {
  return {
    type: ACTIONS.CREATE_ON_CHAIN_TRIGGERS_REQUEST,
  };
}

export function fetchAndUpdateMetamaskNotificationsRequest() {
  return {
    type: ACTIONS.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST,
  };
}

export function markMetamaskNotificationsAsReadRequest(notifications) {
  return {
    type: ACTIONS.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST,
    notifications,
  };
}

export function setMetamaskNotificationsFeatureSeenRequest() {
  return {
    type: ACTIONS.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST,
  };
}

export function enableMetamaskNotificationsRequest() {
  return {
    type: ACTIONS.ENABLE_METAMASK_NOTIFICATIONS_REQUEST,
  };
}
export function disableMetamaskNotificationsRequest() {
  return {
    type: ACTIONS.DISABLE_METAMASK_NOTIFICATIONS_REQUEST,
  };
}

export function setIsProfileSyncingEnabledRequest(profileSyncEnabled) {
  return {
    type: ACTIONS.SET_PROFILE_SYNCING_ENABLED_REQUEST,
    profileSyncEnabled,
  };
}

export function setSnapNotificationsEnabledRequest(snapNotificationsEnabled) {
  return {
    type: ACTIONS.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST,
    snapNotificationsEnabled,
  };
}

export function setFeatureAnnouncementsEnabledRequest(
  featureAnnouncementsEnabled,
) {
  return {
    type: ACTIONS.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST,
    featureAnnouncementsEnabled,
  };
}

export function checkAccountsPresenceRequest(accounts) {
  return {
    type: ACTIONS.CHECK_ACCOUNTS_PRESENCE_REQUEST,
    accounts,
  };
}

export function deleteOnChainTriggersByAccountRequest(addresses) {
  return {
    type: ACTIONS.DELETE_NOTIFICATION_STATUS_REQUEST,
    addresses,
  };
}

export function updateOnChainTriggersByAccountRequest(accounts) {
  return {
    type: ACTIONS.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    accounts,
  };
}
