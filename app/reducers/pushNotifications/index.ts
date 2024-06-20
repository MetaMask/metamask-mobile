import { Notification } from '../../util/notifications';
import notificationsAction from '../../actions/notification/helpers/constants';
import { Action } from 'redux';

interface SessionProfile {
  identifierId: string;
  profileId: string;
}

interface SessionData {
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
  accounts: string[];
  notifications: Notification[];
  fcmToken?: string;
  sessionData?: SessionData;
}

const initialState: IPushNotificationsState = {
  isSignedIn: false,
  sessionData: undefined,
  isProfileSyncingEnabled: false,
  isMetamaskNotificationsFeatureSeen: false,
  isPushNotificationEnabled: false,
  isFeatureAnnouncementsEnabled: false,
  setParticipateInMetaMetrics: false,
  isNotificationServicesEnabled: false,
  accounts: [],
  notifications: [],
  fcmToken: undefined,
};

export interface iNotificationsAction extends Action {
  type: (typeof notificationsAction)[keyof typeof notificationsAction];
  profile?: string;
  accessToken?: string;
  accounts?: string[];
  fcmToken?: string;
  notifications?: Notification[];
  error?: Error | unknown;
}

const pushNotificationsReducer = (action: any, state = initialState) => {
  switch (action.type) {
    case notificationsAction.PERFORM_SIGN_IN_SUCCESS:
      return {
        ...state,
        isSignedIn: true,
        sessionData: {
          profile: action.profile, //TODO: fetch profile from signIn response
          accessToken: action.accessToken,
        },
      };
    case notificationsAction.PERFORM_SIGN_OUT_SUCCESS:
      return {
        ...state,
        isSignedIn: false,
        sessionData: undefined,
      };
    case notificationsAction.ENABLE_PROFILE_SYNCING_SUCCESS:
      return {
        ...state,
        isProfileSyncingEnabled: true,
      };
    case notificationsAction.DISABLE_PROFILE_SYNCING_SUCCESS:
      return {
        ...state,
        isProfileSyncingEnabled: false,
      };
    case notificationsAction.ENABLE_PUSH_NOTIFICATIONS_SUCCESS:
      return {
        ...state,
        isPushNotificationEnabled: true,
      };
    case notificationsAction.DISABLE_PUSH_NOTIFICATIONS_SUCCESS:
      return {
        ...state,
        isPushNotificationEnabled: false,
      };
    case notificationsAction.CHECK_ACCOUNTS_PRESENCE_SUCCESS:
      return {
        ...state,
        accounts: action.accounts,
      };
    case notificationsAction.DELETE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS:
      return {
        ...state,
      };
    case notificationsAction.UPDATE_ON_CHAIN_TRIGGERS_BY_ACCOUNT_SUCCESS:
      return {
        ...state,
      };
    case notificationsAction.UPDATE_TRIGGER_PUSH_NOTIFICATIONS_SUCCESS:
      return {
        ...state,
        fcmToken: action.fcmToken,
      };
    case notificationsAction.SET_FEATURE_ANNOUNCEMENTS_ENABLED_SUCCESS:
      return {
        ...state,
        isFeatureAnnouncementsEnabled: true,
      };
    case notificationsAction.SET_METAMASK_NOTIFICATIONS_FEATURE_SEEN_SUCCESS:
      return {
        ...state,
        isMetamaskNotificationsFeatureSeen: true,
      };
    case notificationsAction.FETCH_AND_UPDATE_METAMASK_NOTIFICATIONS_SUCCESS:
      return {
        ...state,
        notifications: action.notifications,
      };
    case notificationsAction.MARK_METAMASK_NOTIFICATIONS_AS_READ_SUCCESS:
      return {
        ...state,
        notifications: action.notifications,
      };
    case notificationsAction.DELETE_NOTIFICATION_STATUS_SUCCESS:
      return {
        ...state,
        notifications: action.notifications,
      };
    case notificationsAction.SET_PARTICIPATE_IN_META_METRICS_SUCCESS:
      return {
        ...state,
        setParticipateInMetaMetrics: true,
      };
    case notificationsAction.ENABLE_NOTIFICATIONS_SERVICES_SUCCESS:
      return {
        ...state,
        isNotificationServicesEnabled: true,
        isFeatureAnnouncementsEnabled: true,
        isMetamaskNotificationsFeatureSeen: true,
      };
    case notificationsAction.DISABLE_NOTIFICATIONS_SERVICES_SUCCESS:
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
