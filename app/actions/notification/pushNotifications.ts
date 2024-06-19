import notificationsAction from './helpers/constants';
import { NotificationsActionTypes } from './helpers/types';
import { Notification } from '../../util/notifications';

export function performSignInRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.PERFORM_SIGN_IN_REQUEST,
  };
}

export function performSignInSuccess(
  accessToken: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.PERFORM_SIGN_IN_SUCCESS,
    payload: { accessToken },
  };
}

export function performSignInFailure(error: string): NotificationsActionTypes {
  return {
    type: notificationsAction.PERFORM_SIGN_IN_FAILURE,
    payload: { error },
  };
}

export function performSignOutRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.PERFORM_SIGN_OUT_REQUEST,
  };
}

export function performSignOutSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.PERFORM_SIGN_OUT_SUCCESS,
  };
}

export function performSignOutFailure(error: string): NotificationsActionTypes {
  return {
    type: notificationsAction.PERFORM_SIGN_OUT_FAILURE,
    payload: { error },
  };
}

export function enableProfileSyncingRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_PROFILE_SYNCING_REQUEST,
  };
}

export function enableProfileSyncingSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_PROFILE_SYNCING_SUCCESS,
  };
}

export function enableProfileSyncingFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_PROFILE_SYNCING_FAILURE,
    payload: { error },
  };
}

export function disableProfileSyncingRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_PROFILE_SYNCING_REQUEST,
  };
}

export function disableProfileSyncingSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_PROFILE_SYNCING_SUCCESS,
  };
}

export function disableProfileSyncingFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_PROFILE_SYNCING_FAILURE,
    payload: { error },
  };
}

export function enablePushNotificationsRequest(
  UUIDs: string[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_PUSH_NOTIFICATIONS_REQUEST,
    payload: { UUIDs },
  };
}

export function enablePushNotificationsSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_PUSH_NOTIFICATIONS_SUCCESS,
  };
}

export function enablePushNotificationsFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_PUSH_NOTIFICATIONS_FAILURE,
    payload: { error },
  };
}

export function disablePushNotificationsRequest(
  UUIDs: string[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_PUSH_NOTIFICATIONS_REQUEST,
    payload: { UUIDs },
  };
}

export function disablePushNotificationsSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_PUSH_NOTIFICATIONS_SUCCESS,
  };
}

export function disablePushNotificationsFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_PUSH_NOTIFICATIONS_FAILURE,
    payload: { error },
  };
}

export function updateTriggerPushNotificationsRequest(
  UUIDs: string[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_REQUEST,
    payload: { UUIDs },
  };
}

export function updateTriggerPushNotificationsSuccess(
  fcmToken: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_SUCCESS,
    payload: { fcmToken },
  };
}

export function updateTriggerPushNotificationsFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_FAILURE,
    payload: { error },
  };
}

export function setFeatureAnnouncementsEnabledRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST,
  };
}

export function setFeatureAnnouncementsEnabledSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS,
  };
}

export function setFeatureAnnouncementsEnabledFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE,
    payload: { error },
  };
}

export function setSnapNotificationsEnabledRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST,
  };
}

export function setSnapNotificationsEnabledSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS,
  };
}

export function setSnapNotificationsEnabledFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE,
    payload: { error },
  };
}

export function setParticipateInMetaMetricsRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_PARTICIPATE_IN_META_METRICS_REQUEST,
  };
}

export function setParticipateInMetaMetricsSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_PARTICIPATE_IN_META_METRICS_SUCCESS,
  };
}

export function setParticipateInMetaMetricsFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_PARTICIPATE_IN_META_METRICS_FAILURE,
    payload: { error },
  };
}

export function setMetamaskNotificationsFeatureSeenRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST,
  };
}

export function setMetamaskNotificationsFeatureSeenSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS,
  };
}

export function setMetamaskNotificationsFeatureSeenFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE,
    payload: { error },
  };
}

export function fetchAndUpdateMetamaskNotificationsRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST,
  };
}

export function fetchAndUpdateMetamaskNotificationsSuccess(
  notifications: Notification[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS,
    payload: { notifications },
  };
}

export function fetchAndUpdateMetamaskNotificationsFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE,
    payload: { error },
  };
}

export function markMetamaskNotificationsAsReadRequest(
  notifications: Notification[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST,
    payload: { notifications },
  };
}

export function markMetamaskNotificationsAsReadSuccess(
  notifications: Notification[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS,
    payload: { notifications },
  };
}

export function markMetamaskNotificationsAsReadFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE,
    payload: { error },
  };
}

export function checkAccountsPresenceRequest(
  accounts: string[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.CHECK_ACCOUNTS_PRESENCE_REQUEST,
    payload: { accounts },
  };
}

export function checkAccountsPresenceSuccess(
  presence: Record<string, boolean>,
): NotificationsActionTypes {
  return {
    type: notificationsAction.CHECK_ACCOUNTS_PRESENCE_SUCCESS,
    payload: { presence },
  };
}

export function checkAccountsPresenceFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.CHECK_ACCOUNTS_PRESENCE_FAILURE,
    payload: { error },
  };
}

export function updateOnChainTriggersByAccountRequest(
  accounts: string[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    payload: { accounts },
  };
}

export function updateOnChainTriggersByAccountSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS,
  };
}

export function updateOnChainTriggersByAccountFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE,
    payload: { error },
  };
}

export function deleteOnChainTriggersByAccountRequest(
  accounts: string[],
): NotificationsActionTypes {
  return {
    type: notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST,
    payload: { accounts },
  };
}

export function deleteOnChainTriggersByAccountSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS,
  };
}

export function deleteOnChainTriggersByAccountFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE,
    payload: { error },
  };
}

export function enableNotificationsServicesRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_REQUEST,
  };
}

export function enableNotificationsServicesSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_SUCCESS,
  };
}

export function enableNotificationsServicesFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_FAILURE,
    payload: { error },
  };
}

export function disableNotificationsServicesRequest(): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_REQUEST,
  };
}

export function disableNotificationsServicesSuccess(): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_SUCCESS,
  };
}

export function disableNotificationsServicesFailure(
  error: string,
): NotificationsActionTypes {
  return {
    type: notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_FAILURE,
    payload: { error },
  };
}
