import { SessionProfile } from '../../../reducers/pushNotifications';
import { Notification, UserStorage } from '../../../util/notifications';
import { notificationsAction } from './constants';

interface PerformSignIn {
  type: typeof notificationsAction.PERFORM_SIGN_IN;
  payload: { accessToken: string; profile: SessionProfile };
}

interface PerformSignOut {
  type: typeof notificationsAction.PERFORM_SIGN_OUT;
}

interface EnableProfileSyncing {
  type: typeof notificationsAction.ENABLE_PROFILE_SYNCING;
}

interface DisableProfileSyncing {
  type: typeof notificationsAction.DISABLE_PROFILE_SYNCING;
}

interface EnableNotificationServices {
  type: typeof notificationsAction.ENABLE_NOTIFICATIONS_SERVICES;
}

interface DisableNotificationServices {
  type: typeof notificationsAction.DISABLE_NOTIFICATIONS_SERVICES;
}

interface SetFeatureAnnouncementsEnabled {
  type: typeof notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED;
}

interface SetSnapNotificationsEnabled {
  type: typeof notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED;
}

interface SetParticipateInMetaMetrics {
  type: typeof notificationsAction.SET_PARTICIPATE_IN_META_METRICS;
}

interface SetMetamaskNotificationsFeatureSeen {
  type: typeof notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN;
}

interface FetchAndUpdateMetamaskNotifications {
  type: typeof notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS;
  payload: { metamaskNotifications: Notification[] };
}

interface MarkMetamaskNotificationsAsRead {
  type: typeof notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ;
}

interface CheckAccountsPresence {
  type: typeof notificationsAction.CHECK_ACCOUNTS_PRESENCE;
  payload: { presence: Record<string, boolean> };
}

interface UpdateOnChainTriggersByAccount {
  type: typeof notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT;
  payload: { userStorage: UserStorage };
}

interface DeleteOnChainTriggersByAccount {
  type: typeof notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT;
  payload: { userStorage: UserStorage };
}

interface EnablePushNotifications {
  type: typeof notificationsAction.ENABLE_PUSH_NOTIFICATIONS;
  payload: { UUIDs: string[] };
}

interface DisablePushNotifications {
  type: typeof notificationsAction.DISABLE_PUSH_NOTIFICATIONS;
  payload: { UUIDs: string[] };
}

interface UpdateTriggerPushNotifications {
  type: typeof notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS;
  payload: { UUIDs: string[] };
}

export type NotificationsActionTypes =
  | PerformSignIn
  | PerformSignOut
  | EnableProfileSyncing
  | DisableProfileSyncing
  | EnablePushNotifications
  | DisablePushNotifications
  | SetFeatureAnnouncementsEnabled
  | SetSnapNotificationsEnabled
  | SetParticipateInMetaMetrics
  | SetMetamaskNotificationsFeatureSeen
  | FetchAndUpdateMetamaskNotifications
  | MarkMetamaskNotificationsAsRead
  | CheckAccountsPresence
  | UpdateOnChainTriggersByAccount
  | DeleteOnChainTriggersByAccount
  | UpdateTriggerPushNotifications
  | EnableNotificationServices
  | DisableNotificationServices;
