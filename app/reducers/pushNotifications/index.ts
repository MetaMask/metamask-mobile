/* eslint-disable @typescript-eslint/default-param-last */
import { Notification, UserStorage } from '../../util/notifications';
import { notificationsAction } from '../../actions/notification/helpers/constants';
import { Action } from 'redux';

export interface SessionProfile {
  identifierId: string;
  profileId: string;
}
export interface SessionData {
  profile: SessionProfile;
  accessToken: string;
}
export interface IPushNotificationsState {
  isSignedIn: boolean;
  isProfileSyncingEnabled: boolean;
  isMetamaskNotificationsFeatureSeen: boolean;
  isPushNotificationEnabled: boolean;
  isFeatureAnnouncementsEnabled: boolean;
  setParticipateInMetaMetrics: boolean;
  isNotificationServicesEnabled: boolean;
  isSnapNotificationsEnabled: boolean;
  accounts: string[];
  notifications: Notification[];
  fcmToken?: string;
  sessionData?: SessionData;
  presence?: Record<string, boolean>;
  userStorage?: UserStorage;
}
export const initialState: IPushNotificationsState = {
  isSignedIn: false,
  sessionData: undefined,
  isProfileSyncingEnabled: false,
  isMetamaskNotificationsFeatureSeen: false,
  isPushNotificationEnabled: false,
  isFeatureAnnouncementsEnabled: false,
  setParticipateInMetaMetrics: false,
  isNotificationServicesEnabled: false,
  isSnapNotificationsEnabled: false,
  accounts: [],
  notifications: [],
  fcmToken: undefined,
  presence: {},
  userStorage: undefined,
};
export interface iNotificationsAction extends Action {
  type: (typeof notificationsAction)[keyof typeof notificationsAction];
  payload?: {
    profile?: string;
    accessToken?: string;
    accounts?: string[];
    presence?: Record<string, boolean>;
    userStorage?: UserStorage;
    fcmToken?: string;
    notifications?: Notification[];
    error?: Error | unknown;
  };
}
const pushNotificationsReducer = (
  state = initialState,
  action: iNotificationsAction,
) => {
  switch (action.type) {
    case notificationsAction.PERFORM_SIGN_IN:
      return {
        ...state,
        isSignedIn: true,
        sessionData: {
          profile: action.payload?.profile,
          accessToken: action.payload?.accessToken,
        },
      };
    case notificationsAction.PERFORM_SIGN_OUT:
      return {
        ...state,
        isSignedIn: false,
        sessionData: undefined,
      };
    case notificationsAction.ENABLE_PROFILE_SYNCING:
      return {
        ...state,
        isProfileSyncingEnabled: true,
      };
    case notificationsAction.DISABLE_PROFILE_SYNCING:
      return {
        ...state,
        isProfileSyncingEnabled: false,
      };
    case notificationsAction.ENABLE_PUSH_NOTIFICATIONS:
      return {
        ...state,
        isPushNotificationEnabled: true,
      };
    case notificationsAction.DISABLE_PUSH_NOTIFICATIONS:
      return {
        ...state,
        isPushNotificationEnabled: false,
      };
    case notificationsAction.CHECK_ACCOUNTS_PRESENCE:
      return {
        ...state,
        presence: action.payload?.presence,
      };
    case notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT:
      return {
        ...state,
        userStorage: action.payload?.userStorage,
      };
    case notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT:
      return {
        ...state,
        userStorage: action.payload?.userStorage,
      };
    case notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS:
      return {
        ...state,
        fcmToken: action.payload?.fcmToken,
      };
    case notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED:
      return {
        ...state,
        isFeatureAnnouncementsEnabled: true,
      };
    case notificationsAction.SET_SNAP_NOTIFICATIONS_ENABLED:
      return {
        ...state,
        isSnapNotificationsEnabled: true,
      };
    case notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN:
      return {
        ...state,
        isMetamaskNotificationsFeatureSeen: true,
      };
    case notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload?.notifications,
      };
    case notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ:
      return {
        ...state,
      };
    case notificationsAction.DELETE_NOTIFICATION_STATUS:
      return {
        ...state,
        notifications: action.payload?.notifications,
      };
    case notificationsAction.ENABLE_NOTIFICATIONS_SERVICES:
      return {
        ...state,
        isNotificationServicesEnabled: true,
        isFeatureAnnouncementsEnabled: true,
        isMetamaskNotificationsFeatureSeen: true,
      };
    case notificationsAction.DISABLE_NOTIFICATIONS_SERVICES:
      return {
        ...state,
        isNotificationServicesEnabled: false,
        isFeatureAnnouncementsEnabled: false,
        isMetamaskNotificationsFeatureSeen: false,
      };
    default:
      return state;
  }
};
export default pushNotificationsReducer;
