import { Notification } from '../../../util/notifications';
import notificationsAction from './constants';

interface PerformSignInRequest {
  type: typeof notificationsAction.PERFORM_SIGN_IN_REQUEST;
}

interface PerformSignInSuccess {
  type: typeof notificationsAction.PERFORM_SIGN_IN_SUCCESS;
  payload: { accessToken: string };
}

interface PerformSignInFailure {
  type: typeof notificationsAction.PERFORM_SIGN_IN_FAILURE;
  payload: { error: string };
}

interface PerformSignOutRequest {
  type: typeof notificationsAction.PERFORM_SIGN_OUT_REQUEST;
}

interface PerformSignOutSuccess {
  type: typeof notificationsAction.PERFORM_SIGN_OUT_SUCCESS;
}

interface PerformSignOutFailure {
  type: typeof notificationsAction.PERFORM_SIGN_OUT_FAILURE;
  payload: { error: string };
}

interface EnableProfileSyncingRequest {
  type: typeof notificationsAction.ENABLE_PROFILE_SYNCING_REQUEST;
}

interface EnableProfileSyncingSuccess {
  type: typeof notificationsAction.ENABLE_PROFILE_SYNCING_SUCCESS;
}

interface EnableProfileSyncingFailure {
  type: typeof notificationsAction.ENABLE_PROFILE_SYNCING_FAILURE;
  payload: { error: string };
}

interface DisableProfileSyncingRequest {
  type: typeof notificationsAction.DISABLE_PROFILE_SYNCING_REQUEST;
}

interface DisableProfileSyncingSuccess {
  type: typeof notificationsAction.DISABLE_PROFILE_SYNCING_SUCCESS;
}

interface DisableProfileSyncingFailure {
  type: typeof notificationsAction.DISABLE_PROFILE_SYNCING_FAILURE;
  payload: { error: string };
}

interface EnableNotificationsServicesRequest {
  type: typeof notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_REQUEST;
}

interface EnableNotificationsServicesSuccess {
  type: typeof notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_SUCCESS;
}

interface EnableNotificationsServicesFailure {
  type: typeof notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_FAILURE;
  payload: { error: string };
}

interface DisableNotificationsServicesRequest {
  type: typeof notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_REQUEST;
}

interface DisableNotificationsServicesSuccess {
  type: typeof notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_SUCCESS;
}

interface DisableNotificationsServicesFailure {
  type: typeof notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_FAILURE;
  payload: { error: string };
}

interface SetFeatureAnnouncementsEnabledRequest {
  type: typeof notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_REQUEST;
}

interface SetFeatureAnnouncementsEnabledSuccess {
  type: typeof notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS;
}

interface SetFeatureAnnouncementsEnabledFailure {
  type: typeof notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_FAILURE;
  payload: { error: string };
}

interface SetSnapNotificationsEnabledRequest {
  type: typeof notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_REQUEST;
}

interface SetSnapNotificationsEnabledSuccess {
  type: typeof notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_SUCCESS;
}

interface SetSnapNotificationsEnabledFailure {
  type: typeof notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED_FAILURE;
  payload: { error: string };
}

interface SetParticipateInMetaMetricsRequest {
  type: typeof notificationsAction.SET_PARTICIPATE_IN_META_METRICS_REQUEST;
}

interface SetParticipateInMetaMetricsSuccess {
  type: typeof notificationsAction.SET_PARTICIPATE_IN_META_METRICS_SUCCESS;
}

interface SetParticipateInMetaMetricsFailure {
  type: typeof notificationsAction.SET_PARTICIPATE_IN_META_METRICS_FAILURE;
  payload: { error: string };
}

interface SetMetamaskNotificationsFeatureSeenRequest {
  type: typeof notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_REQUEST;
}

interface SetMetamaskNotificationsFeatureSeenSuccess {
  type: typeof notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS;
}

interface SetMetamaskNotificationsFeatureSeenFailure {
  type: typeof notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_FAILURE;
  payload: { error: string };
}

interface FetchAndUpdateMetamaskNotificationsRequest {
  type: typeof notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_REQUEST;
}

interface FetchAndUpdateMetamaskNotificationsSuccess {
  type: typeof notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS;
  payload: { notifications: Notification[] };
}

interface FetchAndUpdateMetamaskNotificationsFailure {
  type: typeof notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_FAILURE;
  payload: { error: string };
}

interface MarkMetamaskNotificationsAsReadRequest {
  type: typeof notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_REQUEST;
  payload: { notifications: Notification[] };
}

interface MarkMetamaskNotificationsAsReadSuccess {
  type: typeof notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS;
}

interface MarkMetamaskNotificationsAsReadFailure {
  type: typeof notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_FAILURE;
  payload: { error: string };
}

interface CheckAccountsPresenceRequest {
  type: typeof notificationsAction.CHECK_ACCOUNTS_PRESENCE_REQUEST;
  payload: { accounts: string[] };
}

interface CheckAccountsPresenceSuccess {
  type: typeof notificationsAction.CHECK_ACCOUNTS_PRESENCE_SUCCESS;
  payload: { presence: Record<string, boolean> };
}

interface CheckAccountsPresenceFailure {
  type: typeof notificationsAction.CHECK_ACCOUNTS_PRESENCE_FAILURE;
  payload: { error: string };
}

interface UpdateOnChainTriggersByAccountRequest {
  type: typeof notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST;
  payload: { accounts: string[] };
}

interface UpdateOnChainTriggersByAccountSuccess {
  type: typeof notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS;
}

interface UpdateOnChainTriggersByAccountFailure {
  type: typeof notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE;
  payload: { error: string };
}

interface DeleteOnChainTriggersByAccountRequest {
  type: typeof notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_REQUEST;
  payload: { accounts: string[] };
}

interface DeleteOnChainTriggersByAccountSuccess {
  type: typeof notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS;
}

interface DeleteOnChainTriggersByAccountFailure {
  type: typeof notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_FAILURE;
  payload: { error: string };
}

interface EnablePushNotificationsRequest {
  type: typeof notificationsAction.ENABLE_PUSH_NOTIFICATIONS_REQUEST;
  payload: { UUIDs: string[] };
}

interface EnablePushNotificationsSuccess {
  type: typeof notificationsAction.ENABLE_PUSH_NOTIFICATIONS_SUCCESS;
}

interface EnablePushNotificationsFailure {
  type: typeof notificationsAction.ENABLE_PUSH_NOTIFICATIONS_FAILURE;
  payload: { error: string };
}

interface DisablePushNotificationsRequest {
  type: typeof notificationsAction.DISABLE_PUSH_NOTIFICATIONS_REQUEST;
  payload: { UUIDs: string[] };
}

interface DisablePushNotificationsSuccess {
  type: typeof notificationsAction.DISABLE_PUSH_NOTIFICATIONS_SUCCESS;
}

interface DisablePushNotificationsFailure {
  type: typeof notificationsAction.DISABLE_PUSH_NOTIFICATIONS_FAILURE;
  payload: { error: string };
}

interface UpdateTriggerPushNotificationsRequest {
  type: typeof notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_REQUEST;
  payload: { UUIDs: string[] };
}

interface UpdateTriggerPushNotificationsSuccess {
  type: typeof notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_SUCCESS;
  payload: { fcmToken: string };
}

interface UpdateTriggerPushNotificationsFailure {
  type: typeof notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_FAILURE;
  payload: { error: string };
}

export type NotificationsActionTypes =
  | PerformSignInRequest
  | PerformSignInSuccess
  | PerformSignInFailure
  | PerformSignOutRequest
  | PerformSignOutSuccess
  | PerformSignOutFailure
  | EnableProfileSyncingRequest
  | EnableProfileSyncingSuccess
  | EnableProfileSyncingFailure
  | DisableProfileSyncingRequest
  | DisableProfileSyncingSuccess
  | DisableProfileSyncingFailure
  | EnablePushNotificationsRequest
  | EnablePushNotificationsSuccess
  | EnablePushNotificationsFailure
  | DisablePushNotificationsRequest
  | DisablePushNotificationsSuccess
  | DisablePushNotificationsFailure
  | SetFeatureAnnouncementsEnabledRequest
  | SetFeatureAnnouncementsEnabledSuccess
  | SetFeatureAnnouncementsEnabledFailure
  | SetSnapNotificationsEnabledRequest
  | SetSnapNotificationsEnabledSuccess
  | SetSnapNotificationsEnabledFailure
  | SetParticipateInMetaMetricsRequest
  | SetParticipateInMetaMetricsSuccess
  | SetParticipateInMetaMetricsFailure
  | SetMetamaskNotificationsFeatureSeenRequest
  | SetMetamaskNotificationsFeatureSeenSuccess
  | SetMetamaskNotificationsFeatureSeenFailure
  | FetchAndUpdateMetamaskNotificationsRequest
  | FetchAndUpdateMetamaskNotificationsSuccess
  | FetchAndUpdateMetamaskNotificationsFailure
  | MarkMetamaskNotificationsAsReadRequest
  | MarkMetamaskNotificationsAsReadSuccess
  | MarkMetamaskNotificationsAsReadFailure
  | CheckAccountsPresenceRequest
  | CheckAccountsPresenceSuccess
  | CheckAccountsPresenceFailure
  | UpdateOnChainTriggersByAccountRequest
  | UpdateOnChainTriggersByAccountSuccess
  | UpdateOnChainTriggersByAccountFailure
  | DeleteOnChainTriggersByAccountRequest
  | DeleteOnChainTriggersByAccountSuccess
  | DeleteOnChainTriggersByAccountFailure
  | UpdateTriggerPushNotificationsRequest
  | UpdateTriggerPushNotificationsSuccess
  | UpdateTriggerPushNotificationsFailure
  | EnableNotificationsServicesRequest
  | EnableNotificationsServicesSuccess
  | EnableNotificationsServicesFailure
  | DisableNotificationsServicesRequest
  | DisableNotificationsServicesSuccess
  | DisableNotificationsServicesFailure;
